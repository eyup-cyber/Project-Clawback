import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { paginated, handleApiError, parseParams, requireAdmin } from '@/lib/api';
import { listUsers } from '@/lib/db';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { applySecurityHeaders } from '@/lib/security/headers';

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
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { user } = await requireAdmin();

    createContext(requestId, 'GET', '/api/users', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      userId: user.id,
    });

    logger.info(
      'Fetching users list',
      { method: 'GET', path: '/api/users', userId: user.id },
      requestId
    );

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, listUsersSchema);

    const { users, total } = await listUsers(params);

    const duration = Date.now() - startTime;
    logger.performance('listUsers', duration, { count: users.length, total }, requestId);

    const response = paginated(users, {
      page: params.page,
      limit: params.limit,
      total,
    });

    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}
