/**
 * Content Moderation System
 * Phase 20: Profanity filter, spam detection, content analysis
 */

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface ModerationResult {
  passed: boolean;
  score: number; // 0-1, higher = more likely to be problematic
  flags: ModerationFlag[];
  suggestedAction: 'approve' | 'review' | 'reject' | 'shadow_ban';
  filteredContent?: string;
}

export interface ModerationFlag {
  type: FlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matches: string[];
  context?: string;
}

export type FlagType =
  | 'profanity'
  | 'hate_speech'
  | 'spam'
  | 'harassment'
  | 'violence'
  | 'adult_content'
  | 'self_harm'
  | 'misinformation'
  | 'personal_info'
  | 'external_links'
  | 'excessive_caps'
  | 'repetition';

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: 'post' | 'comment' | 'profile';
  content_id: string;
  reason: ReportReason;
  details: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  assigned_to: string | null;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'adult_content'
  | 'misinformation'
  | 'impersonation'
  | 'copyright'
  | 'other';

// ============================================================================
// PROFANITY FILTER
// ============================================================================

// Common profanity patterns (simplified for production - use external service for comprehensive filtering)
const PROFANITY_PATTERNS: RegExp[] = [
  // This would contain actual patterns in production
  // Using placeholders to avoid explicit content
  /\b(badword1|badword2|badword3)\b/gi,
];

// Leetspeak replacements
const LEETSPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

/**
 * Normalize text for profanity detection (handles leetspeak, etc.)
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Replace leetspeak
  for (const [leet, char] of Object.entries(LEETSPEAK_MAP)) {
    normalized = normalized.replace(
      new RegExp(leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      char
    );
  }

  // Remove repeated characters (e.g., "baaaddd" -> "bad")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

  // Remove spaces between characters (e.g., "b a d" -> "bad")
  normalized = normalized.replace(/\b(\w)\s+(?=\w\b)/g, '$1');

  return normalized;
}

/**
 * Check for profanity in text
 */
export function checkProfanity(text: string): ModerationFlag | null {
  const normalizedText = normalizeText(text);
  const matches: string[] = [];

  for (const pattern of PROFANITY_PATTERNS) {
    const found = normalizedText.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  if (matches.length === 0) return null;

  return {
    type: 'profanity',
    severity: matches.length > 3 ? 'high' : matches.length > 1 ? 'medium' : 'low',
    matches: [...new Set(matches)],
  };
}

/**
 * Filter profanity from text
 */
export function filterProfanity(text: string): string {
  let filtered = text;

  for (const pattern of PROFANITY_PATTERNS) {
    filtered = filtered.replace(pattern, (match) => '*'.repeat(match.length));
  }

  return filtered;
}

// ============================================================================
// SPAM DETECTION
// ============================================================================

interface SpamIndicators {
  hasExcessiveCaps: boolean;
  hasRepetition: boolean;
  hasExcessiveLinks: boolean;
  hasSpamPhrases: boolean;
  hasSuspiciousPatterns: boolean;
}

const SPAM_PHRASES = [
  /buy now/gi,
  /click here/gi,
  /limited time/gi,
  /act now/gi,
  /free money/gi,
  /make money fast/gi,
  /work from home/gi,
  /congratulations.+won/gi,
  /claim your prize/gi,
  /100% guaranteed/gi,
];

/**
 * Detect spam characteristics in content
 */
export function detectSpam(text: string): ModerationFlag | null {
  const indicators: SpamIndicators = {
    hasExcessiveCaps: false,
    hasRepetition: false,
    hasExcessiveLinks: false,
    hasSpamPhrases: false,
    hasSuspiciousPatterns: false,
  };

  const matches: string[] = [];

  // Check for excessive caps (more than 50% uppercase)
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 10) {
    const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / letters.length;
    if (uppercaseRatio > 0.5) {
      indicators.hasExcessiveCaps = true;
      matches.push('excessive_caps');
    }
  }

  // Check for repetition
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  const maxRepeat = Math.max(...wordCounts.values());
  if (maxRepeat > 5 && maxRepeat > words.length * 0.2) {
    indicators.hasRepetition = true;
    matches.push('word_repetition');
  }

  // Check for excessive links
  const linkCount = (text.match(/https?:\/\/\S+/gi) || []).length;
  if (linkCount > 3) {
    indicators.hasExcessiveLinks = true;
    matches.push('excessive_links');
  }

  // Check for spam phrases
  for (const phrase of SPAM_PHRASES) {
    if (phrase.test(text)) {
      indicators.hasSpamPhrases = true;
      matches.push('spam_phrase');
      break;
    }
  }

  // Count indicators
  const flagCount = Object.values(indicators).filter(Boolean).length;
  if (flagCount === 0) return null;

  return {
    type: 'spam',
    severity: flagCount >= 3 ? 'high' : flagCount >= 2 ? 'medium' : 'low',
    matches,
  };
}

// ============================================================================
// CONTENT ANALYSIS
// ============================================================================

/**
 * Analyze content for moderation
 */
export async function analyzeContent(
  content: string,
  options: {
    contentType?: 'post' | 'comment' | 'profile';
    authorId?: string;
    checkHistory?: boolean;
  } = {}
): Promise<ModerationResult> {
  const flags: ModerationFlag[] = [];
  let score = 0;

  // Check profanity
  const profanityFlag = checkProfanity(content);
  if (profanityFlag) {
    flags.push(profanityFlag);
    score +=
      profanityFlag.severity === 'high' ? 0.4 : profanityFlag.severity === 'medium' ? 0.25 : 0.1;
  }

  // Check spam
  const spamFlag = detectSpam(content);
  if (spamFlag) {
    flags.push(spamFlag);
    score += spamFlag.severity === 'high' ? 0.5 : spamFlag.severity === 'medium' ? 0.3 : 0.15;
  }

  // Check for excessive caps
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 20) {
    const capsRatio = (content.match(/[A-Z]/g) || []).length / letters.length;
    if (capsRatio > 0.7) {
      flags.push({
        type: 'excessive_caps',
        severity: 'low',
        matches: ['ALL_CAPS_DETECTED'],
      });
      score += 0.1;
    }
  }

  // Check for personal information patterns
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;

  const emailMatches = content.match(emailPattern) || [];
  const phoneMatches = content.match(phonePattern) || [];
  const ssnMatches = content.match(ssnPattern) || [];

  if (emailMatches.length > 0 || phoneMatches.length > 0 || ssnMatches.length > 0) {
    flags.push({
      type: 'personal_info',
      severity: ssnMatches.length > 0 ? 'high' : 'medium',
      matches: [...emailMatches, ...phoneMatches, ...ssnMatches],
    });
    score += ssnMatches.length > 0 ? 0.5 : 0.2;
  }

  // Check author history if requested
  if (options.checkHistory && options.authorId) {
    const historyScore = await checkAuthorHistory(options.authorId);
    score += historyScore;
  }

  // Normalize score
  score = Math.min(score, 1);

  // Determine action
  let suggestedAction: ModerationResult['suggestedAction'];
  if (score >= 0.7) {
    suggestedAction = 'reject';
  } else if (score >= 0.5) {
    suggestedAction = 'review';
  } else if (score >= 0.3) {
    suggestedAction = 'review';
  } else {
    suggestedAction = 'approve';
  }

  return {
    passed: score < 0.5,
    score,
    flags,
    suggestedAction,
    filteredContent: profanityFlag ? filterProfanity(content) : undefined,
  };
}

/**
 * Check author's moderation history
 */
async function checkAuthorHistory(authorId: string): Promise<number> {
  try {
    const supabase = await createClient();

    // Get recent reports against this user
    const { count: reportCount } = await supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('content_author_id', authorId)
      .eq('status', 'resolved')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Get recent rejected content
    const { count: rejectedCount } = await supabase
      .from('moderation_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authorId)
      .eq('action', 'reject')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const historyScore = (reportCount || 0) * 0.05 + (rejectedCount || 0) * 0.1;
    return Math.min(historyScore, 0.3);
  } catch {
    return 0;
  }
}

// ============================================================================
// REPORT MANAGEMENT
// ============================================================================

/**
 * Submit a content report
 */
export async function submitReport(options: {
  reporterId: string;
  contentType: ContentReport['content_type'];
  contentId: string;
  reason: ReportReason;
  details?: string;
}): Promise<ContentReport> {
  const { reporterId, contentType, contentId, reason, details } = options;
  const supabase = await createClient();

  // Check for duplicate report
  const { data: existing } = await supabase
    .from('content_reports')
    .select('id')
    .eq('reporter_id', reporterId)
    .eq('content_id', contentId)
    .eq('status', 'pending')
    .single();

  if (existing) {
    throw new Error('You have already reported this content');
  }

  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reporter_id: reporterId,
      content_type: contentType,
      content_id: contentId,
      reason,
      details: details || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    logger.error('[Moderation] Failed to submit report', error);
    throw error;
  }

  logger.info('[Moderation] Report submitted', {
    reportId: data.id,
    contentType,
    contentId,
    reason,
  });

  return data;
}

/**
 * Get pending reports for moderation queue
 */
export async function getPendingReports(options: {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'report_count';
}): Promise<ContentReport[]> {
  const { limit = 50, offset = 0, sortBy = 'created_at' } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .in('status', ['pending', 'reviewing'])
    .order(sortBy, { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('[Moderation] Failed to fetch pending reports', error);
    throw error;
  }

  return data || [];
}

/**
 * Resolve a content report
 */
export async function resolveReport(options: {
  reportId: string;
  resolution: string;
  resolvedBy: string;
  action?: 'remove_content' | 'warn_user' | 'ban_user' | 'dismiss';
}): Promise<ContentReport> {
  const { reportId, resolution, resolvedBy, action } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_reports')
    .update({
      status: 'resolved',
      resolution,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    logger.error('[Moderation] Failed to resolve report', error);
    throw error;
  }

  // Execute action if specified
  if (action && data) {
    await executeModAction(data, action, resolvedBy);
  }

  logger.info('[Moderation] Report resolved', { reportId, resolution, action });

  return data;
}

/**
 * Execute moderation action
 */
async function executeModAction(
  report: ContentReport,
  action: string,
  moderatorId: string
): Promise<void> {
  const supabase = await createClient();

  switch (action) {
    case 'remove_content':
      if (report.content_type === 'post') {
        await supabase.from('posts').update({ status: 'removed' }).eq('id', report.content_id);
      } else if (report.content_type === 'comment') {
        await supabase.from('comments').update({ status: 'removed' }).eq('id', report.content_id);
      }
      break;

    case 'warn_user':
      // Get content author and send warning
      // Implementation depends on notification system
      break;

    case 'ban_user':
      // Get content author and ban them
      // Implementation depends on user management system
      break;
  }

  // Log the action
  await supabase.from('moderation_log').insert({
    moderator_id: moderatorId,
    action,
    content_type: report.content_type,
    content_id: report.content_id,
    report_id: report.id,
  });
}

export default {
  analyzeContent,
  checkProfanity,
  filterProfanity,
  detectSpam,
  submitReport,
  getPendingReports,
  resolveReport,
};
