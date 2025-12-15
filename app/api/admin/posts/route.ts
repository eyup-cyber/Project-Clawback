import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  success,
  paginated,
  handleApiError,
  parseParams,
  requireEditor,
} from '@/lib/api';
import { listPosts, getPendingPosts } from '@/lib/db';

const listAdminPostsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'pending', 'scheduled', 'published', 'archived', 'rejected']).optional(),
  content_type: z.enum(['written', 'video', 'audio', 'visual']).optional(),
  search: z.string().max(200).optional(),
});

// ============================================================================
// GET /api/admin/posts - List all posts (editor/admin only)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    await requireEditor();

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, listAdminPostsSchema);

    const { posts, total } = await listPosts({
      filters: {
        status: params.status,
        content_type: params.content_type,
        search: params.search,
      },
      sort: {
        field: 'created_at',
        order: 'desc',
      },
      page: params.page,
      limit: params.limit,
    });

    return paginated(posts, {
      page: params.page,
      limit: params.limit,
      total,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

