export const runtime = 'edge';

/**
 * Recent Posts API for Dashboard
 * Phase 1.2.1: Contributor dashboard recent posts
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '5', 10)));

    // Fetch recent posts for the user
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(
        `
        id,
        title,
        slug,
        status,
        views,
        published_at,
        created_at
      `
      )
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (postsError) {
      logger.error('Failed to fetch recent posts', { error: postsError });
      throw postsError;
    }

    // Get comment counts for each post
    const postIds = posts?.map((p) => p.id) || [];

    let commentCounts: Record<string, number> = {};
    if (postIds.length > 0) {
      const { data: comments } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);

      commentCounts = (comments || []).reduce(
        (acc, c) => {
          acc[c.post_id] = (acc[c.post_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }

    const recentPosts = (posts || []).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      views: post.views || 0,
      comments: commentCounts[post.id] || 0,
      publishedAt: post.published_at,
      createdAt: post.created_at,
    }));

    return NextResponse.json(recentPosts, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    logger.error('Recent posts error', { error });
    return NextResponse.json({ error: 'Failed to fetch recent posts' }, { status: 500 });
  }
}
