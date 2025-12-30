/**
 * Analytics Aggregator
 * Aggregates and processes analytics data
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface MetricSummary {
  total: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DashboardMetrics {
  pageViews: MetricSummary;
  uniqueVisitors: MetricSummary;
  avgSessionDuration: MetricSummary;
  bounceRate: MetricSummary;
  topPages: Array<{ path: string; views: number; uniqueViews: number }>;
  topReferrers: Array<{ source: string; visits: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  browserBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}

export interface ContentMetrics {
  postId: string;
  views: number;
  uniqueViews: number;
  avgReadTime: number;
  completionRate: number;
  engagementScore: number;
  reactions: Record<string, number>;
  shares: number;
  comments: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Get dashboard metrics for a date range
 */
export async function getDashboardMetrics(
  range: TimeRange,
  compareRange?: TimeRange
): Promise<DashboardMetrics> {
  const supabase = await createServiceClient();

  // Get page view metrics
  const { data: pageViews } = await supabase
    .from('analytics_events')
    .select('id, session_id')
    .eq('event_type', 'page_view')
    .gte('created_at', range.start.toISOString())
    .lte('created_at', range.end.toISOString());

  const currentViews = pageViews?.length || 0;
  const currentUnique = new Set(pageViews?.map((p) => p.session_id)).size;

  // Get comparison data if range provided
  let previousViews = 0;
  let previousUnique = 0;

  if (compareRange) {
    const { data: prevPageViews } = await supabase
      .from('analytics_events')
      .select('id, session_id')
      .eq('event_type', 'page_view')
      .gte('created_at', compareRange.start.toISOString())
      .lte('created_at', compareRange.end.toISOString());

    previousViews = prevPageViews?.length || 0;
    previousUnique = new Set(prevPageViews?.map((p) => p.session_id)).size;
  }

  // Get top pages
  const { data: topPagesData } = await supabase
    .from('analytics_events')
    .select('page_path, session_id')
    .eq('event_type', 'page_view')
    .gte('created_at', range.start.toISOString())
    .lte('created_at', range.end.toISOString());

  const pageStats = new Map<string, { views: number; sessions: Set<string> }>();
  for (const event of topPagesData || []) {
    const path = event.page_path || '/';
    if (!pageStats.has(path)) {
      pageStats.set(path, { views: 0, sessions: new Set() });
    }
    const stats = pageStats.get(path)!;
    stats.views++;
    if (event.session_id) stats.sessions.add(event.session_id);
  }

  const topPages = Array.from(pageStats.entries())
    .map(([path, stats]) => ({
      path,
      views: stats.views,
      uniqueViews: stats.sessions.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Get referrers
  const { data: referrerData } = await supabase
    .from('analytics_events')
    .select('referrer')
    .eq('event_type', 'page_view')
    .not('referrer', 'is', null)
    .gte('created_at', range.start.toISOString())
    .lte('created_at', range.end.toISOString());

  const referrerCounts = new Map<string, number>();
  for (const event of referrerData || []) {
    const source = parseReferrer(event.referrer);
    referrerCounts.set(source, (referrerCounts.get(source) || 0) + 1);
  }

  const topReferrers = Array.from(referrerCounts.entries())
    .map(([source, visits]) => ({ source, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);

  // Get device breakdown
  const { data: deviceData } = await supabase
    .from('analytics_events')
    .select('device_type, browser, country')
    .eq('event_type', 'page_view')
    .gte('created_at', range.start.toISOString())
    .lte('created_at', range.end.toISOString());

  const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
  const browserBreakdown: Record<string, number> = {};
  const countryBreakdown: Record<string, number> = {};

  for (const event of deviceData || []) {
    // Device
    const device = event.device_type as keyof typeof deviceBreakdown;
    if (device && device in deviceBreakdown) {
      deviceBreakdown[device]++;
    }

    // Browser
    const browser = event.browser || 'Unknown';
    browserBreakdown[browser] = (browserBreakdown[browser] || 0) + 1;

    // Country
    const country = event.country || 'Unknown';
    countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
  }

  return {
    pageViews: calculateMetricSummary(currentViews, previousViews),
    uniqueVisitors: calculateMetricSummary(currentUnique, previousUnique),
    avgSessionDuration: {
      total: 0,
      change: 0,
      changePercent: 0,
      trend: 'stable',
    }, // Would need session data
    bounceRate: { total: 0, change: 0, changePercent: 0, trend: 'stable' }, // Would need session data
    topPages,
    topReferrers,
    deviceBreakdown,
    browserBreakdown,
    countryBreakdown,
  };
}

/**
 * Get time series data for a metric
 */
export async function getTimeSeries(
  metric: 'page_views' | 'unique_visitors' | 'sessions',
  range: TimeRange,
  granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<TimeSeriesPoint[]> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('analytics_events')
    .select('created_at, session_id')
    .eq('event_type', 'page_view')
    .gte('created_at', range.start.toISOString())
    .lte('created_at', range.end.toISOString())
    .order('created_at');

  if (!data || data.length === 0) {
    return [];
  }

  // Group by time bucket
  const buckets = new Map<string, { count: number; sessions: Set<string> }>();

  for (const event of data) {
    const bucket = getTimeBucket(new Date(event.created_at), granularity);

    if (!buckets.has(bucket)) {
      buckets.set(bucket, { count: 0, sessions: new Set() });
    }

    const stats = buckets.get(bucket)!;
    stats.count++;
    if (event.session_id) stats.sessions.add(event.session_id);
  }

  return Array.from(buckets.entries())
    .map(([timestamp, stats]) => ({
      timestamp,
      value: metric === 'unique_visitors' ? stats.sessions.size : stats.count,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Get content performance metrics
 */
export async function getContentMetrics(
  postId: string,
  range?: TimeRange
): Promise<ContentMetrics | null> {
  const supabase = await createServiceClient();

  let query = supabase.from('analytics_events').select('*').eq('content_id', postId);

  if (range) {
    query = query
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());
  }

  const { data: events } = await query;

  if (!events || events.length === 0) {
    return null;
  }

  const views = events.filter((e) => e.event_type === 'post_view').length;
  const uniqueSessions = new Set(events.map((e) => e.session_id)).size;

  // Calculate read times
  const readEvents = events.filter((e) => e.event_type === 'read_time');
  const totalReadTime = readEvents.reduce((sum, e) => sum + (e.value || 0), 0);
  const avgReadTime = readEvents.length > 0 ? totalReadTime / readEvents.length : 0;

  // Completion rate (percentage who scrolled to end)
  const scrollEvents = events.filter((e) => e.event_type === 'scroll_depth');
  const completions = scrollEvents.filter((e) => (e.value || 0) >= 90).length;
  const completionRate = views > 0 ? (completions / views) * 100 : 0;

  // Get reactions
  const { data: reactions } = await supabase
    .from('post_reactions')
    .select('reaction_type')
    .eq('post_id', postId);

  const reactionCounts: Record<string, number> = {};
  for (const r of reactions || []) {
    reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
  }

  // Get comments count
  const { count: commentCount } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId);

  // Calculate engagement score (weighted combination)
  const totalReactions = Object.values(reactionCounts).reduce((sum, n) => sum + n, 0);
  const engagementScore = calculateEngagementScore({
    views,
    uniqueViews: uniqueSessions,
    avgReadTime,
    completionRate,
    reactions: totalReactions,
    comments: commentCount || 0,
  });

  return {
    postId,
    views,
    uniqueViews: uniqueSessions,
    avgReadTime,
    completionRate,
    engagementScore,
    reactions: reactionCounts,
    shares: 0, // Would need share tracking
    comments: commentCount || 0,
  };
}

/**
 * Get top performing content
 */
export async function getTopContent(
  range: TimeRange,
  limit: number = 10
): Promise<Array<ContentMetrics & { title: string; slug: string }>> {
  const supabase = await createServiceClient();

  // Get view counts per post
  const { data: viewData } = await supabase
    .from('analytics_events')
    .select('content_id')
    .eq('event_type', 'post_view')
    .not('content_id', 'is', null)
    .gte('created_at', range.start.toISOString())
    .lte('created_at', range.end.toISOString());

  const viewCounts = new Map<string, number>();
  for (const event of viewData || []) {
    if (event.content_id) {
      viewCounts.set(event.content_id, (viewCounts.get(event.content_id) || 0) + 1);
    }
  }

  // Get top post IDs
  const topPostIds = Array.from(viewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topPostIds.length === 0) {
    return [];
  }

  // Get post details
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug')
    .in('id', topPostIds);

  const postMap = new Map((posts || []).map((p) => [p.id, p]));

  // Get metrics for each post
  const results = await Promise.all(
    topPostIds.map(async (postId) => {
      const metrics = await getContentMetrics(postId, range);
      const post = postMap.get(postId);

      if (!metrics || !post) return null;

      return {
        ...metrics,
        title: post.title,
        slug: post.slug,
      };
    })
  );

  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Get real-time active users (last 5 minutes)
 */
export async function getActiveUsers(): Promise<number> {
  const supabase = await createServiceClient();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const { data } = await supabase
    .from('analytics_events')
    .select('session_id')
    .gte('created_at', fiveMinutesAgo.toISOString());

  return new Set(data?.map((e) => e.session_id)).size;
}

// Helper functions

function calculateMetricSummary(current: number, previous: number): MetricSummary {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;

  let trend: 'up' | 'down' | 'stable';
  if (Math.abs(changePercent) < 1) {
    trend = 'stable';
  } else if (change > 0) {
    trend = 'up';
  } else {
    trend = 'down';
  }

  return {
    total: current,
    change,
    changePercent: Math.round(changePercent * 10) / 10,
    trend,
  };
}

function getTimeBucket(date: Date, granularity: 'hour' | 'day' | 'week' | 'month'): string {
  switch (granularity) {
    case 'hour':
      return date.toISOString().slice(0, 13) + ':00:00Z';
    case 'day':
      return date.toISOString().slice(0, 10);
    case 'week': {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    case 'month':
      return date.toISOString().slice(0, 7);
  }
}

function parseReferrer(referrer: string): string {
  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    return referrer || 'Direct';
  }
}

function calculateEngagementScore(metrics: {
  views: number;
  uniqueViews: number;
  avgReadTime: number;
  completionRate: number;
  reactions: number;
  comments: number;
}): number {
  // Weighted engagement score (0-100)
  const weights = {
    viewsPerUnique: 0.1, // Return visits
    readTime: 0.25, // Time spent
    completion: 0.25, // Content consumed
    reactions: 0.2, // Active engagement
    comments: 0.2, // Deep engagement
  };

  const viewsPerUnique =
    metrics.uniqueViews > 0 ? (Math.min(metrics.views / metrics.uniqueViews - 1, 2) / 2) * 100 : 0;

  const readTimeScore = Math.min(metrics.avgReadTime / 180, 1) * 100; // Max 3 min
  const completionScore = metrics.completionRate;
  const reactionScore = Math.min((metrics.reactions / metrics.uniqueViews) * 10, 1) * 100 || 0;
  const commentScore = Math.min((metrics.comments / metrics.uniqueViews) * 20, 1) * 100 || 0;

  const score =
    viewsPerUnique * weights.viewsPerUnique +
    readTimeScore * weights.readTime +
    completionScore * weights.completion +
    reactionScore * weights.reactions +
    commentScore * weights.comments;

  return Math.round(score);
}
