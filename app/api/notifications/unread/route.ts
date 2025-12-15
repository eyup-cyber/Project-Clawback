import { success, handleApiError, requireAuth } from '@/lib/api';
import { getUnreadCount } from '@/lib/db/notifications';

// ============================================================================
// GET /api/notifications/unread - Get unread notification count
// ============================================================================
export async function GET() {
  try {
    const { user } = await requireAuth();

    const count = await getUnreadCount(user.id);

    return success({ count });
  } catch (err) {
    return handleApiError(err);
  }
}






