/**
 * Badges and Achievements System
 * Phase 19: User badges, achievement tracking, leaderboards
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon name
  color: string;
  category: BadgeCategory;
  tier: BadgeTier;
  requirement: BadgeRequirement;
  points: number;
  is_special: boolean;
  created_at: string;
}

export type BadgeCategory =
  | 'writing'
  | 'engagement'
  | 'community'
  | 'milestone'
  | 'special'
  | 'seasonal';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';

export interface BadgeRequirement {
  type: BadgeRequirementType;
  threshold: number;
  metadata?: Record<string, unknown>;
}

export type BadgeRequirementType =
  | 'posts_published'
  | 'total_views'
  | 'total_reactions'
  | 'total_comments'
  | 'followers_count'
  | 'following_count'
  | 'days_streak'
  | 'reading_time'
  | 'articles_read'
  | 'comments_written'
  | 'account_age_days'
  | 'first_post'
  | 'first_comment'
  | 'first_reaction'
  | 'featured_post'
  | 'manual'; // Admin assigned

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  awarded_for: string | null; // Specific context (e.g., post ID)
  badge: Badge;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  badge_count: number;
  change: number; // Position change from previous period
}

export interface LeaderboardType {
  id: string;
  name: string;
  description: string;
  metric: LeaderboardMetric;
  period: 'all_time' | 'monthly' | 'weekly';
}

export type LeaderboardMetric =
  | 'total_points'
  | 'badges_earned'
  | 'posts_published'
  | 'total_views'
  | 'total_reactions'
  | 'reading_streak'
  | 'articles_read';

// ============================================================================
// BADGE DEFINITIONS
// ============================================================================

export const BADGE_DEFINITIONS: Omit<Badge, 'id' | 'created_at'>[] = [
  // Writing badges
  {
    slug: 'first-post',
    name: 'First Words',
    description: 'Published your first article',
    icon: '✍️',
    color: '#10b981',
    category: 'writing',
    tier: 'bronze',
    requirement: { type: 'first_post', threshold: 1 },
    points: 10,
    is_special: false,
  },
  {
    slug: 'prolific-writer-bronze',
    name: 'Prolific Writer',
    description: 'Published 5 articles',
    icon: '📝',
    color: '#cd7f32',
    category: 'writing',
    tier: 'bronze',
    requirement: { type: 'posts_published', threshold: 5 },
    points: 25,
    is_special: false,
  },
  {
    slug: 'prolific-writer-silver',
    name: 'Prolific Writer II',
    description: 'Published 25 articles',
    icon: '📝',
    color: '#c0c0c0',
    category: 'writing',
    tier: 'silver',
    requirement: { type: 'posts_published', threshold: 25 },
    points: 50,
    is_special: false,
  },
  {
    slug: 'prolific-writer-gold',
    name: 'Prolific Writer III',
    description: 'Published 100 articles',
    icon: '📝',
    color: '#ffd700',
    category: 'writing',
    tier: 'gold',
    requirement: { type: 'posts_published', threshold: 100 },
    points: 100,
    is_special: false,
  },
  {
    slug: 'featured-author',
    name: 'Featured Author',
    description: 'Had an article featured on the homepage',
    icon: '⭐',
    color: '#f59e0b',
    category: 'writing',
    tier: 'gold',
    requirement: { type: 'featured_post', threshold: 1 },
    points: 75,
    is_special: true,
  },

  // Engagement badges
  {
    slug: 'first-reaction',
    name: 'Expressive',
    description: 'Gave your first reaction',
    icon: '❤️',
    color: '#ec4899',
    category: 'engagement',
    tier: 'bronze',
    requirement: { type: 'first_reaction', threshold: 1 },
    points: 5,
    is_special: false,
  },
  {
    slug: 'conversation-starter',
    name: 'Conversation Starter',
    description: 'Left your first comment',
    icon: '💬',
    color: '#8b5cf6',
    category: 'engagement',
    tier: 'bronze',
    requirement: { type: 'first_comment', threshold: 1 },
    points: 5,
    is_special: false,
  },
  {
    slug: 'popular-bronze',
    name: 'Rising Star',
    description: 'Received 100 total reactions',
    icon: '🌟',
    color: '#cd7f32',
    category: 'engagement',
    tier: 'bronze',
    requirement: { type: 'total_reactions', threshold: 100 },
    points: 30,
    is_special: false,
  },
  {
    slug: 'popular-silver',
    name: 'Crowd Favorite',
    description: 'Received 1,000 total reactions',
    icon: '🌟',
    color: '#c0c0c0',
    category: 'engagement',
    tier: 'silver',
    requirement: { type: 'total_reactions', threshold: 1000 },
    points: 75,
    is_special: false,
  },
  {
    slug: 'viral',
    name: 'Viral',
    description: 'Received 10,000 views on a single article',
    icon: '🚀',
    color: '#ef4444',
    category: 'engagement',
    tier: 'gold',
    requirement: { type: 'total_views', threshold: 10000 },
    points: 100,
    is_special: true,
  },

  // Community badges
  {
    slug: 'influencer-bronze',
    name: 'Influencer',
    description: 'Gained 10 followers',
    icon: '👥',
    color: '#cd7f32',
    category: 'community',
    tier: 'bronze',
    requirement: { type: 'followers_count', threshold: 10 },
    points: 20,
    is_special: false,
  },
  {
    slug: 'influencer-silver',
    name: 'Influencer II',
    description: 'Gained 100 followers',
    icon: '👥',
    color: '#c0c0c0',
    category: 'community',
    tier: 'silver',
    requirement: { type: 'followers_count', threshold: 100 },
    points: 50,
    is_special: false,
  },
  {
    slug: 'influencer-gold',
    name: 'Thought Leader',
    description: 'Gained 1,000 followers',
    icon: '👥',
    color: '#ffd700',
    category: 'community',
    tier: 'gold',
    requirement: { type: 'followers_count', threshold: 1000 },
    points: 150,
    is_special: true,
  },

  // Milestone badges
  {
    slug: 'one-year',
    name: 'Anniversary',
    description: 'Been a member for 1 year',
    icon: '🎂',
    color: '#06b6d4',
    category: 'milestone',
    tier: 'silver',
    requirement: { type: 'account_age_days', threshold: 365 },
    points: 50,
    is_special: false,
  },
  {
    slug: 'reading-streak-7',
    name: 'Bookworm',
    description: 'Read articles for 7 consecutive days',
    icon: '📚',
    color: '#cd7f32',
    category: 'milestone',
    tier: 'bronze',
    requirement: { type: 'days_streak', threshold: 7 },
    points: 15,
    is_special: false,
  },
  {
    slug: 'reading-streak-30',
    name: 'Dedicated Reader',
    description: 'Read articles for 30 consecutive days',
    icon: '📚',
    color: '#c0c0c0',
    category: 'milestone',
    tier: 'silver',
    requirement: { type: 'days_streak', threshold: 30 },
    points: 50,
    is_special: false,
  },
  {
    slug: 'reading-streak-100',
    name: 'Literary Devotee',
    description: 'Read articles for 100 consecutive days',
    icon: '📚',
    color: '#ffd700',
    category: 'milestone',
    tier: 'gold',
    requirement: { type: 'days_streak', threshold: 100 },
    points: 150,
    is_special: true,
  },

  // Special badges
  {
    slug: 'founding-member',
    name: 'Founding Member',
    description: 'Joined during the launch period',
    icon: '🏛️',
    color: '#a855f7',
    category: 'special',
    tier: 'legendary',
    requirement: { type: 'manual', threshold: 1 },
    points: 100,
    is_special: true,
  },
  {
    slug: 'verified',
    name: 'Verified',
    description: 'A verified contributor',
    icon: '✅',
    color: '#3b82f6',
    category: 'special',
    tier: 'legendary',
    requirement: { type: 'manual', threshold: 1 },
    points: 0,
    is_special: true,
  },
];

// ============================================================================
// BADGE FUNCTIONS
// ============================================================================

/**
 * Get all badges
 */
export async function getAllBadges(): Promise<Badge[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('points', { ascending: false });

  if (error) {
    logger.error('[Badges] Error fetching badges', error);
    throw error;
  }

  return data || [];
}

/**
 * Get badges for a user
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_badges')
    .select(
      `
      *,
      badge:badges(*)
    `
    )
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });

  if (error) {
    logger.error('[Badges] Error fetching user badges', error);
    throw error;
  }

  return (data || []) as UserBadge[];
}

/**
 * Award a badge to a user
 */
export async function awardBadge(options: {
  userId: string;
  badgeSlug: string;
  awardedFor?: string;
}): Promise<UserBadge | null> {
  const { userId, badgeSlug, awardedFor } = options;
  const supabase = await createClient();

  // Get the badge
  const { data: badge } = await supabase.from('badges').select('id').eq('slug', badgeSlug).single();

  if (!badge) {
    logger.warn('[Badges] Badge not found', { badgeSlug });
    return null;
  }

  // Check if already awarded
  const { data: existing } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badge.id)
    .single();

  if (existing) {
    logger.debug('[Badges] Badge already awarded', { userId, badgeSlug });
    return null;
  }

  // Award the badge
  const { data, error } = await supabase
    .from('user_badges')
    .insert({
      user_id: userId,
      badge_id: badge.id,
      awarded_for: awardedFor || null,
    })
    .select(
      `
      *,
      badge:badges(*)
    `
    )
    .single();

  if (error) {
    logger.error('[Badges] Error awarding badge', error);
    throw error;
  }

  logger.info('[Badges] Badge awarded', { userId, badgeSlug });
  return data as UserBadge;
}

/**
 * Check and award badges for a user based on their stats
 */
export async function checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
  const supabase = await createClient();
  const awardedBadges: UserBadge[] = [];

  // Get user stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, follower_count, following_count')
    .eq('id', userId)
    .single();

  if (!profile) return [];

  // Get post stats
  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId)
    .eq('status', 'published');

  // Get reaction count
  const { data: reactions } = await supabase.from('reactions').select('id').eq('user_id', userId);

  // Get comment count
  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);

  // Get all badges the user doesn't have
  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badge:badges(slug)')
    .eq('user_id', userId);

  const existingSlugs = new Set(
    (existingBadges || []).map((b) => (b.badge as { slug: string })?.slug)
  );

  // Get all badges
  const { data: allBadges } = await supabase.from('badges').select('*');

  // Check each badge
  for (const badge of allBadges || []) {
    if (existingSlugs.has(badge.slug)) continue;
    if (badge.requirement.type === 'manual') continue;

    let qualifies = false;
    const req = badge.requirement as BadgeRequirement;

    switch (req.type) {
      case 'posts_published':
      case 'first_post':
        qualifies = (postCount || 0) >= req.threshold;
        break;
      case 'followers_count':
        qualifies = (profile.follower_count || 0) >= req.threshold;
        break;
      case 'following_count':
        qualifies = (profile.following_count || 0) >= req.threshold;
        break;
      case 'first_reaction':
        qualifies = (reactions?.length || 0) >= req.threshold;
        break;
      case 'first_comment':
      case 'comments_written':
        qualifies = (commentCount || 0) >= req.threshold;
        break;
      case 'account_age_days':
        const daysSinceJoin = Math.floor(
          (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        qualifies = daysSinceJoin >= req.threshold;
        break;
    }

    if (qualifies) {
      const awarded = await awardBadge({ userId, badgeSlug: badge.slug });
      if (awarded) {
        awardedBadges.push(awarded);
      }
    }
  }

  return awardedBadges;
}

// ============================================================================
// LEADERBOARD FUNCTIONS
// ============================================================================

/**
 * Get leaderboard entries
 */
export async function getLeaderboard(options: {
  metric: LeaderboardMetric;
  period: 'all_time' | 'monthly' | 'weekly';
  limit?: number;
  offset?: number;
}): Promise<LeaderboardEntry[]> {
  const { metric, period, limit = 10, offset = 0 } = options;
  const supabase = await createClient();

  // Calculate date range
  const now = new Date();
  let dateFrom: string | null = null;

  if (period === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFrom = weekAgo.toISOString();
  } else if (period === 'monthly') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFrom = monthAgo.toISOString();
  }

  try {
    // Use RPC function for complex leaderboard queries
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_metric: metric,
      p_date_from: dateFrom,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      logger.warn('[Badges] Leaderboard RPC not available, using fallback', error);
      return getLeaderboardFallback(metric, limit, offset);
    }

    return data || [];
  } catch (error) {
    logger.error('[Badges] Error fetching leaderboard', error);
    return getLeaderboardFallback(metric, limit, offset);
  }
}

async function getLeaderboardFallback(
  metric: LeaderboardMetric,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  // Simple fallback based on follower count
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, follower_count')
    .in('role', ['contributor', 'editor', 'admin'])
    .eq('status', 'active')
    .order('follower_count', { ascending: false })
    .range(offset, offset + limit - 1);

  return (data || []).map((user, index) => ({
    rank: offset + index + 1,
    user_id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    score: user.follower_count || 0,
    badge_count: 0,
    change: 0,
  }));
}

/**
 * Get a user's rank on a specific leaderboard
 */
export async function getUserRank(
  userId: string,
  metric: LeaderboardMetric
): Promise<{ rank: number; score: number } | null> {
  const supabase = await createClient();

  try {
    const { data } = await supabase.rpc('get_user_rank', {
      p_user_id: userId,
      p_metric: metric,
    });

    return data;
  } catch {
    return null;
  }
}

/**
 * Get user's total points from badges
 */
export async function getUserPoints(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_badges')
    .select('badge:badges(points)')
    .eq('user_id', userId);

  if (!data) return 0;

  return data.reduce((sum, ub) => sum + ((ub.badge as { points: number })?.points || 0), 0);
}

const badgesDb = {
  getAllBadges,
  getUserBadges,
  awardBadge,
  checkAndAwardBadges,
  getLeaderboard,
  getUserRank,
  getUserPoints,
  BADGE_DEFINITIONS,
};

export default badgesDb;
