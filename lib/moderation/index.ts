/**
 * Content Moderation Service
 * Handles content review, flagging, and moderation workflows
 */

import { createServiceClient } from '@/lib/supabase/server';
import { checkProfanity } from './profanity';
import { checkSpam } from './spam';
export type { SpamCheckResult } from './spam';

export interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  reasons: string[];
  score: number;
  requiresReview: boolean;
}

export interface ContentReport {
  id: string;
  contentType: 'post' | 'comment' | 'profile';
  contentId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

// Moderation thresholds
const THRESHOLDS = {
  autoApprove: 0.2,
  requireReview: 0.5,
  autoReject: 0.8,
};

/**
 * Moderate text content
 */
export async function moderateContent(
  content: string,
  context?: {
    userId?: string;
    contentType?: 'post' | 'comment' | 'bio';
    existingContent?: string;
  }
): Promise<ModerationResult> {
  const reasons: string[] = [];
  let totalScore = 0;
  let checkCount = 0;

  // Check for profanity
  const profanityResult = checkProfanity(content);
  if (profanityResult.hasProfanity) {
    totalScore += profanityResult.severity;
    checkCount++;
    reasons.push(`Profanity detected: ${profanityResult.flaggedWords.join(', ')}`);
  } else {
    checkCount++;
  }

  // Check for spam
  const spamResult = checkSpam(content, context?.existingContent);
  if (spamResult.isSpam) {
    totalScore += spamResult.confidence;
    checkCount++;
    reasons.push(...spamResult.reasons);
  } else {
    checkCount++;
  }

  // Calculate average score
  const averageScore = checkCount > 0 ? totalScore / checkCount : 0;

  // Determine approval
  const approved = averageScore < THRESHOLDS.autoApprove;
  const flagged = averageScore >= THRESHOLDS.requireReview;
  const requiresReview = averageScore >= THRESHOLDS.requireReview && averageScore < THRESHOLDS.autoReject;

  return {
    approved,
    flagged,
    reasons,
    score: averageScore,
    requiresReview,
  };
}

/**
 * Submit a content report
 */
export async function submitReport(
  contentType: ContentReport['contentType'],
  contentId: string,
  reporterId: string,
  reason: string,
  details?: string
): Promise<ContentReport | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      content_type: contentType,
      content_id: contentId,
      reporter_id: reporterId,
      reason,
      details,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to submit report:', error);
    return null;
  }

  return transformReport(data);
}

/**
 * Get pending reports for review
 */
export async function getPendingReports(limit: number = 50): Promise<ContentReport[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(transformReport);
}

/**
 * Review a content report
 */
export async function reviewReport(
  reportId: string,
  reviewerId: string,
  action: 'resolve' | 'dismiss',
  notes?: string
): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('content_reports')
    .update({
      status: action === 'resolve' ? 'resolved' : 'dismissed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      review_notes: notes,
    })
    .eq('id', reportId);

  return !error;
}

/**
 * Get reports for a specific content item
 */
export async function getReportsForContent(
  contentType: ContentReport['contentType'],
  contentId: string
): Promise<ContentReport[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(transformReport);
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(): Promise<{
  pendingReports: number;
  resolvedToday: number;
  flaggedContent: number;
  topReasons: Array<{ reason: string; count: number }>;
}> {
  const supabase = await createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pending, resolved, flagged] = await Promise.all([
    supabase.from('content_reports').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabase.from('content_reports').select('id', { count: 'exact' })
      .eq('status', 'resolved')
      .gte('reviewed_at', today.toISOString()),
    supabase.from('posts').select('id', { count: 'exact' }).eq('status', 'flagged'),
  ]);

  // Get top report reasons
  const { data: reasons } = await supabase
    .from('content_reports')
    .select('reason')
    .eq('status', 'pending');

  const reasonCounts = new Map<string, number>();
  for (const r of reasons || []) {
    reasonCounts.set(r.reason, (reasonCounts.get(r.reason) || 0) + 1);
  }

  const topReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    pendingReports: pending.count || 0,
    resolvedToday: resolved.count || 0,
    flaggedContent: flagged.count || 0,
    topReasons,
  };
}

/**
 * Auto-moderate content and take action
 */
export async function autoModerate(
  contentType: 'post' | 'comment',
  contentId: string,
  content: string,
  userId: string
): Promise<ModerationResult> {
  const result = await moderateContent(content, { userId, contentType });
  const supabase = await createServiceClient();

  if (result.score >= THRESHOLDS.autoReject) {
    // Auto-reject
    if (contentType === 'post') {
      await supabase.from('posts').update({ status: 'rejected' }).eq('id', contentId);
    } else {
      await supabase.from('comments').update({ hidden: true }).eq('id', contentId);
    }

    // Create internal report
    await submitReport(contentType, contentId, 'system', 'auto-moderation', result.reasons.join('; '));
  } else if (result.requiresReview) {
    // Flag for review
    if (contentType === 'post') {
      await supabase.from('posts').update({ status: 'flagged' }).eq('id', contentId);
    }

    await submitReport(contentType, contentId, 'system', 'auto-flagged', result.reasons.join('; '));
  }

  return result;
}

function transformReport(row: Record<string, unknown>): ContentReport {
  return {
    id: row.id as string,
    contentType: row.content_type as ContentReport['contentType'],
    contentId: row.content_id as string,
    reporterId: row.reporter_id as string,
    reason: row.reason as string,
    details: row.details as string | undefined,
    status: row.status as ContentReport['status'],
    createdAt: new Date(row.created_at as string),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : undefined,
    reviewedBy: row.reviewed_by as string | undefined,
  };
}
