/**
 * GDPR Compliance Utilities
 * Handles data export, deletion, and consent management
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface UserDataExport {
  profile: Record<string, unknown>;
  posts: Record<string, unknown>[];
  comments: Record<string, unknown>[];
  media: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  consents: Record<string, unknown>[];
  exportedAt: string;
}

export interface ConsentRecord {
  type: string;
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
}

/**
 * Export all user data (GDPR Article 20 - Right to Data Portability)
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const supabase = await createServiceClient();

  // Fetch all user data in parallel
  const [
    profile,
    posts,
    comments,
    media,
    notifications,
    sessions,
    consents,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('posts').select('*').eq('author_id', userId),
    supabase.from('comments').select('*').eq('user_id', userId),
    supabase.from('media_files').select('*').eq('user_id', userId),
    supabase.from('notifications').select('*').eq('user_id', userId),
    supabase.from('user_sessions').select('*').eq('user_id', userId),
    supabase.from('user_consents').select('*').eq('user_id', userId),
  ]);

  // Sanitize sensitive data
  const sanitizedProfile = profile.data ? {
    ...profile.data,
    // Remove internal fields
    totp_secret: undefined,
    backup_codes: undefined,
  } : null;

  return {
    profile: sanitizedProfile || {},
    posts: posts.data || [],
    comments: comments.data || [],
    media: media.data || [],
    notifications: notifications.data || [],
    sessions: (sessions.data || []).map(s => ({
      ...s,
      // Remove fingerprints
      device_fingerprint: '[REDACTED]',
    })),
    consents: consents.data || [],
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Delete all user data (GDPR Article 17 - Right to Erasure)
 */
export async function deleteUserData(userId: string): Promise<{
  success: boolean;
  deletedItems: Record<string, number>;
  errors: string[];
}> {
  const supabase = await createServiceClient();
  const deletedItems: Record<string, number> = {};
  const errors: string[] = [];

  // Order matters due to foreign key constraints
  const deleteOperations = [
    { table: 'notifications', field: 'user_id' },
    { table: 'user_sessions', field: 'user_id' },
    { table: 'user_consents', field: 'user_id' },
    { table: 'two_factor_challenges', field: 'user_id' },
    { table: 'two_factor_recovery_attempts', field: 'user_id' },
    { table: 'login_attempts', field: 'user_id' },
    { table: 'api_keys', field: 'user_id' },
    { table: 'webhooks', field: 'user_id' },
    { table: 'comments', field: 'user_id' },
    { table: 'post_reactions', field: 'user_id' },
    { table: 'posts', field: 'author_id' },
    { table: 'media_files', field: 'user_id' },
  ];

  for (const { table, field } of deleteOperations) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq(field, userId)
      .select();

    if (error) {
      errors.push(`Failed to delete from ${table}: ${error.message}`);
    } else {
      deletedItems[table] = data?.length || 0;
    }
  }

  // Finally, delete the profile (this will cascade to auth.users via trigger)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    errors.push(`Failed to delete profile: ${profileError.message}`);
    return { success: false, deletedItems, errors };
  }

  deletedItems['profiles'] = 1;

  // Delete auth user (requires admin privileges)
  // This should trigger any additional cleanup
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  
  if (authError) {
    errors.push(`Failed to delete auth user: ${authError.message}`);
  }

  return {
    success: errors.length === 0,
    deletedItems,
    errors,
  };
}

/**
 * Anonymize user data (alternative to deletion)
 */
export async function anonymizeUserData(userId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const anonymousId = `deleted_${Date.now()}`;

  // Update profile to anonymous
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      username: anonymousId,
      display_name: 'Deleted User',
      email: `${anonymousId}@deleted.local`,
      bio: null,
      avatar_url: null,
      website: null,
      twitter_handle: null,
      totp_secret: null,
      backup_codes: null,
      totp_enabled: false,
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Failed to anonymize profile:', profileError);
    return false;
  }

  // Delete sensitive data
  await Promise.all([
    supabase.from('user_sessions').delete().eq('user_id', userId),
    supabase.from('login_attempts').delete().eq('user_id', userId),
    supabase.from('api_keys').delete().eq('user_id', userId),
    supabase.from('notifications').delete().eq('user_id', userId),
  ]);

  return true;
}

/**
 * Record user consent
 */
export async function recordConsent(
  userId: string,
  consentType: string,
  granted: boolean,
  ipAddress?: string,
  documentId?: string
): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('user_consents')
    .insert({
      user_id: userId,
      consent_type: consentType,
      granted,
      ip_address: ipAddress,
      document_id: documentId,
    });

  return !error;
}

/**
 * Get user's consent history
 */
export async function getConsentHistory(userId: string): Promise<ConsentRecord[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((c) => ({
    type: c.consent_type,
    granted: c.granted,
    timestamp: new Date(c.created_at),
    ipAddress: c.ip_address,
  }));
}

/**
 * Check if user has given consent for a specific type
 */
export async function hasConsent(userId: string, consentType: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('user_consents')
    .select('granted')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return false;
  }

  return data.granted;
}

/**
 * Withdraw consent
 */
export async function withdrawConsent(
  userId: string,
  consentType: string,
  ipAddress?: string
): Promise<boolean> {
  return recordConsent(userId, consentType, false, ipAddress);
}

/**
 * Generate data retention report
 */
export async function getDataRetentionReport(): Promise<{
  totalUsers: number;
  usersWithConsent: number;
  pendingDeletions: number;
  dataCategories: Array<{ name: string; count: number }>;
}> {
  const supabase = await createServiceClient();

  const [users, consents, deletionRequests] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('user_consents').select('user_id', { count: 'exact' }).eq('granted', true),
    supabase.from('deletion_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
  ]);

  return {
    totalUsers: users.count || 0,
    usersWithConsent: consents.count || 0,
    pendingDeletions: deletionRequests.count || 0,
    dataCategories: [
      { name: 'Profiles', count: users.count || 0 },
      { name: 'Posts', count: 0 }, // Would need separate query
      { name: 'Comments', count: 0 },
      { name: 'Media', count: 0 },
    ],
  };
}
