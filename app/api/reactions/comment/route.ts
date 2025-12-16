import { type NextRequest } from 'next/server';
import {
  success,
  handleApiError,
  parseBody,
  toggleCommentReactionSchema,
  requireAuth,
  getAuthUser,
  rateLimitByUser,
} from '@/lib/api';
import { toggleCommentReaction, getCommentReactionSummary } from '@/lib/db';

// ============================================================================
// GET /api/reactions/comment - Get reaction summary for a comment
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const comment_id = searchParams.get('comment_id');

    if (!comment_id) {
      throw new Error('comment_id is required');
    }

    const { user } = await getAuthUser();

    const summary = await getCommentReactionSummary(comment_id, user?.id);

    return success(summary);
  } catch (err) {
    return handleApiError(err);
  }
}

// ============================================================================
// POST /api/reactions/comment - Toggle a reaction on a comment
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    // Rate limit: 60 reactions per minute
    rateLimitByUser(user.id, { maxRequests: 60, windowMs: 60000 });

    const body = await parseBody(request, toggleCommentReactionSchema);

    const result = await toggleCommentReaction(body.comment_id, user.id, body.type);

    // Get updated summary
    const summary = await getCommentReactionSummary(body.comment_id, user.id);

    return success({
      action: result.action,
      userReaction: result.type,
      counts: summary.counts,
    });
  } catch (err) {
    return handleApiError(err);
  }
}






