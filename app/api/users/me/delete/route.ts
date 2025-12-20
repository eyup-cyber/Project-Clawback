/**
 * GDPR Account Deletion API
 * Delete or anonymize user account
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';
import { deleteUserData, anonymizeUserData } from '@/lib/compliance/gdpr';

const deleteSchema = z.object({
  confirmEmail: z.string().email(),
  reason: z.string().max(500).optional(),
  mode: z.enum(['delete', 'anonymize']).default('delete'),
  keepContent: z.boolean().default(false), // Keep posts but anonymize author
});

/**
 * DELETE /api/users/me/delete
 * Request account deletion
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED', 401));
    }

    // Parse body
    const body = await request.json();
    const parseResult = deleteSchema.safeParse(body);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid request', 'VALIDATION_ERROR', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const { confirmEmail, reason, mode, keepContent } = parseResult.data;

    // Verify email matches
    if (confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return applySecurityHeaders(
        apiError('Email does not match your account', 'VALIDATION_ERROR', 400)
      );
    }

    logger.info('Account deletion requested', {
      userId: user.id,
      mode,
      keepContent,
      reason: reason ? 'provided' : 'not provided',
    });

    // Log the deletion request for compliance
    await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        reason,
        mode,
        keep_content: keepContent,
        status: 'processing',
      })
      .single();

    let success_result = false;

    if (mode === 'anonymize') {
      // Anonymize user data but keep content
      success_result = await anonymizeUserData(user.id);
    } else {
      // Full deletion
      success_result = await deleteUserData(user.id, keepContent);
    }

    if (!success_result) {
      // Update request status
      await supabase
        .from('account_deletion_requests')
        .update({ status: 'failed' })
        .eq('user_id', user.id)
        .eq('status', 'processing');

      return applySecurityHeaders(
        apiError('Failed to process account deletion', 'INTERNAL_ERROR', 500)
      );
    }

    // Update request status
    await supabase
      .from('account_deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'processing');

    logger.info('Account deletion completed', { userId: user.id, mode });

    return applySecurityHeaders(
      success({
        message:
          mode === 'anonymize'
            ? 'Your account has been anonymized. Your content remains but is no longer associated with your identity.'
            : 'Your account and data have been deleted.',
        mode,
      })
    );
  } catch (err) {
    logger.error('Account deletion error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Failed to delete account', 'INTERNAL_ERROR', 500));
  }
}

/**
 * GET /api/users/me/delete
 * Get deletion request status
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED', 401));
    }

    // Get any pending deletion requests
    const { data: requests } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    return applySecurityHeaders(
      success({
        requests: requests || [],
        canDelete: true, // Could add checks like "account must be older than 7 days"
      })
    );
  } catch (err) {
    logger.error(
      'Deletion status check error',
      err instanceof Error ? err : new Error(String(err))
    );
    return applySecurityHeaders(apiError('Failed to check deletion status', 'INTERNAL_ERROR', 500));
  }
}

/**
 * POST /api/users/me/delete
 * Cancel pending deletion request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED', 401));
    }

    const body = await request.json();
    const { action, requestId } = z
      .object({
        action: z.enum(['cancel']),
        requestId: z.string().uuid().optional(),
      })
      .parse(body);

    if (action === 'cancel') {
      // Cancel pending deletion request
      const { error } = await supabase
        .from('account_deletion_requests')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .eq(requestId ? 'id' : 'user_id', requestId || user.id);

      if (error) {
        return applySecurityHeaders(
          apiError('Failed to cancel deletion request', 'INTERNAL_ERROR', 500)
        );
      }

      logger.info('Deletion request cancelled', { userId: user.id });

      return applySecurityHeaders(
        success({
          message: 'Deletion request cancelled',
        })
      );
    }

    return applySecurityHeaders(apiError('Invalid action', 'VALIDATION_ERROR', 400));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return applySecurityHeaders(apiError('Invalid request', 'VALIDATION_ERROR', 400));
    }
    logger.error('Deletion action error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Failed to process request', 'INTERNAL_ERROR', 500));
  }
}
