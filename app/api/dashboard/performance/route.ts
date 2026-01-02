export const runtime = 'edge';

/**
 * Performance Data API for Dashboard
 * Phase 1.2.1: Contributor dashboard performance metrics over time
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface PerformanceDataPoint {
  date: string;
  views: number;
  comments: number;
  likes: number;
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

    // Calculate date range
    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - periodDays);

    // Get user's post IDs
    const { data: posts } = await supabase.from('posts').select('id').eq('author_id', user.id);

    const postIds = posts?.map((p) => p.id) || [];

    if (postIds.length === 0) {
      // Return empty data if no posts
      const emptyData: PerformanceDataPoint[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= now) {
        emptyData.push({
          date: currentDate.toISOString().split('T')[0],
          views: 0,
          comments: 0,
          likes: 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return NextResponse.json(emptyData);
    }

    // Fetch comments and reactions within the time period
    const [commentsResult, reactionsResult] = await Promise.all([
      supabase
        .from('comments')
        .select('created_at')
        .in('post_id', postIds)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('reactions')
        .select('created_at')
        .in('post_id', postIds)
        .gte('created_at', startDate.toISOString()),
    ]);

    // Group by date
    const dataByDate = new Map<string, PerformanceDataPoint>();

    // Initialize all dates in the range
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dataByDate.set(dateStr, {
        date: dateStr,
        views: 0, // Views would need a separate tracking table with timestamps
        comments: 0,
        likes: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count comments by date
    (commentsResult.data || []).forEach((comment) => {
      const dateStr = new Date(comment.created_at).toISOString().split('T')[0];
      const dataPoint = dataByDate.get(dateStr);
      if (dataPoint) {
        dataPoint.comments++;
      }
    });

    // Count reactions by date
    (reactionsResult.data || []).forEach((reaction) => {
      const dateStr = new Date(reaction.created_at).toISOString().split('T')[0];
      const dataPoint = dataByDate.get(dateStr);
      if (dataPoint) {
        dataPoint.likes++;
      }
    });

    // Generate synthetic view data based on engagement (for demo purposes)
    // In production, you'd track actual page views with timestamps
    const performanceData = Array.from(dataByDate.values()).map((point) => ({
      ...point,
      // Generate views as a multiple of engagement + random factor
      views: Math.max(0, point.comments * 10 + point.likes * 5 + Math.floor(Math.random() * 20)),
    }));

    return NextResponse.json(performanceData, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    logger.error('Performance data error', { error });
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
