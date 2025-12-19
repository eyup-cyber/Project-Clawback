import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, unauthorized, handleApiError } from '@/lib/api';
import { getUserSessions, revokeAllSessions } from '@/lib/security/session';
import { applySecurityHeaders } from '@/lib/security/headers';

/**
 * GET /api/auth/sessions
 * List all active sessions for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(unauthorized('Authentication required'));
    }

    const sessions = await getUserSessions(user.id);

    // Format sessions for response
    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      device: {
        type: session.deviceType,
        browser: session.browser,
        os: session.os,
      },
      ipAddress: session.ipAddress,
      location: session.location,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      // Mark current session (would need session ID from cookie/token)
      isCurrent: false,
    }));

    return applySecurityHeaders(success({
      sessions: formattedSessions,
      count: formattedSessions.length,
    }));
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}

/**
 * DELETE /api/auth/sessions
 * Revoke all sessions except current
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(unauthorized('Authentication required'));
    }

    // Get current session ID from request if available
    const currentSessionId = request.headers.get('x-session-id') || undefined;

    const revokedCount = await revokeAllSessions(user.id, currentSessionId);

    return applySecurityHeaders(success({
      revoked: revokedCount,
      message: `Revoked ${revokedCount} session(s)`,
    }));
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}
