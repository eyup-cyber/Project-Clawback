export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import {
  success,
  handleApiError,
  parseBody,
  updateProfileSchema,
  requireAuth,
  rateLimitByUser,
} from '@/lib/api';
import { getProfileById, updateProfile, getUserStats } from '@/lib/db';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { applySecurityHeaders } from '@/lib/security/headers';

// ============================================================================
// GET /api/users/me - Get current user's profile
// ============================================================================
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { user } = await requireAuth();

    createContext(requestId, 'GET', '/api/users/me', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      userId: user.id,
    });

    logger.info(
      'Fetching current user profile',
      { method: 'GET', path: '/api/users/me', userId: user.id },
      requestId
    );

    const profile = await getProfileById(user.id);
    const stats = await getUserStats(user.id);

    const duration = Date.now() - startTime;
    logger.performance('getProfile', duration, { userId: user.id }, requestId);

    const response = success({
      ...profile,
      stats,
    });

    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}

// ============================================================================
// PUT /api/users/me - Update current user's profile
// ============================================================================
export async function PUT(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { user } = await requireAuth();

    createContext(requestId, 'PUT', '/api/users/me', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      userId: user.id,
    });

    logger.info(
      'Updating user profile',
      { method: 'PUT', path: '/api/users/me', userId: user.id },
      requestId
    );

    // Rate limit profile updates
    await rateLimitByUser(user.id, { maxRequests: 10, windowMs: 60000 });

    const body = await parseBody(request, updateProfileSchema);

    const profile = await updateProfile(user.id, body);

    const duration = Date.now() - startTime;
    logger.performance('updateProfile', duration, { userId: user.id }, requestId);
    logger.info('Profile updated successfully', { userId: user.id }, requestId);

    const response = success(profile);
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}
