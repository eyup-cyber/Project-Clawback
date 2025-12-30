// @ts-nocheck
/**
 * User Activity Feed System
 * Phase 45: Track and display user activities on profiles
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  target_type: TargetType;
  target_id: string;
  target_data: ActivityTargetData;
  metadata: ActivityMetadata;
  visibility: ActivityVisibility;
  created_at: string;
}

export type ActivityType =
  // Content activities
  | 'post_created'
  | 'post_published'
  | 'post_updated'
  | 'comment_posted'
  | 'reply_posted'
  // Social activities
  | 'followed_user'
  | 'followed_category'
  | 'followed_tag'
  // Engagement activities
  | 'reaction_added'
  | 'bookmark_added'
  | 'post_shared'
  // Achievement activities
  | 'badge_earned'
  | 'level_up'
  | 'milestone_reached'
  // Profile activities
  | 'profile_updated'
  | 'avatar_changed'
  | 'bio_updated';

export type TargetType =
  | 'post'
  | 'comment'
  | 'user'
  | 'category'
  | 'tag'
  | 'badge'
  | 'milestone'
  | 'profile';

export type ActivityVisibility = 'public' | 'followers' | 'private';

export interface ActivityTargetData {
  // For posts
  title?: string;
  slug?: string;
  excerpt?: string;
  featured_image_url?: string;

  // For users
  username?: string;
  display_name?: string;
  avatar_url?: string;

  // For categories/tags
  name?: string;
  color?: string;

  // For badges/milestones
  badge_name?: string;
  badge_icon?: string;
  milestone_name?: string;
  milestone_value?: number;

  // For comments
  content_preview?: string;
  post_title?: string;
  post_slug?: string;
}

export interface ActivityMetadata {
  ip_address?: string;
  user_agent?: string;
  location?: string;
  previous_value?: unknown;
  new_value?: unknown;
  additional?: Record<string, unknown>;
}

export interface ActivityWithUser extends ActivityItem {
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface ActivityFeedQuery {
  user_id?: string;
  activity_types?: ActivityType[];
  target_types?: TargetType[];
  visibility?: ActivityVisibility | ActivityVisibility[];
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}

export interface ActivityFeedResult {
  items: ActivityWithUser[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ActivityStats {
  total_activities: number;
  by_type: Partial<Record<ActivityType, number>>;
  by_day: { date: string; count: number }[];
  most_active_day: string | null;
  streak_days: number;
}

// ============================================================================
// ACTIVITY RECORDING
// ============================================================================

/**
 * Record a new activity
 */
export async function recordActivity(
  activityType: ActivityType,
  targetType: TargetType,
  targetId: string,
  targetData: ActivityTargetData,
  options: {
    visibility?: ActivityVisibility;
    metadata?: ActivityMetadata;
  } = {}
): Promise<ActivityItem> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { visibility = 'public', metadata = {} } = options;

  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: user.id,
      activity_type: activityType,
      target_type: targetType,
      target_id: targetId,
      target_data: targetData,
      metadata,
      visibility,
    })
    .select()
    .single();

  if (error) {
    logger.error('[ActivityFeed] Failed to record activity', error);
    throw error;
  }

  logger.info('[ActivityFeed] Activity recorded', {
    activity_type: activityType,
    target_type: targetType,
    target_id: targetId,
  });

  return data as ActivityItem;
}

/**
 * Record activity with service client (for background jobs)
 */
export async function recordActivitySystem(
  userId: string,
  activityType: ActivityType,
  targetType: TargetType,
  targetId: string,
  targetData: ActivityTargetData,
  options: {
    visibility?: ActivityVisibility;
    metadata?: ActivityMetadata;
  } = {}
): Promise<ActivityItem> {
  const supabase = await createServiceClient();
  const { visibility = 'public', metadata = {} } = options;

  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: userId,
      activity_type: activityType,
      target_type: targetType,
      target_id: targetId,
      target_data: targetData,
      metadata,
      visibility,
    })
    .select()
    .single();

  if (error) {
    logger.error('[ActivityFeed] Failed to record system activity', error);
    throw error;
  }

  return data as ActivityItem;
}

// ============================================================================
// ACTIVITY QUERIES
// ============================================================================

/**
 * Get activity feed for a user
 */
export async function getUserActivityFeed(
  userId: string,
  query: Omit<ActivityFeedQuery, 'user_id'> = {}
): Promise<ActivityFeedResult> {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { activity_types, target_types, from, to, limit = 20, cursor } = query;

  // Determine visibility based on viewer
  let visibilityFilter: ActivityVisibility[] = ['public'];
  if (currentUser) {
    if (currentUser.id === userId) {
      // Viewing own feed - show everything
      visibilityFilter = ['public', 'followers', 'private'];
    } else {
      // Check if following
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .single();

      if (followData) {
        visibilityFilter = ['public', 'followers'];
      }
    }
  }

  let queryBuilder = supabase
    .from('activities')
    .select(
      `
      *,
      user:profiles!activities_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('user_id', userId)
    .in('visibility', visibilityFilter)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check for more

  // Filter by activity types
  if (activity_types && activity_types.length > 0) {
    queryBuilder = queryBuilder.in('activity_type', activity_types);
  }

  // Filter by target types
  if (target_types && target_types.length > 0) {
    queryBuilder = queryBuilder.in('target_type', target_types);
  }

  // Date filters
  if (from) {
    queryBuilder = queryBuilder.gte('created_at', from.toISOString());
  }
  if (to) {
    queryBuilder = queryBuilder.lte('created_at', to.toISOString());
  }

  // Cursor pagination
  if (cursor) {
    queryBuilder = queryBuilder.lt('created_at', cursor);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    logger.error('[ActivityFeed] Failed to get user activity feed', error);
    throw error;
  }

  const items = (data || []).slice(0, limit) as ActivityWithUser[];
  const hasMore = (data || []).length > limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return {
    items,
    next_cursor: nextCursor,
    has_more: hasMore,
  };
}

/**
 * Get aggregated feed from users being followed
 */
export async function getFollowingActivityFeed(
  query: Omit<ActivityFeedQuery, 'user_id'> = {}
): Promise<ActivityFeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { activity_types, target_types, from, to, limit = 20, cursor } = query;

  // Get followed user IDs
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('following_type', 'user');

  const followedIds = (follows || []).map((f) => f.following_id);

  if (followedIds.length === 0) {
    return { items: [], next_cursor: null, has_more: false };
  }

  let queryBuilder = supabase
    .from('activities')
    .select(
      `
      *,
      user:profiles!activities_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .in('user_id', followedIds)
    .in('visibility', ['public', 'followers'])
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  // Filter by activity types
  if (activity_types && activity_types.length > 0) {
    queryBuilder = queryBuilder.in('activity_type', activity_types);
  }

  // Filter by target types
  if (target_types && target_types.length > 0) {
    queryBuilder = queryBuilder.in('target_type', target_types);
  }

  // Date filters
  if (from) {
    queryBuilder = queryBuilder.gte('created_at', from.toISOString());
  }
  if (to) {
    queryBuilder = queryBuilder.lte('created_at', to.toISOString());
  }

  // Cursor pagination
  if (cursor) {
    queryBuilder = queryBuilder.lt('created_at', cursor);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    logger.error('[ActivityFeed] Failed to get following activity feed', error);
    throw error;
  }

  const items = (data || []).slice(0, limit) as ActivityWithUser[];
  const hasMore = (data || []).length > limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return {
    items,
    next_cursor: nextCursor,
    has_more: hasMore,
  };
}

/**
 * Get global activity feed (public activities)
 */
export async function getGlobalActivityFeed(
  query: Omit<ActivityFeedQuery, 'user_id' | 'visibility'> = {}
): Promise<ActivityFeedResult> {
  const supabase = await createClient();

  const { activity_types, target_types, from, to, limit = 20, cursor } = query;

  let queryBuilder = supabase
    .from('activities')
    .select(
      `
      *,
      user:profiles!activities_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  // Filter by activity types
  if (activity_types && activity_types.length > 0) {
    queryBuilder = queryBuilder.in('activity_type', activity_types);
  }

  // Filter by target types
  if (target_types && target_types.length > 0) {
    queryBuilder = queryBuilder.in('target_type', target_types);
  }

  // Date filters
  if (from) {
    queryBuilder = queryBuilder.gte('created_at', from.toISOString());
  }
  if (to) {
    queryBuilder = queryBuilder.lte('created_at', to.toISOString());
  }

  // Cursor pagination
  if (cursor) {
    queryBuilder = queryBuilder.lt('created_at', cursor);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    logger.error('[ActivityFeed] Failed to get global activity feed', error);
    throw error;
  }

  const items = (data || []).slice(0, limit) as ActivityWithUser[];
  const hasMore = (data || []).length > limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return {
    items,
    next_cursor: nextCursor,
    has_more: hasMore,
  };
}

// ============================================================================
// ACTIVITY STATISTICS
// ============================================================================

/**
 * Get activity statistics for a user
 */
export async function getUserActivityStats(userId: string): Promise<ActivityStats> {
  const supabase = await createServiceClient();

  // Get all activities for the user
  const { data: activities } = await supabase
    .from('activities')
    .select('activity_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const allActivities = activities || [];

  // Count by type
  const byType: Partial<Record<ActivityType, number>> = {};
  for (const activity of allActivities) {
    const type = activity.activity_type as ActivityType;
    byType[type] = (byType[type] || 0) + 1;
  }

  // Count by day (last 30 days)
  const byDayMap = new Map<string, number>();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const activity of allActivities) {
    const date = new Date(activity.created_at);
    if (date >= thirtyDaysAgo) {
      const dateStr = date.toISOString().split('T')[0];
      byDayMap.set(dateStr, (byDayMap.get(dateStr) || 0) + 1);
    }
  }

  const byDay = [...byDayMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Find most active day
  let mostActiveDay: string | null = null;
  let maxCount = 0;
  for (const { date, count } of byDay) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveDay = date;
    }
  }

  // Calculate streak
  const streakDays = calculateStreak(allActivities.map((a) => new Date(a.created_at)));

  return {
    total_activities: allActivities.length,
    by_type: byType,
    by_day: byDay,
    most_active_day: mostActiveDay,
    streak_days: streakDays,
  };
}

/**
 * Calculate activity streak
 */
function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  // Get unique dates
  const uniqueDates = [...new Set(dates.map((d) => d.toISOString().split('T')[0]))].sort(
    (a, b) => b.localeCompare(a) // Most recent first
  );

  if (uniqueDates.length === 0) return 0;

  // Check if today or yesterday has activity
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0; // Streak broken
  }

  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const next = new Date(uniqueDates[i + 1]);
    const diffDays = Math.floor((current.getTime() - next.getTime()) / 86400000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ============================================================================
// ACTIVITY MANAGEMENT
// ============================================================================

/**
 * Delete an activity
 */
export async function deleteActivity(activityId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('[ActivityFeed] Failed to delete activity', error);
    throw error;
  }
}

/**
 * Update activity visibility
 */
export async function updateActivityVisibility(
  activityId: string,
  visibility: ActivityVisibility
): Promise<ActivityItem> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('activities')
    .update({ visibility })
    .eq('id', activityId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('[ActivityFeed] Failed to update activity visibility', error);
    throw error;
  }

  return data as ActivityItem;
}

/**
 * Bulk delete old activities
 */
export async function cleanupOldActivities(olderThanDays: number = 365): Promise<number> {
  const supabase = await createServiceClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { count, error } = await supabase
    .from('activities')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('*', { count: 'exact', head: true });

  if (error) {
    logger.error('[ActivityFeed] Failed to cleanup old activities', error);
    throw error;
  }

  logger.info('[ActivityFeed] Cleaned up old activities', { deleted: count });
  return count || 0;
}

// ============================================================================
// ACTIVITY HELPERS
// ============================================================================

/**
 * Get human-readable activity description
 */
export function getActivityDescription(activity: ActivityItem): string {
  const targetName =
    activity.target_data.title ||
    activity.target_data.name ||
    activity.target_data.display_name ||
    activity.target_data.badge_name ||
    'something';

  const descriptions: Record<ActivityType, string> = {
    post_created: `created a draft "${targetName}"`,
    post_published: `published "${targetName}"`,
    post_updated: `updated "${targetName}"`,
    comment_posted: `commented on "${activity.target_data.post_title || targetName}"`,
    reply_posted: `replied to a comment on "${activity.target_data.post_title || targetName}"`,
    followed_user: `followed ${targetName}`,
    followed_category: `started following ${targetName}`,
    followed_tag: `started following #${targetName}`,
    reaction_added: `reacted to "${targetName}"`,
    bookmark_added: `bookmarked "${targetName}"`,
    post_shared: `shared "${targetName}"`,
    badge_earned: `earned the "${activity.target_data.badge_name}" badge`,
    level_up: `reached level ${activity.target_data.milestone_value}`,
    milestone_reached: `reached ${activity.target_data.milestone_name}`,
    profile_updated: 'updated their profile',
    avatar_changed: 'changed their profile picture',
    bio_updated: 'updated their bio',
  };

  return descriptions[activity.activity_type] || 'did something';
}

/**
 * Get activity icon name
 */
export function getActivityIcon(activityType: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    post_created: 'edit',
    post_published: 'publish',
    post_updated: 'update',
    comment_posted: 'comment',
    reply_posted: 'reply',
    followed_user: 'person_add',
    followed_category: 'category',
    followed_tag: 'tag',
    reaction_added: 'favorite',
    bookmark_added: 'bookmark',
    post_shared: 'share',
    badge_earned: 'emoji_events',
    level_up: 'trending_up',
    milestone_reached: 'celebration',
    profile_updated: 'person',
    avatar_changed: 'photo_camera',
    bio_updated: 'description',
  };

  return icons[activityType] || 'activity';
}

/**
 * Get activity link
 */
export function getActivityLink(activity: ActivityItem): string | null {
  switch (activity.target_type) {
    case 'post':
      return activity.target_data.slug ? `/posts/${activity.target_data.slug}` : null;
    case 'user':
      return activity.target_data.username ? `/@${activity.target_data.username}` : null;
    case 'category':
      return activity.target_data.name
        ? `/categories/${activity.target_data.name.toLowerCase()}`
        : null;
    case 'tag':
      return activity.target_data.name ? `/tags/${activity.target_data.name}` : null;
    case 'comment':
      return activity.target_data.post_slug
        ? `/posts/${activity.target_data.post_slug}#comment-${activity.target_id}`
        : null;
    case 'badge':
      return '/profile/badges';
    default:
      return null;
  }
}
