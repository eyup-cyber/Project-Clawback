export const runtime = 'edge';

/**
 * Webhook Test API
 * Send a test webhook to verify endpoint
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';
import webhookDispatcher from '@/lib/webhooks/dispatcher';

const testWebhookSchema = z.object({
  webhookId: z.string().uuid(),
});

/**
 * POST /api/webhooks/test
 * Send a test webhook
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
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED'));
    }

    // Parse body
    const body = await request.json();
    const parseResult = testWebhookSchema.safeParse(body);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid request', 'VALIDATION_ERROR', {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const { webhookId } = parseResult.data;

    // Get webhook (ensure user owns it)
    const { data: webhook, error: fetchError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !webhook) {
      return applySecurityHeaders(apiError('Webhook not found', 'NOT_FOUND'));
    }

    // Send test webhook
    const result = await webhookDispatcher.test({
      id: webhook.id,
      user_id: webhook.user_id,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      is_active: webhook.active,
      created_at: webhook.created_at,
      updated_at: webhook.updated_at,
    });

    logger.info('Test webhook sent', {
      webhookId,
      userId: user.id,
      success: result.success,
    });

    if (result.success) {
      return applySecurityHeaders(
        success({
          success: true,
          statusCode: result.statusCode,
          message: 'Test webhook delivered successfully',
        })
      );
    }

    return applySecurityHeaders(
      success({
        success: false,
        statusCode: result.statusCode,
        error: result.errorMessage,
        responseBody: result.responseBody,
        message: 'Test webhook delivery failed',
      })
    );
  } catch (err) {
    logger.error('Webhook test error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}
