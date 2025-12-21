/**
 * GDPR Compliance Utilities
 * Phase 28: Data export, account deletion, consent management
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface DataExportRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  format: 'json' | 'csv';
  download_url: string | null;
  expires_at: string | null;
  requested_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'cancelled';
  reason: string | null;
  scheduled_for: string;
  completed_at: string | null;
  requested_at: string;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  granted: boolean;
  ip_address: string | null;
  user_agent: string | null;
  granted_at: string;
  revoked_at: string | null;
}

export type ConsentType =
  | 'essential'
  | 'analytics'
  | 'marketing'
  | 'personalization'
  | 'third_party';

export interface UserData {
  profile: Record<string, unknown>;
  posts: Record<string, unknown>[];
  comments: Record<string, unknown>[];
  reactions: Record<string, unknown>[];
  bookmarks: Record<string, unknown>[];
  follows: Record<string, unknown>[];
  readingHistory: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  exportedAt: string;
}

// ============================================================================
// DATA EXPORT
// ============================================================================

/**
 * Request a data export for a user
 */
export async function requestDataExport(
  userId: string,
  format: 'json' | 'csv' = 'json'
): Promise<DataExportRequest> {
  const supabase = await createClient();

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('data_export_requests')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
    .single();

  if (existing) {
    throw new Error('You already have a pending data export request');
  }

  // Create new request
  const { data, error } = await supabase
    .from('data_export_requests')
    .insert({
      user_id: userId,
      status: 'pending',
      format,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('[GDPR] Failed to create data export request', error);
    throw error;
  }

  logger.info('[GDPR] Data export requested', { userId, requestId: data.id });

  return data as DataExportRequest;
}

/**
 * Process a data export request
 */
export async function processDataExport(requestId: string): Promise<void> {
  const supabase = await createServiceClient();

  // Get the request
  const { data: request, error: fetchError } = await supabase
    .from('data_export_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error('Export request not found');
  }

  // Update status to processing
  await supabase
    .from('data_export_requests')
    .update({ status: 'processing' })
    .eq('id', requestId);

  try {
    // Collect user data
    const userData = await collectUserData(request.user_id);

    // Generate export file
    const exportData =
      request.format === 'json'
        ? JSON.stringify(userData, null, 2)
        : convertToCSV(userData);

    // Upload to storage
    const fileName = `exports/${request.user_id}/${requestId}.${request.format}`;
    const { error: uploadError } = await supabase.storage
      .from('private')
      .upload(fileName, exportData, {
        contentType: request.format === 'json' ? 'application/json' : 'text/csv',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Generate signed URL (valid for 7 days)
    const { data: signedUrl } = await supabase.storage
      .from('private')
      .createSignedUrl(fileName, 7 * 24 * 60 * 60);

    // Update request
    await supabase
      .from('data_export_requests')
      .update({
        status: 'completed',
        download_url: signedUrl?.signedUrl,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    logger.info('[GDPR] Data export completed', { requestId, userId: request.user_id });
  } catch (error) {
    // Mark as failed
    await supabase
      .from('data_export_requests')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', requestId);

    logger.error('[GDPR] Data export failed', { requestId, error });
    throw error;
  }
}

/**
 * Collect all user data
 */
async function collectUserData(userId: string): Promise<UserData> {
  const supabase = await createServiceClient();

  // Fetch all user data in parallel
  const [
    profileResult,
    postsResult,
    commentsResult,
    reactionsResult,
    bookmarksResult,
    followsResult,
    historyResult,
    notificationsResult,
    sessionsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('posts').select('*').eq('author_id', userId),
    supabase.from('comments').select('*').eq('author_id', userId),
    supabase.from('reactions').select('*').eq('user_id', userId),
    supabase.from('bookmarks').select('*').eq('user_id', userId),
    supabase.from('follows').select('*').eq('follower_id', userId),
    supabase.from('reading_history').select('*').eq('user_id', userId),
    supabase.from('notifications').select('*').eq('user_id', userId),
    supabase.from('sessions').select('*').eq('user_id', userId),
  ]);

  // Remove sensitive fields
  const sanitizedProfile = { ...profileResult.data };
  delete sanitizedProfile.password_hash;

  return {
    profile: sanitizedProfile || {},
    posts: postsResult.data || [],
    comments: commentsResult.data || [],
    reactions: reactionsResult.data || [],
    bookmarks: bookmarksResult.data || [],
    follows: followsResult.data || [],
    readingHistory: historyResult.data || [],
    notifications: notificationsResult.data || [],
    sessions: (sessionsResult.data || []).map((s) => ({
      ...s,
      token: '[REDACTED]',
    })),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Convert user data to CSV format
 */
function convertToCSV(userData: UserData): string {
  const sections: string[] = [];

  // Profile
  sections.push('=== PROFILE ===');
  sections.push(objectToCSV([userData.profile]));

  // Posts
  if (userData.posts.length > 0) {
    sections.push('\n=== POSTS ===');
    sections.push(objectToCSV(userData.posts));
  }

  // Comments
  if (userData.comments.length > 0) {
    sections.push('\n=== COMMENTS ===');
    sections.push(objectToCSV(userData.comments));
  }

  // Add other sections similarly...

  return sections.join('\n');
}

function objectToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((item) =>
    headers.map((header) => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/"/g, '""');
    }).map((v) => `"${v}"`).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

// ============================================================================
// ACCOUNT DELETION
// ============================================================================

/**
 * Request account deletion
 */
export async function requestAccountDeletion(
  userId: string,
  reason?: string
): Promise<AccountDeletionRequest> {
  const supabase = await createClient();

  // Check for existing request
  const { data: existing } = await supabase
    .from('account_deletion_requests')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'scheduled', 'processing'])
    .single();

  if (existing) {
    throw new Error('You already have a pending deletion request');
  }

  // Schedule deletion for 30 days from now (grace period)
  const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('account_deletion_requests')
    .insert({
      user_id: userId,
      status: 'scheduled',
      reason,
      scheduled_for: scheduledFor.toISOString(),
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('[GDPR] Failed to create deletion request', error);
    throw error;
  }

  logger.info('[GDPR] Account deletion requested', {
    userId,
    requestId: data.id,
    scheduledFor: scheduledFor.toISOString(),
  });

  return data as AccountDeletionRequest;
}

/**
 * Cancel account deletion request
 */
export async function cancelAccountDeletion(userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('account_deletion_requests')
    .update({
      status: 'cancelled',
    })
    .eq('user_id', userId)
    .in('status', ['pending', 'scheduled']);

  if (error) {
    logger.error('[GDPR] Failed to cancel deletion request', error);
    throw error;
  }

  logger.info('[GDPR] Account deletion cancelled', { userId });
}

/**
 * Process account deletion
 */
export async function processAccountDeletion(requestId: string): Promise<void> {
  const supabase = await createServiceClient();

  // Get the request
  const { data: request, error: fetchError } = await supabase
    .from('account_deletion_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error('Deletion request not found');
  }

  // Update status
  await supabase
    .from('account_deletion_requests')
    .update({ status: 'processing' })
    .eq('id', requestId);

  try {
    const userId = request.user_id;

    // Delete user data in order (to handle foreign key constraints)
    
    // 1. Delete notifications
    await supabase.from('notifications').delete().eq('user_id', userId);

    // 2. Delete reading history
    await supabase.from('reading_history').delete().eq('user_id', userId);

    // 3. Delete bookmarks
    await supabase.from('bookmarks').delete().eq('user_id', userId);

    // 4. Delete bookmark folders
    await supabase.from('bookmark_folders').delete().eq('user_id', userId);

    // 5. Delete follows
    await supabase.from('follows').delete().eq('follower_id', userId);
    await supabase.from('follows').delete().eq('following_id', userId);

    // 6. Delete reactions
    await supabase.from('reactions').delete().eq('user_id', userId);

    // 7. Delete comments
    await supabase.from('comments').delete().eq('author_id', userId);

    // 8. Anonymize posts (keep content, remove author link)
    await supabase
      .from('posts')
      .update({
        author_id: null,
        status: 'archived',
      })
      .eq('author_id', userId);

    // 9. Delete sessions
    await supabase.from('sessions').delete().eq('user_id', userId);

    // 10. Delete supporter records
    await supabase.from('supporters').delete().eq('user_id', userId);

    // 11. Delete badges
    await supabase.from('user_badges').delete().eq('user_id', userId);

    // 12. Delete profile
    await supabase.from('profiles').delete().eq('id', userId);

    // 13. Delete auth user (this will cascade)
    await supabase.auth.admin.deleteUser(userId);

    // Update request status
    await supabase
      .from('account_deletion_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    logger.info('[GDPR] Account deleted', { requestId, userId });
  } catch (error) {
    await supabase
      .from('account_deletion_requests')
      .update({
        status: 'pending',
      })
      .eq('id', requestId);

    logger.error('[GDPR] Account deletion failed', { requestId, error });
    throw error;
  }
}

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

/**
 * Record user consent
 */
export async function recordConsent(
  userId: string,
  consentType: ConsentType,
  granted: boolean,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<ConsentRecord> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('consent_records')
    .insert({
      user_id: userId,
      consent_type: consentType,
      granted,
      ip_address: metadata?.ipAddress || null,
      user_agent: metadata?.userAgent || null,
      granted_at: granted ? new Date().toISOString() : null,
      revoked_at: !granted ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    logger.error('[GDPR] Failed to record consent', error);
    throw error;
  }

  logger.info('[GDPR] Consent recorded', { userId, consentType, granted });

  return data as ConsentRecord;
}

/**
 * Get user's consent records
 */
export async function getUserConsents(userId: string): Promise<Record<ConsentType, boolean>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('consent_records')
    .select('consent_type, granted')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[GDPR] Failed to fetch consents', error);
    throw error;
  }

  // Get latest consent for each type
  const consents: Record<ConsentType, boolean> = {
    essential: true, // Always required
    analytics: false,
    marketing: false,
    personalization: false,
    third_party: false,
  };

  const seen = new Set<ConsentType>();
  for (const record of data || []) {
    if (!seen.has(record.consent_type)) {
      consents[record.consent_type as ConsentType] = record.granted;
      seen.add(record.consent_type as ConsentType);
    }
  }

  return consents;
}

/**
 * Check if user has given consent
 */
export async function hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
  const consents = await getUserConsents(userId);
  return consents[consentType] || false;
}

/**
 * Revoke all consents
 */
export async function revokeAllConsents(userId: string): Promise<void> {
  const consentTypes: ConsentType[] = ['analytics', 'marketing', 'personalization', 'third_party'];

  for (const type of consentTypes) {
    await recordConsent(userId, type, false);
  }

  logger.info('[GDPR] All consents revoked', { userId });
}

export default {
  requestDataExport,
  processDataExport,
  requestAccountDeletion,
  cancelAccountDeletion,
  processAccountDeletion,
  recordConsent,
  getUserConsents,
  hasConsent,
  revokeAllConsents,
};
