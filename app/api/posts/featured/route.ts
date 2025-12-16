import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { success, handleApiError, parseParams } from '@/lib/api';
import { getFeaturedPosts } from '@/lib/db';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

// ============================================================================
// GET /api/posts/featured - Get featured posts
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit } = parseParams(searchParams, querySchema);

    const posts = await getFeaturedPosts(limit);

    return success(posts);
  } catch (err) {
    return handleApiError(err);
  }
}






