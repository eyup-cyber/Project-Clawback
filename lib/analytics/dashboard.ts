/**
 * Analytics Dashboard
 * Phase 21: Views, engagement, conversion tracking, dashboards
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardMetrics {
  overview: OverviewMetrics;
  traffic: TrafficMetrics;
  engagement: EngagementMetrics;
  content: ContentMetrics;
  audience: AudienceMetrics;
}

export interface OverviewMetrics {
  totalViews: number;
  totalViewsChange: number;
  uniqueVisitors: number;
  uniqueVisitorsChange: number;
  totalReactions: number;
  totalReactionsChange: number;
  totalComments: number;
  totalCommentsChange: number;
  avgSessionDuration: number;
  avgSessionDurationChange: number;
  bounceRate: number;
  bounceRateChange: number;
}

export interface TrafficMetrics {
  viewsByDay: { date: string; views: number; visitors: number }[];
  viewsBySource: { source: string; views: number; percentage: number }[];
  viewsByDevice: { device: string; views: number; percentage: number }[];
  viewsByCountry: { country: string; views: number; percentage: number }[];
  topReferrers: { referrer: string; views: number }[];
}

export interface EngagementMetrics {
  avgTimeOnPage: number;
  avgScrollDepth: number;
  reactionsByType: { type: string; count: number }[];
  commentsByDay: { date: string; count: number }[];
  sharesByPlatform: { platform: string; count: number }[];
  bookmarkRate: number;
  completionRate: number;
}

export interface ContentMetrics {
  topPosts: PostAnalytics[];
  topCategories: { category: string; views: number; posts: number }[];
  topTags: { tag: string; views: number; posts: number }[];
  contentByStatus: { status: string; count: number }[];
  publishingTrend: { date: string; published: number }[];
}

export interface PostAnalytics {
  id: string;
  title: string;
  slug: string;
  views: number;
  uniqueViews: number;
  reactions: number;
  comments: number;
  shares: number;
  avgTimeOnPage: number;
  completionRate: number;
  publishedAt: string;
}

export interface AudienceMetrics {
  totalFollowers: number;
  followersChange: number;
  newFollowersByDay: { date: string; count: number }[];
  followersByCountry: { country: string; count: number }[];
  activeReaders: number;
  returningReaders: number;
  subscriberConversionRate: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

// ============================================================================
// OVERVIEW METRICS
// ============================================================================

/**
 * Get overview metrics for dashboard
 */
export async function getOverviewMetrics(
  userId: string,
  dateRange: DateRange
): Promise<OverviewMetrics> {
  const supabase = await createClient();
  const { from, to } = dateRange;

  // Calculate previous period for comparison
  const periodLength = to.getTime() - from.getTime();
  const previousFrom = new Date(from.getTime() - periodLength);
  const previousTo = new Date(from.getTime());

  // Get current period stats
  const { data: currentStats } = await supabase.rpc('get_analytics_summary', {
    p_user_id: userId,
    p_start_date: from.toISOString(),
    p_end_date: to.toISOString(),
  });

  // Get previous period stats
  const { data: previousStats } = await supabase.rpc('get_analytics_summary', {
    p_user_id: userId,
    p_start_date: previousFrom.toISOString(),
    p_end_date: previousTo.toISOString(),
  });

  const current = currentStats?.[0] || {};
  const previous = previousStats?.[0] || {};

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  return {
    totalViews: current.total_views || 0,
    totalViewsChange: calcChange(current.total_views || 0, previous.total_views || 0),
    uniqueVisitors: current.unique_visitors || 0,
    uniqueVisitorsChange: calcChange(current.unique_visitors || 0, previous.unique_visitors || 0),
    totalReactions: current.total_reactions || 0,
    totalReactionsChange: calcChange(current.total_reactions || 0, previous.total_reactions || 0),
    totalComments: current.total_comments || 0,
    totalCommentsChange: calcChange(current.total_comments || 0, previous.total_comments || 0),
    avgSessionDuration: current.avg_session_duration || 0,
    avgSessionDurationChange: calcChange(
      current.avg_session_duration || 0,
      previous.avg_session_duration || 0
    ),
    bounceRate: current.bounce_rate || 0,
    bounceRateChange: calcChange(current.bounce_rate || 0, previous.bounce_rate || 0),
  };
}

// ============================================================================
// TRAFFIC METRICS
// ============================================================================

/**
 * Get traffic metrics
 */
export async function getTrafficMetrics(
  userId: string,
  dateRange: DateRange
): Promise<TrafficMetrics> {
  const supabase = await createClient();
  const { from, to } = dateRange;

  // Get views by day
  const { data: viewsByDay } = await supabase
    .from('analytics_aggregates')
    .select('date, page_views, unique_visitors')
    .eq('user_id', userId)
    .gte('date', from.toISOString().split('T')[0])
    .lte('date', to.toISOString().split('T')[0])
    .order('date', { ascending: true });

  // Get views by source
  const { data: sourceData } = await supabase
    .from('analytics_events')
    .select('referrer_source')
    .eq('user_id', userId)
    .eq('event_type', 'page_view')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const sourceCounts = new Map<string, number>();
  let totalSourceViews = 0;
  (sourceData || []).forEach((e) => {
    const source = e.referrer_source || 'direct';
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    totalSourceViews++;
  });

  const viewsBySource = Array.from(sourceCounts.entries())
    .map(([source, views]) => ({
      source,
      views,
      percentage: totalSourceViews > 0 ? (views / totalSourceViews) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Get views by device
  const { data: deviceData } = await supabase
    .from('analytics_events')
    .select('device_type')
    .eq('user_id', userId)
    .eq('event_type', 'page_view')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const deviceCounts = new Map<string, number>();
  let totalDeviceViews = 0;
  (deviceData || []).forEach((e) => {
    const device = e.device_type || 'unknown';
    deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
    totalDeviceViews++;
  });

  const viewsByDevice = Array.from(deviceCounts.entries())
    .map(([device, views]) => ({
      device,
      views,
      percentage: totalDeviceViews > 0 ? (views / totalDeviceViews) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views);

  // Get views by country
  const { data: countryData } = await supabase
    .from('analytics_events')
    .select('country')
    .eq('user_id', userId)
    .eq('event_type', 'page_view')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const countryCounts = new Map<string, number>();
  let totalCountryViews = 0;
  (countryData || []).forEach((e) => {
    const country = e.country || 'unknown';
    countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    totalCountryViews++;
  });

  const viewsByCountry = Array.from(countryCounts.entries())
    .map(([country, views]) => ({
      country,
      views,
      percentage: totalCountryViews > 0 ? (views / totalCountryViews) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Get top referrers
  const { data: referrerData } = await supabase
    .from('analytics_events')
    .select('referrer_url')
    .eq('user_id', userId)
    .eq('event_type', 'page_view')
    .not('referrer_url', 'is', null)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const referrerCounts = new Map<string, number>();
  (referrerData || []).forEach((e) => {
    if (e.referrer_url) {
      try {
        const domain = new URL(e.referrer_url).hostname;
        referrerCounts.set(domain, (referrerCounts.get(domain) || 0) + 1);
      } catch {
        // Invalid URL, skip
      }
    }
  });

  const topReferrers = Array.from(referrerCounts.entries())
    .map(([referrer, views]) => ({ referrer, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return {
    viewsByDay: (viewsByDay || []).map((d) => ({
      date: d.date,
      views: d.page_views,
      visitors: d.unique_visitors,
    })),
    viewsBySource,
    viewsByDevice,
    viewsByCountry,
    topReferrers,
  };
}

// ============================================================================
// CONTENT METRICS
// ============================================================================

/**
 * Get content metrics
 */
export async function getContentMetrics(
  userId: string,
  dateRange: DateRange
): Promise<ContentMetrics> {
  const supabase = await createClient();
  const { from, to } = dateRange;

  // Get top posts
  const { data: topPostsData } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      view_count,
      published_at,
      reactions:reactions(count),
      comments:comments(count)
    `
    )
    .eq('author_id', userId)
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .limit(10);

  const topPosts: PostAnalytics[] = (topPostsData || []).map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    views: post.view_count || 0,
    uniqueViews: Math.round((post.view_count || 0) * 0.7), // Estimate
    reactions: Array.isArray(post.reactions) ? post.reactions.length : 0,
    comments: Array.isArray(post.comments) ? post.comments.length : 0,
    shares: 0,
    avgTimeOnPage: 0,
    completionRate: 0,
    publishedAt: post.published_at,
  }));

  // Get top categories
  const { data: categoryData } = await supabase
    .from('posts')
    .select('category:categories(name), view_count')
    .eq('author_id', userId)
    .eq('status', 'published');

  const categoryCounts = new Map<string, { views: number; posts: number }>();
  (categoryData || []).forEach((post) => {
    const categoryName = (post.category as { name?: string })?.name || 'Uncategorized';
    const current = categoryCounts.get(categoryName) || { views: 0, posts: 0 };
    categoryCounts.set(categoryName, {
      views: current.views + (post.view_count || 0),
      posts: current.posts + 1,
    });
  });

  const topCategories = Array.from(categoryCounts.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Get top tags
  const { data: tagData } = await supabase
    .from('posts')
    .select('tags, view_count')
    .eq('author_id', userId)
    .eq('status', 'published');

  const tagCounts = new Map<string, { views: number; posts: number }>();
  (tagData || []).forEach((post) => {
    const tags = (post.tags as string[]) || [];
    tags.forEach((tag) => {
      const current = tagCounts.get(tag) || { views: 0, posts: 0 };
      tagCounts.set(tag, {
        views: current.views + (post.view_count || 0),
        posts: current.posts + 1,
      });
    });
  });

  const topTags = Array.from(tagCounts.entries())
    .map(([tag, stats]) => ({ tag, ...stats }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Get content by status
  const { data: statusData } = await supabase
    .from('posts')
    .select('status')
    .eq('author_id', userId);

  const statusCounts = new Map<string, number>();
  (statusData || []).forEach((post) => {
    statusCounts.set(post.status, (statusCounts.get(post.status) || 0) + 1);
  });

  const contentByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  // Get publishing trend
  const { data: publishingData } = await supabase
    .from('posts')
    .select('published_at')
    .eq('author_id', userId)
    .eq('status', 'published')
    .gte('published_at', from.toISOString())
    .lte('published_at', to.toISOString())
    .order('published_at', { ascending: true });

  const publishingByDate = new Map<string, number>();
  (publishingData || []).forEach((post) => {
    const date = post.published_at.split('T')[0];
    publishingByDate.set(date, (publishingByDate.get(date) || 0) + 1);
  });

  const publishingTrend = Array.from(publishingByDate.entries())
    .map(([date, published]) => ({ date, published }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    topPosts,
    topCategories,
    topTags,
    contentByStatus,
    publishingTrend,
  };
}

// ============================================================================
// AUDIENCE METRICS
// ============================================================================

/**
 * Get audience metrics
 */
export async function getAudienceMetrics(
  userId: string,
  dateRange: DateRange
): Promise<AudienceMetrics> {
  const supabase = await createClient();
  const { from, to } = dateRange;

  // Get follower count
  const { data: profile } = await supabase
    .from('profiles')
    .select('follower_count')
    .eq('id', userId)
    .single();

  // Calculate previous period
  const periodLength = to.getTime() - from.getTime();
  const previousFrom = new Date(from.getTime() - periodLength);

  // Get new followers by day
  const { data: followsData } = await supabase
    .from('follows')
    .select('created_at')
    .eq('following_id', userId)
    .eq('following_type', 'user')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const followersByDate = new Map<string, number>();
  (followsData || []).forEach((follow) => {
    const date = follow.created_at.split('T')[0];
    followersByDate.set(date, (followersByDate.get(date) || 0) + 1);
  });

  const newFollowersByDay = Array.from(followersByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get previous period followers for comparison
  const { count: previousFollowers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
    .eq('following_type', 'user')
    .gte('created_at', previousFrom.toISOString())
    .lt('created_at', from.toISOString());

  const currentFollowers = followsData?.length || 0;
  const followersChange =
    previousFollowers && previousFollowers > 0
      ? ((currentFollowers - previousFollowers) / previousFollowers) * 100
      : currentFollowers > 0
        ? 100
        : 0;

  return {
    totalFollowers: profile?.follower_count || 0,
    followersChange,
    newFollowersByDay,
    followersByCountry: [], // Would require user location data
    activeReaders: 0, // Would require more complex tracking
    returningReaders: 0,
    subscriberConversionRate: 0,
  };
}

// ============================================================================
// FULL DASHBOARD
// ============================================================================

/**
 * Get complete dashboard metrics
 */
export async function getDashboardMetrics(
  userId: string,
  dateRange: DateRange
): Promise<DashboardMetrics> {
  try {
    const [overview, traffic, content, audience] = await Promise.all([
      getOverviewMetrics(userId, dateRange),
      getTrafficMetrics(userId, dateRange),
      getContentMetrics(userId, dateRange),
      getAudienceMetrics(userId, dateRange),
    ]);

    return {
      overview,
      traffic,
      engagement: {
        avgTimeOnPage: 0,
        avgScrollDepth: 0,
        reactionsByType: [],
        commentsByDay: [],
        sharesByPlatform: [],
        bookmarkRate: 0,
        completionRate: 0,
      },
      content,
      audience,
    };
  } catch (error) {
    logger.error('[Analytics] Failed to get dashboard metrics', error);
    throw error;
  }
}

export default {
  getOverviewMetrics,
  getTrafficMetrics,
  getContentMetrics,
  getAudienceMetrics,
  getDashboardMetrics,
};
