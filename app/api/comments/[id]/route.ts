import { type NextRequest } from 'next/server';
import {
  success,
  noContent,
  handleApiError,
  parseBody,
  updateCommentSchema,
  requireCommentOwnership,
} from '@/lib/api';
import { getCommentById, updateComment, deleteComment } from '@/lib/db';
import { assertCsrfOrThrow } from '@/lib/security/csrf';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/comments/[id] - Get a single comment
// ============================================================================
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const comment = await getCommentById(id);

    return success(comment);
  } catch (err) {
    return handleApiError(err);
  }
}

// ============================================================================
// PUT /api/comments/[id] - Update a comment
// ============================================================================
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // CSRF protection
    await assertCsrfOrThrow(request);

    const { id } = await context.params;

    // Check ownership
    await requireCommentOwnership(id);

    const body = await parseBody(request, updateCommentSchema.omit({ id: true }));

    const comment = await updateComment(id, body.content);

    return success(comment);
  } catch (err) {
    return handleApiError(err);
  }
}

// ============================================================================
// DELETE /api/comments/[id] - Delete a comment
// ============================================================================
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // CSRF protection
    await assertCsrfOrThrow(request);

    const { id } = await context.params;

    // Check ownership
    await requireCommentOwnership(id);

    await deleteComment(id);

    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}
