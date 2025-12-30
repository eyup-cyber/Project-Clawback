// @ts-nocheck
/**
 * Content Analytics
 * Track and analyze content performance metrics
 */

import { createClient } from '@/lib/supabase/server';

export interface ContentMetrics {
  postId: string;
  title: string;
  author: string;
  publishedAt: string;
  views: number;
  uniqueViews: number;
  avgReadTime: number; // seconds
  completionRate: number; // percentage
  engagementScore: number; // 0-100
  reactions: {
    total: number;
    breakdown: Record<string, number>;
  };
  comments: number;
  shares: number;
  bookmarks: number;
}

export interface ContentPerformance {
  period: string;
  totalViews: number;
  totalEngagements: number;
  avgReadTime: number;
  topContent: ContentMetrics[];
  contentByType: Array<{
    type: string;
    count: number;
    views: number;
    avgEngagement: number;
  }>;
  contentByCategory: Array<{
    category: string;
    count: number;
    views: number;
    avgEngagement: number;
  }>;
  publishingTrends: Array<{
    date: string;
    published: number;
    views: number;
  }>;
}

export interface AuthorPerformance {
  authorId: string;
  displayName: string;
  totalPosts: number;
  totalViews: number;
  avgEngagement: number;
  topPost: {
    id: string;
    title: string;
    views: number;
  } | null;
  recentActivity: Array<{
    date: string;
    posts: number;
    views: number;
  }>;
}

export interface ContentTrend {
  topic: string;
  posts: number;
  views: number;
  growth: number; // percentage
  trending: boolean;
}

/**
 * Get metrics for a specific post
 */
export async function getPostMetrics(postId: string): Promise<ContentMetrics | null> {
  const supabase = await createClient();

  // Fetch post data
  const { data: post } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      published_at,
      view_count,
      author:profiles(display_name)
    `
    )
    .eq('id', postId)
    .single();

  if (!post) return null;

  // Fetch engagement data
  const { data: reactions } = await supabase
    .from('reactions')
    .select('reaction_type')
    .eq('post_id', postId);

  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('status', 'published');

  // Fetch analytics events
  const { data: viewEvents } = await supabase
    .from('analytics_events')
    .select('user_id, properties')
    .eq('post_id', postId)
    .eq('event_type', 'post_view');

  const uniqueViews = new Set(viewEvents?.map((e) => e.user_id).filter(Boolean)).size;

  // Calculate read time from events
  const readTimes =
    viewEvents
      ?.map((e) => e.properties?.readTime as number)
      .filter((t): t is number => typeof t === 'number') || [];
  const avgReadTime =
    readTimes.length > 0 ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length : 0;

  // Calculate completion rate
  const completions =
    viewEvents?.filter((e) => (e.properties?.scrollDepth as number) >= 90).length || 0;
  const completionRate =
    viewEvents && viewEvents.length > 0 ? (completions / viewEvents.length) * 100 : 0;

  // Build reaction breakdown
  const reactionBreakdown = (reactions || []).reduce(
    (acc, r) => {
      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate engagement score
  const engagementScore = calculateEngagementScore({
    views: post.view_count || 0,
    uniqueViews,
    reactions: reactions?.length || 0,
    comments: commentCount || 0,
    completionRate,
    avgReadTime,
  });

  return {
    postId: post.id,
    title: post.title,
    author: (() => {
      const author = post.author as unknown;
      if (Array.isArray(author) && author[0]) {
        return (author[0] as { display_name?: string }).display_name || 'Unknown';
      }
      return (author as { display_name?: string })?.display_name || 'Unknown';
    })(),
    publishedAt: post.published_at,
    views: post.view_count || 0,
    uniqueViews,
    avgReadTime,
    completionRate,
    engagementScore,
    reactions: {
      total: reactions?.length || 0,
      breakdown: reactionBreakdown,
    },
    comments: commentCount || 0,
    shares: 0, // Would need separate tracking
    bookmarks: 0, // Would need separate tracking
  };
}

/**
 * Get overall content performance
 */
export async function getContentPerformance(
  startDate: Date,
  endDate: Date
): Promise<ContentPerformance> {
  const supabase = await createClient();

  // Get posts in date range
  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      content_type,
      view_count,
      published_at,
      author:profiles(display_name),
      categories:post_categories(
        category:categories(name)
      )
    `
    )
    .eq('status', 'published')
    .gte('published_at', startDate.toISOString())
    .lte('published_at', endDate.toISOString());

  // Get view events
  const { data: viewEvents } = await supabase
    .from('analytics_events')
    .select('post_id, properties')
    .eq('event_type', 'post_view')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // Get engagement events
  const { data: engagements } = await supabase
    .from('analytics_events')
    .select('event_type, post_id')
    .in('event_type', ['reaction_added', 'comment_created', 'post_shared'])
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const totalViews = viewEvents?.length || 0;
  const totalEngagements = engagements?.length || 0;

  // Calculate average read time
  const readTimes =
    viewEvents
      ?.map((e) => e.properties?.readTime as number)
      .filter((t): t is number => typeof t === 'number') || [];
  const avgReadTime =
    readTimes.length > 0 ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length : 0;

  // Get top content
  const topContent =
    posts
      ?.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 10)
      .map((p) => ({
        postId: p.id,
        title: p.title,
        author: (p.author as unknown as { display_name: string }[])?.[0]?.display_name || 'Unknown',
        publishedAt: p.published_at,
        views: p.view_count || 0,
        uniqueViews: 0,
        avgReadTime: 0,
        completionRate: 0,
        engagementScore: 0,
        reactions: { total: 0, breakdown: {} },
        comments: 0,
        shares: 0,
        bookmarks: 0,
      })) || [];

  // Aggregate by content type
  const byType = (posts || []).reduce(
    (acc, p) => {
      const type = p.content_type || 'article';
      if (!acc[type]) {
        acc[type] = { count: 0, views: 0, engagement: 0 };
      }
      acc[type].count += 1;
      acc[type].views += p.view_count || 0;
      return acc;
    },
    {} as Record<string, { count: number; views: number; engagement: number }>
  );

  const contentByType = Object.entries(byType).map(([type, data]) => ({
    type,
    count: data.count,
    views: data.views,
    avgEngagement: data.count > 0 ? data.engagement / data.count : 0,
  }));

  // Aggregate by category
  const byCategory = (posts || []).reduce(
    (acc, p) => {
      const cats = (p.categories as Array<{ category: { name: string } }>) || [];
      for (const cat of cats) {
        const name = cat.category?.name || 'Uncategorized';
        if (!acc[name]) {
          acc[name] = { count: 0, views: 0, engagement: 0 };
        }
        acc[name].count += 1;
        acc[name].views += p.view_count || 0;
      }
      return acc;
    },
    {} as Record<string, { count: number; views: number; engagement: number }>
  );

  const contentByCategory = Object.entries(byCategory).map(([category, data]) => ({
    category,
    count: data.count,
    views: data.views,
    avgEngagement: data.count > 0 ? data.engagement / data.count : 0,
  }));

  // Publishing trends
  const byDate = (posts || []).reduce(
    (acc, p) => {
      const date = p.published_at?.split('T')[0] || '';
      if (!acc[date]) {
        acc[date] = { published: 0, views: 0 };
      }
      acc[date].published += 1;
      acc[date].views += p.view_count || 0;
      return acc;
    },
    {} as Record<string, { published: number; views: number }>
  );

  const publishingTrends = Object.entries(byDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    totalViews,
    totalEngagements,
    avgReadTime,
    topContent,
    contentByType,
    contentByCategory,
    publishingTrends,
  };
}

/**
 * Get author performance metrics
 */
export async function getAuthorPerformance(authorId: string): Promise<AuthorPerformance | null> {
  const supabase = await createClient();

  const { data: author } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', authorId)
    .single();

  if (!author) return null;

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, view_count, published_at')
    .eq('author_id', authorId)
    .eq('status', 'published')
    .order('view_count', { ascending: false });

  const totalPosts = posts?.length || 0;
  const totalViews = posts?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;

  // Get engagement data
  const postIds = posts?.map((p) => p.id) || [];
  const { data: reactions } = await supabase
    .from('reactions')
    .select('post_id')
    .in('post_id', postIds);

  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .in('post_id', postIds);

  const avgEngagement =
    totalPosts > 0 ? ((reactions?.length || 0) + (commentCount || 0)) / totalPosts : 0;

  const topPost =
    posts && posts[0]
      ? {
          id: posts[0].id,
          title: posts[0].title,
          views: posts[0].view_count || 0,
        }
      : null;

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentPosts =
    posts?.filter((p) => p.published_at && new Date(p.published_at) >= thirtyDaysAgo) || [];

  const recentByDate = recentPosts.reduce(
    (acc, p) => {
      const date = p.published_at?.split('T')[0] || '';
      if (!acc[date]) {
        acc[date] = { posts: 0, views: 0 };
      }
      acc[date].posts += 1;
      acc[date].views += p.view_count || 0;
      return acc;
    },
    {} as Record<string, { posts: number; views: number }>
  );

  const recentActivity = Object.entries(recentByDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    authorId: author.id,
    displayName: author.display_name || 'Unknown',
    totalPosts,
    totalViews,
    avgEngagement,
    topPost,
    recentActivity,
  };
}

/**
 * Get trending topics
 */
export async function getTrendingTopics(days: number = 7): Promise<ContentTrend[]> {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const previousStart = new Date(startDate);
  previousStart.setDate(previousStart.getDate() - days);

  // Get current period tags
  const { data: currentPosts } = await supabase
    .from('posts')
    .select(
      `
      view_count,
      tags:post_tags(
        tag:tags(name)
      )
    `
    )
    .eq('status', 'published')
    .gte('published_at', startDate.toISOString());

  // Get previous period tags
  const { data: previousPosts } = await supabase
    .from('posts')
    .select(
      `
      view_count,
      tags:post_tags(
        tag:tags(name)
      )
    `
    )
    .eq('status', 'published')
    .gte('published_at', previousStart.toISOString())
    .lt('published_at', startDate.toISOString());

  // Aggregate current period
  const currentTopics = (currentPosts || []).reduce(
    (acc, p) => {
      const tags = (p.tags as Array<{ tag: { name: string } }>) || [];
      for (const tag of tags) {
        const name = tag.tag?.name || '';
        if (!name) continue;
        if (!acc[name]) {
          acc[name] = { posts: 0, views: 0 };
        }
        acc[name].posts += 1;
        acc[name].views += p.view_count || 0;
      }
      return acc;
    },
    {} as Record<string, { posts: number; views: number }>
  );

  // Aggregate previous period
  const previousTopics = (previousPosts || []).reduce(
    (acc, p) => {
      const tags = (p.tags as Array<{ tag: { name: string } }>) || [];
      for (const tag of tags) {
        const name = tag.tag?.name || '';
        if (!name) continue;
        if (!acc[name]) {
          acc[name] = { posts: 0, views: 0 };
        }
        acc[name].posts += 1;
        acc[name].views += p.view_count || 0;
      }
      return acc;
    },
    {} as Record<string, { posts: number; views: number }>
  );

  // Calculate trends
  const trends: ContentTrend[] = Object.entries(currentTopics).map(([topic, current]) => {
    const previous = previousTopics[topic] || { posts: 0, views: 0 };
    const growth =
      previous.views > 0 ? ((current.views - previous.views) / previous.views) * 100 : 100;

    return {
      topic,
      posts: current.posts,
      views: current.views,
      growth,
      trending: growth > 50 || (current.posts > 3 && growth > 20),
    };
  });

  return trends.sort((a, b) => b.growth - a.growth).slice(0, 20);
}

/**
 * Calculate engagement score (0-100)
 */
function calculateEngagementScore(metrics: {
  views: number;
  uniqueViews: number;
  reactions: number;
  comments: number;
  completionRate: number;
  avgReadTime: number;
}): number {
  // Weights for different factors
  const weights = {
    reactionRate: 30,
    commentRate: 25,
    completionRate: 25,
    readTimeBonus: 20,
  };

  const reactionRate =
    metrics.uniqueViews > 0 ? Math.min(metrics.reactions / metrics.uniqueViews, 1) : 0;

  const commentRate =
    metrics.uniqueViews > 0 ? Math.min(metrics.comments / metrics.uniqueViews, 0.5) * 2 : 0;

  const completionScore = metrics.completionRate / 100;

  // Bonus for good read time (assuming 3-10 minutes is ideal)
  const idealReadTime = 5 * 60; // 5 minutes
  const readTimeScore = Math.min(1, metrics.avgReadTime / idealReadTime);

  const score =
    reactionRate * weights.reactionRate +
    commentRate * weights.commentRate +
    completionScore * weights.completionRate +
    readTimeScore * weights.readTimeBonus;

  return Math.round(Math.min(100, score));
}
