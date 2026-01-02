export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { paginated, handleApiError, parseParams, requireEditor } from '@/lib/api';
import { getPendingPosts } from '@/lib/db';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ============================================================================
// GET /api/admin/posts/pending - Get posts awaiting review
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    await requireEditor();

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, querySchema);

    const { posts, total } = await getPendingPosts(params);

    return paginated(posts, {
      page: params.page,
      limit: params.limit,
      total,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
