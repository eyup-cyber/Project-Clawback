import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { success, handleApiError, parseParams, rateLimitByIp } from '@/lib/api';
import { isUsernameAvailable } from '@/lib/db';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { applySecurityHeaders } from '@/lib/security/headers';

const checkUsernameSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
});

// ============================================================================
// GET /api/users/check-username - Check if username is available
// ============================================================================
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    createContext(requestId, 'GET', '/api/users/check-username', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Rate limit to prevent enumeration
    await rateLimitByIp(request, { maxRequests: 30, windowMs: 60000 });

    const { searchParams } = new URL(request.url);
    const { username } = parseParams(searchParams, checkUsernameSchema);

    logger.info(
      'Checking username availability',
      { method: 'GET', path: '/api/users/check-username', username },
      requestId
    );

    const available = await isUsernameAvailable(username);

    const duration = Date.now() - startTime;
    logger.performance('checkUsername', duration, { username, available }, requestId);

    const response = success({ available, username: username.toLowerCase() });
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}
