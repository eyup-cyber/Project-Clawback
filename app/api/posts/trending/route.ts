import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { success, handleApiError, parseParams } from '@/lib/api';
import { getTrendingPosts } from '@/lib/db';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ============================================================================
// GET /api/posts/trending - Get trending posts
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit } = parseParams(searchParams, querySchema);

    const posts = await getTrendingPosts(limit);

    return success(posts);
  } catch (err) {
    return handleApiError(err);
  }
}






