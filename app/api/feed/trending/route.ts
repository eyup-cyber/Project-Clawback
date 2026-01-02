export const runtime = 'edge';

/**
 * Trending Feed API
 * Phase 1.1.1: GET /api/feed/trending - Get trending posts
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getTrendingPosts } from '@/lib/feed/algorithm';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

    const posts = await getTrendingPosts(limit);

    return NextResponse.json(posts, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    logger.error('Trending feed error', { error });
    return NextResponse.json({ error: 'Failed to load trending posts' }, { status: 500 });
  }
}
