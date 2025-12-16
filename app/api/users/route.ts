import { type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  paginated,
  handleApiError,
  parseParams,
  requireAdmin,
} from '@/lib/api';
import { listUsers } from '@/lib/db';

const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['reader', 'contributor', 'editor', 'admin', 'superadmin']).optional(),
  search: z.string().max(100).optional(),
});

// ============================================================================
// GET /api/users - List all users (admin only)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, listUsersSchema);

    const { users, total } = await listUsers(params);

    return paginated(users, {
      page: params.page,
      limit: params.limit,
      total,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

