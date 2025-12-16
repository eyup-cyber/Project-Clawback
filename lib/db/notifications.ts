import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';

// Note: The notifications table is created by migration 002_notifications.sql
// These functions will work once the migration is applied.

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | 'comment'
  | 'reaction'
  | 'reply'
  | 'mention'
  | 'follow'
  | 'post_published'
  | 'post_rejected'
  | 'application_approved'
  | 'application_rejected'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  post_id: string | null;
  comment_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationWithDetails extends Notification {
  post_title: string | null;
  post_slug: string | null;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
}

// Helper to get an untyped supabase client for notifications table
// (until the migration is applied and types are regenerated)
 
async function getNotificationsTable(): Promise<any> {
  const supabase = await createClient();
   
  return (supabase as any).from('notifications');
}

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Get notifications for a user
 */
export async function getNotifications(options: {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ notifications: NotificationWithDetails[]; total: number; unreadCount: number }> {
  const { userId, page = 1, limit = 20, unreadOnly = false } = options;

  const table = await getNotificationsTable();
  
  let query = table
    .select(`
      *,
      post:posts!notifications_post_id_fkey (title, slug),
      actor:profiles!notifications_actor_id_fkey (username, display_name, avatar_url)
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error('[getNotifications] Error', error, { userId, page, limit, unreadOnly });
    throw ApiError.badRequest('Failed to fetch notifications');
  }

  // Get unread count
  const unreadTable = await getNotificationsTable();
  const { count: unreadCount } = await unreadTable
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  // Transform the data to match expected shape
   
  const notifications = (data || []).map((n: any) => ({
    ...n,
    post_title: n.post?.title || null,
    post_slug: n.post?.slug || null,
    actor_username: n.actor?.username || null,
    actor_display_name: n.actor?.display_name || null,
    actor_avatar_url: n.actor?.avatar_url || null,
  })) as NotificationWithDetails[];

  return {
    notifications,
    total: count || 0,
    unreadCount: unreadCount || 0,
  };
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(
  userId: string,
  notificationIds: string[]
): Promise<number> {
  const table = await getNotificationsTable();

  const { data, error } = await table
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .in('id', notificationIds)
    .select();

  if (error) {
    logger.error('[markNotificationsRead] Error', error, { userId, notificationIds });
    throw ApiError.badRequest('Failed to mark notifications as read');
  }

  return data?.length || 0;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const table = await getNotificationsTable();

  const { data, error } = await table
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select();

  if (error) {
    logger.error('[markAllNotificationsRead] Error', error, { userId });
    throw ApiError.badRequest('Failed to mark notifications as read');
  }

  return data?.length || 0;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<void> {
  const table = await getNotificationsTable();

  const { error } = await table
    .delete()
    .eq('user_id', userId)
    .eq('id', notificationId);

  if (error) {
    logger.error('[deleteNotification] Error', error, { userId, notificationId });
    throw ApiError.badRequest('Failed to delete notification');
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<void> {
  const table = await getNotificationsTable();

  const { error } = await table
    .delete()
    .eq('user_id', userId);

  if (error) {
    logger.error('[deleteAllNotifications] Error', error, { userId });
    throw ApiError.badRequest('Failed to delete notifications');
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const table = await getNotificationsTable();

  const { count, error } = await table
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    logger.error('[getUnreadCount] Error', error, { userId });
    return 0;
  }

  return count || 0;
}

/**
 * Create a system notification (admin only)
 */
export async function createSystemNotification(options: {
  userId: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> {
  const table = await getNotificationsTable();

  const { data, error } = await table
    .insert({
      user_id: options.userId,
      type: 'system',
      title: options.title,
      message: options.message || null,
      metadata: options.metadata || {},
    })
    .select()
    .single();

  if (error) {
    logger.error('[createSystemNotification] Error', error, { userId: options.userId });
    throw ApiError.badRequest('Failed to create notification');
  }

  return data as Notification;
}

/**
 * Broadcast a system notification to all users or specific roles
 */
export async function broadcastSystemNotification(options: {
  title: string;
  message?: string;
  roles?: string[];
}): Promise<number> {
  const supabase = await createClient();

  // Get users to notify
  let query = supabase.from('profiles').select('id');
  
  if (options.roles && options.roles.length > 0) {
    // Cast to satisfy type checker - database roles: reader, contributor, editor, admin, superadmin
    query = query.in('role', options.roles as ('reader' | 'contributor' | 'editor' | 'admin' | 'superadmin')[]);
  }

  const { data: users, error: usersError } = await query;

  if (usersError || !users) {
    logger.error('[broadcastSystemNotification] Error', usersError);
    return 0;
  }

  // Create notifications for all users
  const table = await getNotificationsTable();
  const notifications = users.map((user) => ({
    user_id: user.id,
    type: 'system',
    title: options.title,
    message: options.message || null,
    metadata: {},
  }));

  const { data, error } = await table
    .insert(notifications)
    .select();

  if (error) {
    logger.error('[broadcastSystemNotification] Insert error', error);
    return 0;
  }

  return data?.length || 0;
}
