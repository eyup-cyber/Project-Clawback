export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, unauthorized, badRequest, handleApiError } from '@/lib/api';
import { setupTOTP, hashBackupCodes, encryptSecret } from '@/lib/security/totp';
import { applySecurityHeaders } from '@/lib/security/headers';

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';

/**
 * POST /api/auth/2fa/setup
 * Initialize 2FA setup for the authenticated user
 * Returns QR code, secret, and backup codes
 */
export async function POST(_request: NextRequest) {
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

    // Check if 2FA is already enabled
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('totp_enabled, username, display_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return applySecurityHeaders(handleApiError(profileError));
    }

    if (profile.totp_enabled) {
      return applySecurityHeaders(
        badRequest('2FA is already enabled. Disable it first to set up again.')
      );
    }

    // Generate TOTP setup data
    const username = profile.display_name || profile.username || user.email || 'user';
    const totpSetup = await setupTOTP(username);

    // Encrypt secret for storage
    const encryptedSecret = encryptSecret(totpSetup.secret, ENCRYPTION_KEY);

    // Hash backup codes for storage
    const hashedBackupCodes = hashBackupCodes(totpSetup.backupCodes);

    // Store encrypted secret and hashed backup codes (not yet enabled)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        totp_secret: encryptedSecret,
        backup_codes: hashedBackupCodes,
        totp_enabled: false, // Will be enabled after verification
      })
      .eq('id', user.id);

    if (updateError) {
      return applySecurityHeaders(handleApiError(updateError));
    }

    // Return setup data (secret is also returned for manual entry option)
    return applySecurityHeaders(
      success({
        qrCode: totpSetup.qrCodeDataUrl,
        secret: totpSetup.secret, // For manual entry
        backupCodes: totpSetup.backupCodes, // Show once, user must save
        message:
          'Scan the QR code with your authenticator app, then verify with a code to complete setup.',
      })
    );
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}

/**
 * GET /api/auth/2fa/setup
 * Check current 2FA status
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(unauthorized('Authentication required'));
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('totp_enabled, totp_verified_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return applySecurityHeaders(handleApiError(profileError));
    }

    return applySecurityHeaders(
      success({
        enabled: profile.totp_enabled || false,
        verifiedAt: profile.totp_verified_at,
      })
    );
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}
