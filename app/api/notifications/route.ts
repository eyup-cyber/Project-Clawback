export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { success, handleApiError, parseParams, parseBody, requireAuth } from '@/lib/api';
import {
  getNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  deleteAllNotifications,
} from '@/lib/db/notifications';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unread_only: z.coerce.boolean().default(false),
});

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  all: z.boolean().optional(),
});

// ============================================================================
// GET /api/notifications - Get user's notifications
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, querySchema);

    const result = await getNotifications({
      userId: user.id,
      page: params.page,
      limit: params.limit,
      unreadOnly: params.unread_only,
    });

    return success({
      notifications: result.notifications,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / params.limit),
      },
      unreadCount: result.unreadCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// ============================================================================
// PUT /api/notifications - Mark notifications as read
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const body = await parseBody(request, markReadSchema);

    let count: number;

    if (body.all) {
      count = await markAllNotificationsRead(user.id);
    } else if (body.ids && body.ids.length > 0) {
      count = await markNotificationsRead(user.id, body.ids);
    } else {
      count = 0;
    }

    return success({
      message: `${count} notification(s) marked as read`,
      count,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// ============================================================================
// DELETE /api/notifications - Delete all notifications
// ============================================================================
export async function DELETE() {
  try {
    const { user } = await requireAuth();

    await deleteAllNotifications(user.id);

    return success({ message: 'All notifications deleted' });
  } catch (err) {
    return handleApiError(err);
  }
}
