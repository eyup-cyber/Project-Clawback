import { type NextRequest } from 'next/server';
import { success, handleApiError } from '@/lib/api';
import { getProfileByUsername, getPublicProfile, getPostsByAuthor } from '@/lib/db';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { applySecurityHeaders } from '@/lib/security/headers';

interface RouteContext {
  params: Promise<{ username: string }>;
}

// ============================================================================
// GET /api/users/[username] - Get public profile by username
// ============================================================================
export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { username } = await context.params;

    createContext(requestId, 'GET', `/api/users/${username}`, {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    logger.info(
      'Fetching user public profile',
      { method: 'GET', path: `/api/users/${username}`, username },
      requestId
    );

    // Get the profile
    const profile = await getProfileByUsername(username);

    // Get public version only
    const publicProfile = await getPublicProfile(profile.id);

    // Get recent published posts
    const { posts: recentPosts } = await getPostsByAuthor(profile.id, {
      status: 'published',
      limit: 5,
    });

    const duration = Date.now() - startTime;
    logger.performance('getPublicProfile', duration, { username }, requestId);

    const response = success({
      ...publicProfile,
      recentPosts,
    });

    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}
