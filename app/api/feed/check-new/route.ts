export const runtime = 'edge';

/**
 * Check New Posts API
 * Phase 1.1.1: GET /api/feed/check-new - Check for new posts since timestamp
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    if (!since) {
      return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 });
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Count new posts from followed authors/categories
    const [{ data: followedAuthors }, { data: followedCategories }] = await Promise.all([
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('following_type', 'user'),
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('following_type', 'category'),
    ]);

    const authorIds = (followedAuthors || []).map((f) => f.following_id);
    const categoryIds = (followedCategories || []).map((f) => f.following_id);

    // Count new posts
    let query = supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gt('published_at', sinceDate.toISOString());

    // Filter by followed entities if user follows anyone
    if (authorIds.length > 0 || categoryIds.length > 0) {
      const conditions = [];
      if (authorIds.length > 0) {
        conditions.push(`author_id.in.(${authorIds.join(',')})`);
      }
      if (categoryIds.length > 0) {
        conditions.push(`category_id.in.(${categoryIds.join(',')})`);
      }
      query = query.or(conditions.join(','));
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    const newCount = count || 0;

    return NextResponse.json(
      {
        hasNew: newCount > 0,
        count: newCount,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30',
        },
      }
    );
  } catch (error) {
    logger.error('Check new posts error', { error });
    return NextResponse.json({ error: 'Failed to check new posts' }, { status: 500 });
  }
}
