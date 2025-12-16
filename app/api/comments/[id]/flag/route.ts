import { type NextRequest } from 'next/server';
import {
  success,
  handleApiError,
  parseBody,
  flagCommentSchema,
  requireAuth,
  rateLimitByUser,
} from '@/lib/api';
import { flagComment } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// POST /api/comments/[id]/flag - Flag a comment for moderation
// ============================================================================
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user } = await requireAuth();

    // Rate limit flagging
    rateLimitByUser(user.id, { maxRequests: 10, windowMs: 3600000 }); // 10 per hour

    const body = await parseBody(request, flagCommentSchema.omit({ comment_id: true }));

    await flagComment(id, user.id, body.reason, body.details);

    return success({ message: 'Comment flagged for review' });
  } catch (err) {
    return handleApiError(err);
  }
}






