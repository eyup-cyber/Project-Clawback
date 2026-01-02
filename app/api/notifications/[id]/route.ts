export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { success, noContent, handleApiError, requireAuth } from '@/lib/api';
import { markNotificationsRead, deleteNotification } from '@/lib/db/notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// PUT /api/notifications/[id] - Mark a notification as read
// ============================================================================
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await requireAuth();
    const { id } = await context.params;

    await markNotificationsRead(user.id, [id]);

    return success({ message: 'Notification marked as read' });
  } catch (err) {
    return handleApiError(err);
  }
}

// ============================================================================
// DELETE /api/notifications/[id] - Delete a notification
// ============================================================================
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await requireAuth();
    const { id } = await context.params;

    await deleteNotification(user.id, id);

    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}
