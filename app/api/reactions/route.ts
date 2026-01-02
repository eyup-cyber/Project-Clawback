export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import {
  success,
  handleApiError,
  parseBody,
  toggleReactionSchema,
  requireAuth,
  getAuthUser,
} from '@/lib/api';
import { togglePostReaction, getPostReactionSummary } from '@/lib/db';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { applySecurityHeaders } from '@/lib/security/headers';
import { assertCsrfOrThrow } from '@/lib/security/csrf';
import { z } from 'zod';

const _getReactionsSchema = z.object({
  post_id: z.string().uuid(),
});

// ============================================================================
// GET /api/reactions - Get reaction summary for a post
// ============================================================================
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    createContext(requestId, 'GET', '/api/reactions', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    });

    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      throw new Error('post_id is required');
    }

    logger.info(
      'Fetching reaction summary',
      { method: 'GET', path: '/api/reactions', postId: post_id },
      requestId
    );

    // Check if user is logged in for personalized response
    const { user } = await getAuthUser();

    const summary = await getPostReactionSummary(post_id, user?.id);

    const duration = Date.now() - startTime;
    logger.performance('getPostReactionSummary', duration, { postId: post_id }, requestId);

    const response = success(summary);
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}

// ============================================================================
// POST /api/reactions - Toggle a reaction on a post
// ============================================================================
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // CSRF protection
    await assertCsrfOrThrow(request);

    const { user } = await requireAuth();

    createContext(requestId, 'POST', '/api/reactions', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userId: user.id,
    });

    logger.info(
      'Toggling reaction',
      { method: 'POST', path: '/api/reactions', userId: user.id },
      requestId
    );

    const body = await parseBody(request, toggleReactionSchema);

    const result = await togglePostReaction(body.post_id, user.id, body.type);

    // Get updated summary
    const summary = await getPostReactionSummary(body.post_id, user.id);

    const duration = Date.now() - startTime;
    logger.performance(
      'togglePostReaction',
      duration,
      { postId: body.post_id, action: result.action },
      requestId
    );
    logger.info('Reaction toggled', { postId: body.post_id, action: result.action }, requestId);

    const response = success({
      action: result.action,
      userReaction: result.type,
      counts: summary.counts,
    });
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}
