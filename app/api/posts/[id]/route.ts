import { NextRequest } from 'next/server';
import {
  success,
  noContent,
  handleApiError,
  parseBody,
  updatePostSchema,
  requirePostOwnership,
  rateLimitByUser,
} from '@/lib/api';
import { getPostById, updatePost, deletePost, incrementViewCount } from '@/lib/db';
import { logger } from '@/lib/logger';
import { withRouteHandler } from '@/lib/api/route-wrapper';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/posts/[id] - Get a single post by ID
// ============================================================================
const getHandler = async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const post = await getPostById(id);

    // Track view (get IP from request)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    // Don't await - fire and forget for performance
    incrementViewCount(id, undefined, ip).catch((err) =>
      logger.error('incrementViewCount failed', err, { postId: id, ip })
    );

    return success(post);
  } catch (err) {
    return handleApiError(err);
  }
};

// ============================================================================
// PUT /api/posts/[id] - Update a post
// ============================================================================
const putHandler = async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;

    // Check ownership
    const { user } = await requirePostOwnership(id);

    // Rate limit
    rateLimitByUser(user.id, { maxRequests: 30, windowMs: 60000 });

    // Parse and validate body
    const body = await parseBody(request, updatePostSchema.omit({ id: true }));

    // Update the post
    const post = await updatePost(id, body);

    return success(post);
  } catch (err) {
    return handleApiError(err);
  }
};

// ============================================================================
// DELETE /api/posts/[id] - Delete a post (soft delete)
// ============================================================================
const deleteHandler = async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;

    // Check ownership
    const { user } = await requirePostOwnership(id);

    // Rate limit
    rateLimitByUser(user.id, { maxRequests: 10, windowMs: 60000 });

    await deletePost(id);

    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
};

export const GET = withRouteHandler(getHandler, { logRequest: true });
export const PUT = withRouteHandler(putHandler, {
  logRequest: true,
  csrf: true,
});
export const DELETE = withRouteHandler(deleteHandler, {
  logRequest: true,
  csrf: true,
});
