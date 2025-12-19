import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, unauthorized, badRequest, handleApiError, parseBody } from '@/lib/api';
import { verifyToken, decryptSecret, verifyBackupCode } from '@/lib/security/totp';
import { applySecurityHeaders } from '@/lib/security/headers';
import { z } from 'zod';

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';

const verifySchema = z.object({
  code: z.string().min(6).max(10), // 6 digits for TOTP, or XXXX-XXXX for backup
  isBackupCode: z.boolean().optional().default(false),
  isSetupVerification: z.boolean().optional().default(false),
});

/**
 * POST /api/auth/2fa/verify
 * Verify a TOTP code or backup code
 * Can be used for:
 * 1. Completing 2FA setup (isSetupVerification: true)
 * 2. Verifying during login
 * 3. Using a backup code for recovery
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(unauthorized('Authentication required'));
    }

    // Parse and validate request body
    const body = await parseBody(request, verifySchema);

    // Get user's 2FA data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('totp_secret, totp_enabled, backup_codes, username, display_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return applySecurityHeaders(handleApiError(profileError));
    }

    if (!profile.totp_secret) {
      return applySecurityHeaders(badRequest('2FA is not set up. Please run setup first.'));
    }

    // Decrypt the stored secret
    const secret = decryptSecret(profile.totp_secret, ENCRYPTION_KEY);
    const username = profile.display_name || profile.username || user.email || 'user';

    let isValid = false;
    let usedBackupCodeIndex = -1;

    if (body.isBackupCode) {
      // Verify backup code
      if (!profile.backup_codes || profile.backup_codes.length === 0) {
        return applySecurityHeaders(badRequest('No backup codes available'));
      }

      usedBackupCodeIndex = verifyBackupCode(body.code, profile.backup_codes);
      isValid = usedBackupCodeIndex !== -1;

      if (isValid) {
        // Remove the used backup code
        const updatedBackupCodes = [...profile.backup_codes];
        updatedBackupCodes.splice(usedBackupCodeIndex, 1);

        await supabase
          .from('profiles')
          .update({ backup_codes: updatedBackupCodes })
          .eq('id', user.id);

        // Log the recovery attempt
        await supabase.from('two_factor_recovery_attempts').insert({
          user_id: user.id,
          backup_code_index: usedBackupCodeIndex,
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          success: true,
        });
      }
    } else {
      // Verify TOTP code
      isValid = verifyToken(body.code, secret, username);
    }

    if (!isValid) {
      // Log failed attempt if using backup code
      if (body.isBackupCode) {
        await supabase.from('two_factor_recovery_attempts').insert({
          user_id: user.id,
          backup_code_index: -1,
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          success: false,
        });
      }

      return applySecurityHeaders(badRequest('Invalid verification code'));
    }

    // If this is setup verification, enable 2FA
    if (body.isSetupVerification && !profile.totp_enabled) {
      await supabase
        .from('profiles')
        .update({
          totp_enabled: true,
          totp_verified_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      return applySecurityHeaders(success({
        verified: true,
        message: '2FA has been successfully enabled',
        enabled: true,
      }));
    }

    return applySecurityHeaders(success({
      verified: true,
      message: body.isBackupCode 
        ? `Verified with backup code. ${profile.backup_codes!.length - 1} backup codes remaining.`
        : 'Verification successful',
      remainingBackupCodes: body.isBackupCode ? profile.backup_codes!.length - 1 : undefined,
    }));
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}
