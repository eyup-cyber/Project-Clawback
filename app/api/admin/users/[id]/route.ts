import { NextRequest } from 'next/server';
import {
  success,
  handleApiError,
  parseBody,
  updateUserRoleSchema,
  requireAdmin,
  ApiError,
} from '@/lib/api';
import { getProfileById, updateUserRole, toggleFeaturedContributor } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/admin/users/[id] - Get a single user (admin only)
// ============================================================================
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();

    const { id } = await context.params;
    const profile = await getProfileById(id);

    return success(profile);
  } catch (err) {
    return handleApiError(err);
  }
}

// ============================================================================
// PUT /api/admin/users/[id] - Update user role (admin only)
// ============================================================================
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { user: adminUser } = await requireAdmin();
    const { id } = await context.params;

    // Prevent self-demotion
    if (id === adminUser.id) {
      throw ApiError.forbidden('You cannot modify your own role');
    }

    const body = await parseBody(request, updateUserRoleSchema.omit({ user_id: true }));

    const profile = await updateUserRole(id, body.role);

    return success({
      profile,
      message: `User role updated to ${body.role}`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}






