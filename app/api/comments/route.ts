import { NextRequest } from 'next/server';
import {
  success,
  paginated,
  handleApiError,
  parseBody,
  parseParams,
  createCommentSchema,
  listCommentsSchema,
  requireAuth,
} from '@/lib/api';
import { createComment, listComments, getCommentsWithReplies } from '@/lib/db';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { applySecurityHeaders } from '@/lib/security/headers';
import { assertCsrfOrThrow } from '@/lib/security/csrf';

// ============================================================================
// GET /api/comments - List comments for a post
// ============================================================================
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    createContext(requestId, 'GET', '/api/comments', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    });

    logger.info('Fetching comments', { method: 'GET', path: '/api/comments' }, requestId);

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, listCommentsSchema);

    // Check if we want nested replies
    const withReplies = searchParams.get('with_replies') === 'true';

    let comments, total;

    if (withReplies && !params.parent_id) {
      // Get comments with their replies
      const result = await getCommentsWithReplies({
        post_id: params.post_id,
        page: params.page,
        limit: params.limit,
      });
      comments = result.comments;
      total = result.total;
    } else {
      const result = await listComments({
        post_id: params.post_id,
        parent_id: params.parent_id,
        page: params.page,
        limit: params.limit,
        sort: params.sort,
        order: params.order,
      });
      comments = result.comments;
      total = result.total;
    }

    const duration = Date.now() - startTime;
    logger.performance('listComments', duration, { count: comments.length, total }, requestId);

    const response = paginated(comments, {
      page: params.page,
      limit: params.limit,
      total,
    });

    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}

// ============================================================================
// POST /api/comments - Create a new comment
// ============================================================================
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // CSRF protection
    await assertCsrfOrThrow(request);

    const { user } = await requireAuth();

    createContext(requestId, 'POST', '/api/comments', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userId: user.id,
    });

    logger.info(
      'Creating comment',
      { method: 'POST', path: '/api/comments', userId: user.id },
      requestId
    );

    const body = await parseBody(request, createCommentSchema);

    const comment = await createComment({
      ...body,
      author_id: user.id,
    });

    const duration = Date.now() - startTime;
    logger.performance('createComment', duration, { commentId: comment.id }, requestId);
    logger.info('Comment created', { commentId: comment.id }, requestId);

    const response = success(comment, 201);
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}
