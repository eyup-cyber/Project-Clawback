export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, unauthorized, badRequest, handleApiError, parseBody } from '@/lib/api';
import { verifyToken, decryptSecret } from '@/lib/security/totp';
import { applySecurityHeaders } from '@/lib/security/headers';
import { z } from 'zod';

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';

const disableSchema = z.object({
  code: z.string().min(6).max(6), // TOTP code required to disable
  password: z.string().min(1).optional(), // Optional password confirmation
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for the authenticated user
 * Requires current TOTP code for verification
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(unauthorized('Authentication required'));
    }

    // Parse and validate request body
    const body = await parseBody(request, disableSchema);

    // Get user's 2FA data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('totp_secret, totp_enabled, username, display_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return applySecurityHeaders(handleApiError(profileError));
    }

    if (!profile.totp_enabled) {
      return applySecurityHeaders(badRequest('2FA is not currently enabled'));
    }

    if (!profile.totp_secret) {
      return applySecurityHeaders(badRequest('2FA configuration is invalid'));
    }

    // Decrypt and verify the TOTP code
    const secret = decryptSecret(profile.totp_secret, ENCRYPTION_KEY);
    const username = profile.display_name || profile.username || user.email || 'user';

    const isValid = verifyToken(body.code, secret, username);

    if (!isValid) {
      return applySecurityHeaders(badRequest('Invalid verification code'));
    }

    // Disable 2FA - clear all 2FA data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        totp_secret: null,
        totp_enabled: false,
        backup_codes: null,
        totp_verified_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      return applySecurityHeaders(handleApiError(updateError));
    }

    // Clear any pending 2FA challenges
    await supabase.from('two_factor_challenges').delete().eq('user_id', user.id);

    return applySecurityHeaders(
      success({
        disabled: true,
        message: '2FA has been successfully disabled',
      })
    );
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}
