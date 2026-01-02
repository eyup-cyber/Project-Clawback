export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, unauthorized, notFound, handleApiError } from '@/lib/api';
import { revokeSession } from '@/lib/security/session';
import { applySecurityHeaders } from '@/lib/security/headers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/auth/sessions/[id]
 * Revoke a specific session
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(unauthorized('Authentication required'));
    }

    const revoked = await revokeSession(sessionId, user.id);

    if (!revoked) {
      return applySecurityHeaders(notFound('Session not found'));
    }

    return applySecurityHeaders(
      success({
        revoked: true,
        message: 'Session has been revoked',
      })
    );
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}
