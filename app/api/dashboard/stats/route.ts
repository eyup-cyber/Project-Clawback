export const runtime = 'edge';

/**
 * Dashboard Stats API
 * Phase 1.2.1: Contributor dashboard statistics
 * Phase 2.1: Optimized with database-level aggregation
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface DashboardStats {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  scheduled_posts: number;
  total_views: number;
  total_comments: number;
  total_likes: number;
  followers: number;
  current_period_views: number;
  previous_period_views: number;
  current_period_comments: number;
  previous_period_comments: number;
  current_period_likes: number;
  previous_period_likes: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    // Use optimized database function for all stats in a single query
    const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats', {
      p_user_id: user.id,
      p_period_days: periodDays,
    });

    if (statsError) {
      // Fallback to legacy query if function doesn't exist
      logger.warn('Dashboard stats function not available, using fallback', { error: statsError });
      return await getLegacyStats(supabase, user.id, periodDays);
    }

    const dbStats = (statsData as DashboardStats[])?.[0];

    if (!dbStats) {
      // Return empty stats if no data
      return NextResponse.json(
        {
          totalPosts: 0,
          publishedPosts: 0,
          draftPosts: 0,
          scheduledPosts: 0,
          totalViews: 0,
          totalComments: 0,
          totalLikes: 0,
          followers: 0,
          viewsChange: 0,
          commentsChange: 0,
          likesChange: 0,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          },
        }
      );
    }

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const stats = {
      totalPosts: dbStats.total_posts,
      publishedPosts: dbStats.published_posts,
      draftPosts: dbStats.draft_posts,
      scheduledPosts: dbStats.scheduled_posts,
      totalViews: dbStats.total_views,
      totalComments: dbStats.total_comments,
      totalLikes: dbStats.total_likes,
      followers: dbStats.followers,
      viewsChange: calculateChange(dbStats.current_period_views, dbStats.previous_period_views),
      commentsChange: calculateChange(
        dbStats.current_period_comments,
        dbStats.previous_period_comments
      ),
      likesChange: calculateChange(dbStats.current_period_likes, dbStats.previous_period_likes),
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    logger.error('Dashboard stats error', { error });
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}

/**
 * Legacy stats fetching (fallback if database function not available)
 */
async function getLegacyStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  periodDays: number
) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - periodDays);

  const previousStart = new Date(startDate);
  previousStart.setDate(previousStart.getDate() - periodDays);

  // Fetch user's posts
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, status, view_count, created_at')
    .eq('author_id', userId);

  if (postsError) {
    logger.error('Failed to fetch posts', { error: postsError });
    throw postsError;
  }

  const postIds = posts?.map((p) => p.id) || [];

  // Fetch engagement data for user's posts with date filtering at database level
  const [
    commentsResult,
    currentCommentsResult,
    previousCommentsResult,
    likesResult,
    currentLikesResult,
    previousLikesResult,
    followersResult,
  ] = await Promise.all([
    // Total comments
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000']),
    // Current period comments
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', startDate.toISOString()),
    // Previous period comments
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', startDate.toISOString()),
    // Total likes
    supabase
      .from('reactions')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000']),
    // Current period likes
    supabase
      .from('reactions')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', startDate.toISOString()),
    // Previous period likes
    supabase
      .from('reactions')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', startDate.toISOString()),
    // Followers
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId)
      .eq('following_type', 'user'),
  ]);

  // Calculate stats
  const totalPosts = posts?.length || 0;
  const publishedPosts = posts?.filter((p) => p.status === 'published').length || 0;
  const draftPosts = posts?.filter((p) => p.status === 'draft').length || 0;
  const scheduledPosts = posts?.filter((p) => p.status === 'scheduled').length || 0;
  const totalViews = posts?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
  const totalComments = commentsResult.count || 0;
  const totalLikes = likesResult.count || 0;
  const followers = followersResult.count || 0;

  const currentPeriodComments = currentCommentsResult.count || 0;
  const previousPeriodComments = previousCommentsResult.count || 0;
  const currentPeriodLikes = currentLikesResult.count || 0;
  const previousPeriodLikes = previousLikesResult.count || 0;

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const stats = {
    totalPosts,
    publishedPosts,
    draftPosts,
    scheduledPosts,
    totalViews,
    totalComments,
    totalLikes,
    followers,
    viewsChange: 0, // Would need view history tracking
    commentsChange: calculateChange(currentPeriodComments, previousPeriodComments),
    likesChange: calculateChange(currentPeriodLikes, previousPeriodLikes),
  };

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  });
}
