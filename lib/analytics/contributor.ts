// @ts-nocheck
/**
 * Contributor Analytics Dashboard
 * Phase 50: Analytics for content creators
 */

import { logger as _logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface ContributorStats {
  overview: ContributorOverview;
  content: ContentStats;
  engagement: EngagementStats;
  audience: AudienceStats;
  growth: GrowthStats;
  performance: PerformanceStats;
}

export interface ContributorOverview {
  total_posts: number;
  total_views: number;
  total_reactions: number;
  total_comments: number;
  total_bookmarks: number;
  total_shares: number;
  total_followers: number;
  total_reading_time_minutes: number;
}

export interface ContentStats {
  posts_published: number;
  posts_draft: number;
  posts_scheduled: number;
  posts_archived: number;
  categories_covered: number;
  unique_tags: number;
  avg_word_count: number;
  total_word_count: number;
  posts_by_status: Record<string, number>;
  posts_by_category: { category: string; count: number }[];
  posts_by_month: { month: string; count: number }[];
}

export interface EngagementStats {
  engagement_rate: number;
  avg_reactions_per_post: number;
  avg_comments_per_post: number;
  avg_bookmarks_per_post: number;
  avg_shares_per_post: number;
  reactions_breakdown: Record<string, number>;
  top_performing_posts: TopPost[];
  engagement_by_day: { date: string; reactions: number; comments: number }[];
  engagement_by_hour: { hour: number; engagement: number }[];
}

export interface TopPost {
  id: string;
  title: string;
  slug: string;
  views: number;
  reactions: number;
  comments: number;
  engagement_rate: number;
  published_at: string;
}

export interface AudienceStats {
  total_unique_readers: number;
  returning_readers: number;
  new_readers_this_month: number;
  follower_growth_rate: number;
  followers_by_month: { month: string; count: number }[];
  reader_demographics: {
    by_country: { country: string; count: number }[];
    by_device: { device: string; count: number }[];
    by_referrer: { source: string; count: number }[];
  };
  top_followers: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    follower_count: number;
  }[];
}

export interface GrowthStats {
  views_growth: number;
  followers_growth: number;
  engagement_growth: number;
  posts_growth: number;
  comparison_period: string;
  trends: {
    views: TrendData[];
    followers: TrendData[];
    engagement: TrendData[];
    posts: TrendData[];
  };
}

export interface TrendData {
  date: string;
  value: number;
  change: number;
}

export interface PerformanceStats {
  best_performing_day: string;
  best_performing_hour: number;
  optimal_post_length: number;
  best_categories: string[];
  best_tags: string[];
  avg_time_to_first_comment: number;
  avg_time_to_peak_engagement: number;
  content_velocity: number;
}

export interface AnalyticsDateRange {
  from: Date;
  to: Date;
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y' | 'all';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDateRange(period: AnalyticsPeriod): AnalyticsDateRange {
  const to = new Date();
  const from = new Date();

  switch (period) {
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case '1y':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case 'all':
      from.setFullYear(2020, 0, 1);
      break;
  }

  return { from, to };
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get comprehensive contributor analytics
 */
export async function getContributorAnalytics(
  period: AnalyticsPeriod = '30d'
): Promise<ContributorStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const dateRange = getDateRange(period);

  const [overview, content, engagement, audience, growth, performance] = await Promise.all([
    getOverviewStats(user.id),
    getContentStats(user.id, dateRange),
    getEngagementStats(user.id, dateRange),
    getAudienceStats(user.id, dateRange),
    getGrowthStats(user.id, period),
    getPerformanceStats(user.id, dateRange),
  ]);

  return {
    overview,
    content,
    engagement,
    audience,
    growth,
    performance,
  };
}

/**
 * Get overview statistics
 */
async function getOverviewStats(userId: string): Promise<ContributorOverview> {
  const supabase = await createServiceClient();

  // Get post stats
  const { data: posts } = await supabase
    .from('posts')
    .select('view_count, reaction_count, comment_count, bookmark_count, share_count, reading_time')
    .eq('author_id', userId)
    .eq('status', 'published');

  const allPosts = posts || [];

  // Get follower count
  const { count: followers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
    .eq('following_type', 'user');

  return {
    total_posts: allPosts.length,
    total_views: allPosts.reduce((sum, p) => sum + (p.view_count || 0), 0),
    total_reactions: allPosts.reduce((sum, p) => sum + (p.reaction_count || 0), 0),
    total_comments: allPosts.reduce((sum, p) => sum + (p.comment_count || 0), 0),
    total_bookmarks: allPosts.reduce((sum, p) => sum + (p.bookmark_count || 0), 0),
    total_shares: allPosts.reduce((sum, p) => sum + (p.share_count || 0), 0),
    total_followers: followers || 0,
    total_reading_time_minutes: allPosts.reduce((sum, p) => sum + (p.reading_time || 0), 0),
  };
}

/**
 * Get content statistics
 */
async function getContentStats(
  userId: string,
  _dateRange: AnalyticsDateRange
): Promise<ContentStats> {
  const supabase = await createServiceClient();

  // Get all posts
  const { data: allPosts } = await supabase
    .from('posts')
    .select('id, status, category_id, tags, word_count, published_at, category:categories(name)')
    .eq('author_id', userId);

  const posts = allPosts || [];

  // Count by status
  const postsByStatus: Record<string, number> = {
    published: 0,
    draft: 0,
    scheduled: 0,
    archived: 0,
  };

  for (const post of posts) {
    postsByStatus[post.status] = (postsByStatus[post.status] || 0) + 1;
  }

  // Count by category
  const categoryMap = new Map<string, number>();
  for (const post of posts) {
    const categoryName = (post.category as { name: string } | null)?.name || 'Uncategorized';
    categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
  }

  const postsByCategory = [...categoryMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Count by month (last 12 months)
  const monthMap = new Map<string, number>();
  const publishedPosts = posts.filter((p) => p.published_at);

  for (const post of publishedPosts) {
    const month = new Date(post.published_at).toISOString().slice(0, 7);
    monthMap.set(month, (monthMap.get(month) || 0) + 1);
  }

  const postsByMonth = [...monthMap.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // Calculate averages
  const totalWordCount = posts.reduce((sum, p) => sum + (p.word_count || 0), 0);
  const avgWordCount = posts.length > 0 ? Math.round(totalWordCount / posts.length) : 0;

  // Unique tags and categories
  const uniqueTags = new Set<string>();
  const uniqueCategories = new Set<string>();

  for (const post of posts) {
    for (const tag of post.tags || []) {
      uniqueTags.add(tag);
    }
    if (post.category_id) {
      uniqueCategories.add(post.category_id);
    }
  }

  return {
    posts_published: postsByStatus.published || 0,
    posts_draft: postsByStatus.draft || 0,
    posts_scheduled: postsByStatus.scheduled || 0,
    posts_archived: postsByStatus.archived || 0,
    categories_covered: uniqueCategories.size,
    unique_tags: uniqueTags.size,
    avg_word_count: avgWordCount,
    total_word_count: totalWordCount,
    posts_by_status: postsByStatus,
    posts_by_category: postsByCategory,
    posts_by_month: postsByMonth,
  };
}

/**
 * Get engagement statistics
 */
async function getEngagementStats(
  userId: string,
  dateRange: AnalyticsDateRange
): Promise<EngagementStats> {
  const supabase = await createServiceClient();

  // Get posts with engagement
  const { data: posts } = await supabase
    .from('posts')
    .select(
      'id, title, slug, view_count, reaction_count, comment_count, bookmark_count, share_count, published_at'
    )
    .eq('author_id', userId)
    .eq('status', 'published')
    .gte('published_at', dateRange.from.toISOString())
    .lte('published_at', dateRange.to.toISOString());

  const allPosts = posts || [];

  // Calculate totals
  const totalViews = allPosts.reduce((sum, p) => sum + (p.view_count || 0), 0);
  const totalReactions = allPosts.reduce((sum, p) => sum + (p.reaction_count || 0), 0);
  const totalComments = allPosts.reduce((sum, p) => sum + (p.comment_count || 0), 0);
  const totalBookmarks = allPosts.reduce((sum, p) => sum + (p.bookmark_count || 0), 0);
  const totalShares = allPosts.reduce((sum, p) => sum + (p.share_count || 0), 0);

  // Calculate engagement rate
  const engagementRate =
    totalViews > 0
      ? ((totalReactions + totalComments + totalBookmarks + totalShares) / totalViews) * 100
      : 0;

  // Calculate averages
  const count = allPosts.length || 1;
  const avgReactions = totalReactions / count;
  const avgComments = totalComments / count;
  const avgBookmarks = totalBookmarks / count;
  const avgShares = totalShares / count;

  // Get reactions breakdown
  const { data: reactions } = await supabase
    .from('reactions')
    .select('reaction_type, posts!inner(author_id)')
    .eq('posts.author_id', userId)
    .gte('created_at', dateRange.from.toISOString());

  const reactionsBreakdown: Record<string, number> = {};
  for (const reaction of reactions || []) {
    reactionsBreakdown[reaction.reaction_type] =
      (reactionsBreakdown[reaction.reaction_type] || 0) + 1;
  }

  // Top performing posts
  const topPosts = allPosts
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      views: p.view_count || 0,
      reactions: p.reaction_count || 0,
      comments: p.comment_count || 0,
      engagement_rate:
        p.view_count > 0 ? ((p.reaction_count + p.comment_count) / p.view_count) * 100 : 0,
      published_at: p.published_at,
    }))
    .sort((a, b) => b.engagement_rate - a.engagement_rate)
    .slice(0, 10);

  // Engagement by day
  const engagementByDayMap = new Map<string, { reactions: number; comments: number }>();
  for (const post of allPosts) {
    const date = new Date(post.published_at).toISOString().split('T')[0];
    const existing = engagementByDayMap.get(date) || {
      reactions: 0,
      comments: 0,
    };
    engagementByDayMap.set(date, {
      reactions: existing.reactions + (post.reaction_count || 0),
      comments: existing.comments + (post.comment_count || 0),
    });
  }

  const engagementByDay = [...engagementByDayMap.entries()]
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Engagement by hour (based on publish time)
  const engagementByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    engagement: 0,
  }));
  for (const post of allPosts) {
    const hour = new Date(post.published_at).getHours();
    engagementByHour[hour].engagement += (post.reaction_count || 0) + (post.comment_count || 0);
  }

  return {
    engagement_rate: engagementRate,
    avg_reactions_per_post: avgReactions,
    avg_comments_per_post: avgComments,
    avg_bookmarks_per_post: avgBookmarks,
    avg_shares_per_post: avgShares,
    reactions_breakdown: reactionsBreakdown,
    top_performing_posts: topPosts,
    engagement_by_day: engagementByDay,
    engagement_by_hour: engagementByHour,
  };
}

/**
 * Get audience statistics
 */
async function getAudienceStats(
  userId: string,
  _dateRange: AnalyticsDateRange
): Promise<AudienceStats> {
  const supabase = await createServiceClient();

  // Get follower stats
  const { data: followers } = await supabase
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_id', userId)
    .eq('following_type', 'user');

  const allFollowers = followers || [];

  // Followers by month
  const followersByMonth = new Map<string, number>();
  let runningTotal = 0;

  // Sort by date and accumulate
  const sortedFollowers = [...allFollowers].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const follower of sortedFollowers) {
    const month = new Date(follower.created_at).toISOString().slice(0, 7);
    runningTotal++;
    followersByMonth.set(month, runningTotal);
  }

  const followersByMonthArray = [...followersByMonth.entries()]
    .map(([month, count]) => ({ month, count }))
    .slice(-12);

  // Get unique readers (from reading history)
  const { count: uniqueReaders } = await supabase
    .from('reading_history')
    .select('user_id', { count: 'exact', head: true })
    .in(
      'post_id',
      (await supabase.from('posts').select('id').eq('author_id', userId)).data?.map((p) => p.id) ||
        []
    );

  // Get top followers (followers with most followers)
  const { data: topFollowersData } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, follower_count')
    .in(
      'id',
      allFollowers.map((f) => f.follower_id)
    )
    .order('follower_count', { ascending: false })
    .limit(10);

  // Calculate growth rate
  const thisMonth = new Date();
  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const thisMonthFollowers = allFollowers.filter((f) => new Date(f.created_at) >= lastMonth).length;
  const totalFollowers = allFollowers.length;
  const followerGrowthRate = totalFollowers > 0 ? (thisMonthFollowers / totalFollowers) * 100 : 0;

  return {
    total_unique_readers: uniqueReaders || 0,
    returning_readers: 0, // Would need more complex query
    new_readers_this_month: 0,
    follower_growth_rate: followerGrowthRate,
    followers_by_month: followersByMonthArray,
    reader_demographics: {
      by_country: [],
      by_device: [],
      by_referrer: [],
    },
    top_followers: (topFollowersData || []).map((f) => ({
      id: f.id,
      username: f.username,
      display_name: f.display_name,
      avatar_url: f.avatar_url,
      follower_count: f.follower_count || 0,
    })),
  };
}

/**
 * Get growth statistics
 */
async function getGrowthStats(userId: string, period: AnalyticsPeriod): Promise<GrowthStats> {
  const currentRange = getDateRange(period);
  const periodDays = Math.round(
    (currentRange.to.getTime() - currentRange.from.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Previous period
  const previousFrom = new Date(currentRange.from);
  previousFrom.setDate(previousFrom.getDate() - periodDays);
  const previousTo = new Date(currentRange.from);
  previousTo.setDate(previousTo.getDate() - 1);

  const supabase = await createServiceClient();

  // Get current period stats
  const { data: currentPosts } = await supabase
    .from('posts')
    .select('view_count, reaction_count, comment_count')
    .eq('author_id', userId)
    .eq('status', 'published')
    .gte('published_at', currentRange.from.toISOString())
    .lte('published_at', currentRange.to.toISOString());

  // Get previous period stats
  const { data: previousPosts } = await supabase
    .from('posts')
    .select('view_count, reaction_count, comment_count')
    .eq('author_id', userId)
    .eq('status', 'published')
    .gte('published_at', previousFrom.toISOString())
    .lte('published_at', previousTo.toISOString());

  const currentViews = (currentPosts || []).reduce((sum, p) => sum + (p.view_count || 0), 0);
  const previousViews = (previousPosts || []).reduce((sum, p) => sum + (p.view_count || 0), 0);

  const currentEngagement = (currentPosts || []).reduce(
    (sum, p) => sum + (p.reaction_count || 0) + (p.comment_count || 0),
    0
  );
  const previousEngagement = (previousPosts || []).reduce(
    (sum, p) => sum + (p.reaction_count || 0) + (p.comment_count || 0),
    0
  );

  // Get follower counts
  const { count: currentFollowers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
    .lte('created_at', currentRange.to.toISOString());

  const { count: previousFollowers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
    .lte('created_at', previousTo.toISOString());

  return {
    views_growth: calculateGrowthRate(currentViews, previousViews),
    followers_growth: calculateGrowthRate(currentFollowers || 0, previousFollowers || 0),
    engagement_growth: calculateGrowthRate(currentEngagement, previousEngagement),
    posts_growth: calculateGrowthRate((currentPosts || []).length, (previousPosts || []).length),
    comparison_period: `vs previous ${period}`,
    trends: {
      views: [],
      followers: [],
      engagement: [],
      posts: [],
    },
  };
}

/**
 * Get performance statistics
 */
async function getPerformanceStats(
  userId: string,
  dateRange: AnalyticsDateRange
): Promise<PerformanceStats> {
  const supabase = await createServiceClient();

  // Get posts with performance data
  const { data: posts } = await supabase
    .from('posts')
    .select(
      'id, published_at, word_count, view_count, reaction_count, comment_count, category:categories(name), tags'
    )
    .eq('author_id', userId)
    .eq('status', 'published')
    .gte('published_at', dateRange.from.toISOString());

  const allPosts = posts || [];

  // Best performing day
  const dayPerformance: Record<string, number> = {};
  for (const post of allPosts) {
    const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      new Date(post.published_at).getDay()
    ];
    dayPerformance[day] =
      (dayPerformance[day] || 0) + (post.view_count || 0) + (post.reaction_count || 0);
  }

  const bestDay = Object.entries(dayPerformance).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Best performing hour
  const hourPerformance: Record<number, number> = {};
  for (const post of allPosts) {
    const hour = new Date(post.published_at).getHours();
    hourPerformance[hour] =
      (hourPerformance[hour] || 0) + (post.view_count || 0) + (post.reaction_count || 0);
  }

  const bestHour = Number(Object.entries(hourPerformance).sort((a, b) => b[1] - a[1])[0]?.[0] || 0);

  // Optimal post length
  const postsByEngagement = allPosts
    .filter((p) => p.word_count && p.word_count > 0)
    .map((p) => ({
      wordCount: p.word_count,
      engagement: (p.reaction_count || 0) + (p.comment_count || 0),
    }))
    .sort((a, b) => b.engagement - a.engagement);

  const topEngaging = postsByEngagement.slice(0, Math.ceil(postsByEngagement.length * 0.2));
  const optimalLength =
    topEngaging.length > 0
      ? Math.round(topEngaging.reduce((sum, p) => sum + p.wordCount, 0) / topEngaging.length)
      : 1000;

  // Best categories
  const categoryPerformance: Record<string, number> = {};
  for (const post of allPosts) {
    const categoryName = (post.category as { name: string } | null)?.name || 'Uncategorized';
    categoryPerformance[categoryName] =
      (categoryPerformance[categoryName] || 0) + (post.view_count || 0);
  }

  const bestCategories = Object.entries(categoryPerformance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  // Best tags
  const tagPerformance: Record<string, number> = {};
  for (const post of allPosts) {
    for (const tag of post.tags || []) {
      tagPerformance[tag] = (tagPerformance[tag] || 0) + (post.view_count || 0);
    }
  }

  const bestTags = Object.entries(tagPerformance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Content velocity (posts per month)
  const months = new Set(allPosts.map((p) => new Date(p.published_at).toISOString().slice(0, 7)));
  const contentVelocity = months.size > 0 ? allPosts.length / months.size : 0;

  return {
    best_performing_day: bestDay,
    best_performing_hour: bestHour,
    optimal_post_length: optimalLength,
    best_categories: bestCategories,
    best_tags: bestTags,
    avg_time_to_first_comment: 0,
    avg_time_to_peak_engagement: 0,
    content_velocity: contentVelocity,
  };
}

/**
 * Export analytics data
 */
export async function exportContributorAnalytics(period: AnalyticsPeriod = '30d'): Promise<string> {
  const stats = await getContributorAnalytics(period);
  return JSON.stringify(stats, null, 2);
}
