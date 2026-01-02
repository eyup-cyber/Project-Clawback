export const runtime = 'edge';

/**
 * Webhooks API
 * CRUD operations for webhook subscriptions
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';
import { generateWebhookSecret } from '@/lib/webhooks/signing';

// Available webhook events
const WEBHOOK_EVENTS = [
  'post.created',
  'post.updated',
  'post.published',
  'post.deleted',
  'comment.created',
  'comment.moderated',
  'user.created',
  'user.updated',
  'media.uploaded',
  'report.submitted',
  'moderation.required',
] as const;

// Validation schemas
const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  description: z.string().max(500).optional(),
  active: z.boolean().optional().default(true),
  retryCount: z.number().int().min(0).max(10).optional().default(3),
  timeoutSeconds: z.number().int().min(5).max(60).optional().default(30),
  customHeaders: z.record(z.string(), z.string()).optional(),
  allowedIps: z.array(z.string()).optional(),
});

const updateWebhookSchema = createWebhookSchema.partial();

/**
 * GET /api/webhooks
 * List user's webhooks
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
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED'));
    }

    // Get webhooks
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching webhooks', error);
      return applySecurityHeaders(apiError('Failed to fetch webhooks', 'INTERNAL_ERROR'));
    }

    // Transform and hide secrets
    const transformedWebhooks = webhooks.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      events: w.events,
      description: w.description,
      active: w.active,
      retryCount: w.retry_count,
      timeoutSeconds: w.timeout_seconds,
      customHeaders: w.custom_headers,
      allowedIps: w.allowed_ips,
      deliveryCount: w.delivery_count,
      failureCount: w.failure_count,
      lastTriggeredAt: w.last_triggered_at,
      lastSuccessAt: w.last_success_at,
      lastFailureAt: w.last_failure_at,
      lastFailureReason: w.last_failure_reason,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      // Don't expose the full secret
      hasSecret: !!w.secret,
    }));

    return applySecurityHeaders(success({ webhooks: transformedWebhooks }));
  } catch (err) {
    logger.error('Webhooks GET error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}

/**
 * POST /api/webhooks
 * Create a new webhook
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

    // Check if user can create webhooks (contributors and above)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role === 'reader') {
      return applySecurityHeaders(
        apiError('Contributors and above can create webhooks', 'FORBIDDEN')
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = createWebhookSchema.safeParse(body);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid request', 'VALIDATION_ERROR', {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const input = parseResult.data;

    // Check webhook limit (e.g., max 10 per user)
    const { count } = await supabase
      .from('webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count || 0) >= 10) {
      return applySecurityHeaders(apiError('Maximum webhook limit reached (10)', 'LIMIT_EXCEEDED'));
    }

    // Generate secret
    const secret = generateWebhookSecret();

    // Create webhook
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: user.id,
        name: input.name,
        url: input.url,
        secret,
        events: input.events,
        description: input.description,
        active: input.active,
        retry_count: input.retryCount,
        timeout_seconds: input.timeoutSeconds,
        custom_headers: input.customHeaders || {},
        allowed_ips: input.allowedIps,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating webhook', error);
      return applySecurityHeaders(apiError('Failed to create webhook', 'INTERNAL_ERROR'));
    }

    logger.info('Webhook created', { webhookId: webhook.id, userId: user.id });

    // Return webhook with secret (only shown once)
    return applySecurityHeaders(
      success({
        webhook: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          secret, // Only returned on creation
          active: webhook.active,
          createdAt: webhook.created_at,
        },
        message: 'Webhook created. Save the secret - it will not be shown again.',
      })
    );
  } catch (err) {
    logger.error('Webhooks POST error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}

/**
 * DELETE /api/webhooks
 * Delete a webhook (requires id in query params)
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
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED'));
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return applySecurityHeaders(apiError('Webhook ID required', 'VALIDATION_ERROR'));
    }

    // Delete webhook (RLS will ensure user owns it)
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Error deleting webhook', error);
      return applySecurityHeaders(apiError('Failed to delete webhook', 'INTERNAL_ERROR'));
    }

    logger.info('Webhook deleted', { webhookId, userId: user.id });

    return applySecurityHeaders(success({ deleted: true }));
  } catch (err) {
    logger.error('Webhooks DELETE error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}

/**
 * PATCH /api/webhooks
 * Update a webhook
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return applySecurityHeaders(apiError('Webhook ID required', 'VALIDATION_ERROR'));
    }

    const parseResult = updateWebhookSchema.safeParse(updates);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid request', 'VALIDATION_ERROR', {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const input = parseResult.data;
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.url !== undefined) updateData.url = input.url;
    if (input.events !== undefined) updateData.events = input.events;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.active !== undefined) updateData.active = input.active;
    if (input.retryCount !== undefined) updateData.retry_count = input.retryCount;
    if (input.timeoutSeconds !== undefined) updateData.timeout_seconds = input.timeoutSeconds;
    if (input.customHeaders !== undefined) updateData.custom_headers = input.customHeaders;
    if (input.allowedIps !== undefined) updateData.allowed_ips = input.allowedIps;

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating webhook', error);
      return applySecurityHeaders(apiError('Failed to update webhook', 'INTERNAL_ERROR'));
    }

    logger.info('Webhook updated', { webhookId: id, userId: user.id });

    return applySecurityHeaders(
      success({
        webhook: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          active: webhook.active,
          updatedAt: webhook.updated_at,
        },
      })
    );
  } catch (err) {
    logger.error('Webhooks PATCH error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}
