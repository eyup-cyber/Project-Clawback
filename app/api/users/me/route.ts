import { NextRequest } from 'next/server';
import {
  success,
  handleApiError,
  parseBody,
  updateProfileSchema,
  requireAuth,
  rateLimitByUser,
} from '@/lib/api';
import { getProfileById, updateProfile, getUserStats } from '@/lib/db';

// ============================================================================
// GET /api/users/me - Get current user's profile
// ============================================================================
export async function GET() {
  try {
    const { user } = await requireAuth();

    const profile = await getProfileById(user.id);
    const stats = await getUserStats(user.id);

    return success({
      ...profile,
      stats,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// ============================================================================
// PUT /api/users/me - Update current user's profile
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    // Rate limit profile updates
    rateLimitByUser(user.id, { maxRequests: 10, windowMs: 60000 });

    const body = await parseBody(request, updateProfileSchema);

    const profile = await updateProfile(user.id, body);

    return success(profile);
  } catch (err) {
    return handleApiError(err);
  }
}






