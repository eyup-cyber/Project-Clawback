export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { success, handleApiError, parseBody, moderatePostSchema, requireEditor } from '@/lib/api';
import { updatePostStatus, toggleFeatured } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// POST /api/admin/posts/[id]/moderate - Moderate a post
// ============================================================================
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireEditor();

    const body = await parseBody(request, moderatePostSchema.omit({ post_id: true }));

    let post;

    switch (body.action) {
      case 'approve':
        post = await updatePostStatus(id, 'published');
        break;

      case 'reject':
        post = await updatePostStatus(id, 'rejected', {
          rejection_reason: body.reason,
        });
        break;

      case 'feature':
        post = await toggleFeatured(id);
        if (!post.is_featured) {
          // If we wanted to feature but it got unfeatured, feature it again
          post = await toggleFeatured(id);
        }
        break;

      case 'unfeature':
        post = await toggleFeatured(id);
        if (post.is_featured) {
          // If we wanted to unfeature but it got featured, unfeature it again
          post = await toggleFeatured(id);
        }
        break;

      case 'archive':
        post = await updatePostStatus(id, 'archived');
        break;

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

    return success({
      post,
      message: `Post ${body.action}d successfully`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
