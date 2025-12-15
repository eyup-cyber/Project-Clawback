import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  success,
  handleApiError,
  parseBody,
  postStatusSchema,
  requirePostOwnership,
  requireEditor,
  rateLimitByUser,
  ApiError,
} from '@/lib/api';
import { updatePostStatus, getPostById } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateStatusSchema = z.object({
  status: postStatusSchema,
  scheduled_for: z.string().datetime().optional(),
  rejection_reason: z.string().max(500).optional(),
});

// ============================================================================
// PUT /api/posts/[id]/status - Update post status
// ============================================================================
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await parseBody(request, updateStatusSchema);

    // Get current post
    const currentPost = await getPostById(id);

    // Determine permissions based on requested status change
    if (body.status === 'published') {
      // Publishing requires editor/admin OR the author can submit for review
      const { user } = await requirePostOwnership(id);

      if (!['editor', 'admin'].includes(user.role)) {
        // Contributors can only submit for review, not publish directly
        if (currentPost.status === 'draft') {
          // Change to pending instead of published
          const post = await updatePostStatus(id, 'pending');
          return success({
            ...post,
            message: 'Post submitted for review',
          });
        }
        throw ApiError.forbidden('Only editors and admins can publish posts');
      }
    } else if (body.status === 'rejected') {
      // Only editors/admins can reject
      await requireEditor();
    } else if (body.status === 'pending') {
      // Authors can submit for review
      const { user } = await requirePostOwnership(id);
      rateLimitByUser(user.id, { maxRequests: 20, windowMs: 60000 });
    } else {
      // Other status changes require ownership
      const { user } = await requirePostOwnership(id);
      rateLimitByUser(user.id, { maxRequests: 20, windowMs: 60000 });
    }

    const post = await updatePostStatus(id, body.status, {
      scheduled_for: body.scheduled_for,
      rejection_reason: body.rejection_reason,
    });

    return success(post);
  } catch (err) {
    return handleApiError(err);
  }
}






