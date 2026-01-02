export const runtime = 'edge';

/**
 * Personalized Feed API
 * Phase 1.1.1: GET /api/feed/personalized - Personalized feed for logged-in users
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFeedPosts } from '@/lib/feed/algorithm';
import { logger } from '@/lib/logger';

// Rate limiting: 100 requests per minute per user
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000; // 1 minute
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

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

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const excludeRead = searchParams.get('exclude_read') === 'true';
    const category = searchParams.get('category') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const author = searchParams.get('author') || undefined;

    // Get personalized feed
    const feedResult = await getFeedPosts({
      userId: user.id,
      page,
      limit,
      excludeRead,
      category,
      tag,
      author,
    });

    // Log feed request for analytics
    logger.info('Feed request', {
      userId: user.id,
      page,
      limit,
      excludeRead,
      category,
      tag,
      author,
      resultCount: feedResult.posts.length,
    });

    return NextResponse.json(feedResult, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    logger.error('Feed error', { error });
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 });
  }
}
