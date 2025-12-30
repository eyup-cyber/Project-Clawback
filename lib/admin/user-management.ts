/**
 * Admin User Management
 * Phase 22: User CRUD, role management, suspensions, bulk actions
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  is_verified: boolean;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  ban_expires_at: string | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  comment_count: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'reader' | 'contributor' | 'editor' | 'admin' | 'superadmin';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'banned' | 'deleted';

export interface UserListFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  verified?: boolean;
  sortBy?: 'created_at' | 'last_login_at' | 'follower_count' | 'post_count';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResult {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: { userId: string; error: string }[];
}

// ============================================================================
// USER LISTING
// ============================================================================

/**
 * Get paginated list of users with filters
 */
export async function getUsers(
  filters: UserListFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<UserListResult> {
  const supabase = await createServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase.from('profiles').select('*', { count: 'exact' });

  // Apply filters
  if (filters.role) {
    query = query.eq('role', filters.role);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.verified !== undefined) {
    query = query.eq('is_verified', filters.verified);
  }
  if (filters.search) {
    query = query.or(
      `username.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    logger.error('[Admin] Failed to list users', error);
    throw error;
  }

  // Get additional stats for each user
  const usersWithStats = await Promise.all(
    (data || []).map(async (user) => {
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id);

      const { count: commentCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id);

      return {
        ...user,
        post_count: postCount || 0,
        comment_count: commentCount || 0,
      } as AdminUser;
    })
  );

  return {
    users: usersWithStats,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get single user by ID
 */
export async function getUser(userId: string): Promise<AdminUser | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error || !data) return null;

  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);

  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);

  return {
    ...data,
    post_count: postCount || 0,
    comment_count: commentCount || 0,
  } as AdminUser;
}

// ============================================================================
// USER ACTIONS
// ============================================================================

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: UserRole,
  adminId: string
): Promise<AdminUser> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[Admin] Failed to update user role', error);
    throw error;
  }

  // Log the action
  await logAdminAction(adminId, 'update_role', userId, {
    old_role: data.role,
    new_role: role,
  });

  logger.info('[Admin] User role updated', { userId, role, adminId });

  return data as AdminUser;
}

/**
 * Update user status
 */
export async function updateUserStatus(
  userId: string,
  status: UserStatus,
  adminId: string,
  reason?: string
): Promise<AdminUser> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[Admin] Failed to update user status', error);
    throw error;
  }

  await logAdminAction(adminId, 'update_status', userId, { status, reason });

  logger.info('[Admin] User status updated', { userId, status, adminId });

  return data as AdminUser;
}

/**
 * Ban a user
 */
export async function banUser(
  userId: string,
  adminId: string,
  options: {
    reason: string;
    expiresAt?: string;
    permanent?: boolean;
  }
): Promise<AdminUser> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      status: 'banned',
      is_banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: options.reason,
      ban_expires_at: options.permanent ? null : options.expiresAt || null,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[Admin] Failed to ban user', error);
    throw error;
  }

  await logAdminAction(adminId, 'ban_user', userId, options);

  logger.info('[Admin] User banned', {
    userId,
    reason: options.reason,
    adminId,
  });

  return data as AdminUser;
}

/**
 * Unban a user
 */
export async function unbanUser(userId: string, adminId: string): Promise<AdminUser> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      is_banned: false,
      banned_at: null,
      ban_reason: null,
      ban_expires_at: null,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[Admin] Failed to unban user', error);
    throw error;
  }

  await logAdminAction(adminId, 'unban_user', userId);

  logger.info('[Admin] User unbanned', { userId, adminId });

  return data as AdminUser;
}

/**
 * Verify a user
 */
export async function verifyUser(userId: string, adminId: string): Promise<AdminUser> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_verified: true })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[Admin] Failed to verify user', error);
    throw error;
  }

  await logAdminAction(adminId, 'verify_user', userId);

  logger.info('[Admin] User verified', { userId, adminId });

  return data as AdminUser;
}

/**
 * Delete a user (soft delete)
 */
export async function deleteUser(
  userId: string,
  adminId: string,
  options: { hardDelete?: boolean } = {}
): Promise<void> {
  const supabase = await createServiceClient();

  if (options.hardDelete) {
    // Hard delete - actually remove the user
    const { error } = await supabase.from('profiles').delete().eq('id', userId);

    if (error) {
      logger.error('[Admin] Failed to hard delete user', error);
      throw error;
    }
  } else {
    // Soft delete - mark as deleted
    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('[Admin] Failed to delete user', error);
      throw error;
    }
  }

  await logAdminAction(
    adminId,
    options.hardDelete ? 'hard_delete_user' : 'soft_delete_user',
    userId
  );

  logger.info('[Admin] User deleted', {
    userId,
    hardDelete: options.hardDelete,
    adminId,
  });
}

// ============================================================================
// BULK ACTIONS
// ============================================================================

/**
 * Bulk update user roles
 */
export async function bulkUpdateRole(
  userIds: string[],
  role: UserRole,
  adminId: string
): Promise<BulkActionResult> {
  const result: BulkActionResult = { success: 0, failed: 0, errors: [] };

  for (const userId of userIds) {
    try {
      await updateUserRole(userId, role, adminId);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Bulk update user status
 */
export async function bulkUpdateStatus(
  userIds: string[],
  status: UserStatus,
  adminId: string,
  reason?: string
): Promise<BulkActionResult> {
  const result: BulkActionResult = { success: 0, failed: 0, errors: [] };

  for (const userId of userIds) {
    try {
      await updateUserStatus(userId, status, adminId, reason);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Bulk ban users
 */
export async function bulkBanUsers(
  userIds: string[],
  adminId: string,
  options: {
    reason: string;
    expiresAt?: string;
    permanent?: boolean;
  }
): Promise<BulkActionResult> {
  const result: BulkActionResult = { success: 0, failed: 0, errors: [] };

  for (const userId of userIds) {
    try {
      await banUser(userId, adminId, options);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

// ============================================================================
// ADMIN LOG
// ============================================================================

/**
 * Log admin action
 */
async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createServiceClient();

  try {
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action,
      target_type: 'user',
      target_id: targetUserId,
      metadata,
    });
  } catch (error) {
    logger.warn('[Admin] Failed to log admin action', error as Record<string, unknown>);
  }
}

/**
 * Get admin action logs
 */
export async function getAdminLogs(options: {
  adminId?: string;
  targetId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<
  {
    id: string;
    admin_id: string;
    action: string;
    target_type: string;
    target_id: string;
    metadata: Record<string, unknown>;
    created_at: string;
    admin?: { username: string; display_name: string };
  }[]
> {
  const { adminId, targetId, action, limit = 50, offset = 0 } = options;
  const supabase = await createServiceClient();

  let query = supabase
    .from('admin_logs')
    .select(
      `
      *,
      admin:profiles!admin_logs_admin_id_fkey(username, display_name)
    `
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (adminId) query = query.eq('admin_id', adminId);
  if (targetId) query = query.eq('target_id', targetId);
  if (action) query = query.eq('action', action);

  const { data, error } = await query;

  if (error) {
    logger.error('[Admin] Failed to fetch admin logs', error);
    throw error;
  }

  return data || [];
}

export default {
  getUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
  banUser,
  unbanUser,
  verifyUser,
  deleteUser,
  bulkUpdateRole,
  bulkUpdateStatus,
  bulkBanUsers,
  getAdminLogs,
};
