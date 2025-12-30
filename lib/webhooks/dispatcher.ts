/**
 * Webhook Dispatcher
 * Phase 17.1: Event dispatch, signing, delivery with retry
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export type WebhookEvent =
  | 'post.created'
  | 'post.updated'
  | 'post.published'
  | 'post.deleted'
  | 'comment.created'
  | 'comment.deleted'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'application.submitted'
  | 'application.approved'
  | 'application.rejected'
  | 'follow.created'
  | 'follow.deleted'
  | 'reaction.created'
  | 'reaction.deleted';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  status_code?: number;
  response_body?: string;
  error_message?: string;
  attempts: number;
  next_retry_at?: string;
  created_at: string;
  delivered_at?: string;
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RETRIES = 5;
const RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // Seconds: 1m, 5m, 15m, 1h, 2h
const DELIVERY_TIMEOUT = 30000; // 30 seconds
const SIGNATURE_HEADER = 'X-Webhook-Signature';
const SIGNATURE_TIMESTAMP_HEADER = 'X-Webhook-Timestamp';
const EVENT_HEADER = 'X-Webhook-Event';
const DELIVERY_ID_HEADER = 'X-Webhook-Delivery-Id';

// ============================================================================
// SIGNATURE GENERATION
// ============================================================================

/**
 * Generate HMAC signature for webhook payload
 */
export function generateSignature(payload: string, secret: string, timestamp: number): string {
  const signaturePayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signaturePayload);
  return `v1=${hmac.digest('hex')}`;
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds = 300 // 5 minutes
): boolean {
  // Check timestamp to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  // Generate expected signature
  const expectedSignature = generateSignature(payload, secret, timestamp);

  // Constant-time comparison
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// ============================================================================
// DELIVERY
// ============================================================================

/**
 * Deliver webhook to a single endpoint
 */
async function deliverWebhook(
  webhook: Webhook,
  payload: WebhookPayload,
  deliveryId: string
): Promise<DeliveryResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret, timestamp);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [SIGNATURE_HEADER]: signature,
        [SIGNATURE_TIMESTAMP_HEADER]: timestamp.toString(),
        [EVENT_HEADER]: payload.event,
        [DELIVERY_ID_HEADER]: deliveryId,
        'User-Agent': 'Scroungers-Webhook/1.0',
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      return {
        success: true,
        statusCode: response.status,
        responseBody: responseBody.slice(0, 1000), // Limit response body size
      };
    }

    return {
      success: false,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 1000),
      errorMessage: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        errorMessage: 'Request timed out',
      };
    }

    return {
      success: false,
      errorMessage,
    };
  }
}

// ============================================================================
// DISPATCH
// ============================================================================

/**
 * Dispatch a webhook event to all registered endpoints
 */
export async function dispatchWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>,
  options: { userId?: string } = {}
): Promise<void> {
  const supabase = await createServiceClient();

  // Build query for active webhooks that listen to this event
  let query = supabase
    .from('webhooks')
    .select('*')
    .eq('is_active', true)
    .contains('events', [event]);

  // If userId is provided, only dispatch to that user's webhooks
  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }

  const { data: webhooks, error } = await query;

  if (error) {
    logger.error('[Webhook] Failed to fetch webhooks', error, { event });
    return;
  }

  if (!webhooks || webhooks.length === 0) {
    logger.debug('[Webhook] No webhooks registered for event', { event });
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Dispatch to all webhooks in parallel
  await Promise.all(
    webhooks.map(async (webhook: Webhook) => {
      // Create delivery record
      const { data: delivery, error: createError } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_id: webhook.id,
          event,
          payload,
          status: 'pending',
          attempts: 0,
        })
        .select()
        .single();

      if (createError || !delivery) {
        logger.error('[Webhook] Failed to create delivery record', createError, {
          webhookId: webhook.id,
          event,
        });
        return;
      }

      // Attempt delivery
      const result = await deliverWebhook(webhook, payload, delivery.id);

      // Update delivery record
      await supabase
        .from('webhook_deliveries')
        .update({
          status: result.success ? 'success' : 'failed',
          status_code: result.statusCode,
          response_body: result.responseBody,
          error_message: result.errorMessage,
          attempts: 1,
          delivered_at: result.success ? new Date().toISOString() : null,
          next_retry_at: result.success
            ? null
            : new Date(Date.now() + RETRY_DELAYS[0] * 1000).toISOString(),
        })
        .eq('id', delivery.id);

      if (result.success) {
        logger.info('[Webhook] Delivered successfully', {
          webhookId: webhook.id,
          deliveryId: delivery.id,
          event,
          statusCode: result.statusCode,
        });
      } else {
        logger.warn('[Webhook] Delivery failed, will retry', {
          webhookId: webhook.id,
          deliveryId: delivery.id,
          event,
          error: result.errorMessage,
        });
      }
    })
  );
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Process pending webhook retries
 */
export async function processWebhookRetries(): Promise<void> {
  const supabase = await createServiceClient();

  // Get deliveries that need retrying
  const { data: deliveries, error } = await supabase
    .from('webhook_deliveries')
    .select('*, webhook:webhooks(*)')
    .eq('status', 'failed')
    .lt('attempts', MAX_RETRIES)
    .lt('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(100);

  if (error) {
    logger.error('[Webhook] Failed to fetch pending retries', error);
    return;
  }

  if (!deliveries || deliveries.length === 0) {
    return;
  }

  logger.info('[Webhook] Processing retries', { count: deliveries.length });

  for (const delivery of deliveries as (WebhookDelivery & {
    webhook: Webhook;
  })[]) {
    if (!delivery.webhook || !delivery.webhook.is_active) {
      // Mark as failed if webhook is inactive or deleted
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          error_message: 'Webhook is inactive or deleted',
          next_retry_at: null,
        })
        .eq('id', delivery.id);
      continue;
    }

    const payload: WebhookPayload = delivery.payload as unknown as WebhookPayload;
    const result = await deliverWebhook(delivery.webhook, payload, delivery.id);

    const nextAttempt = delivery.attempts + 1;
    const hasMoreRetries = nextAttempt < MAX_RETRIES;

    await supabase
      .from('webhook_deliveries')
      .update({
        status: result.success ? 'success' : 'failed',
        status_code: result.statusCode,
        response_body: result.responseBody,
        error_message: result.errorMessage,
        attempts: nextAttempt,
        delivered_at: result.success ? new Date().toISOString() : null,
        next_retry_at:
          result.success || !hasMoreRetries
            ? null
            : new Date(
                Date.now() + RETRY_DELAYS[Math.min(nextAttempt, RETRY_DELAYS.length - 1)] * 1000
              ).toISOString(),
      })
      .eq('id', delivery.id);

    if (result.success) {
      logger.info('[Webhook] Retry successful', {
        deliveryId: delivery.id,
        attempts: nextAttempt,
      });
    } else if (!hasMoreRetries) {
      logger.error('[Webhook] Max retries exceeded', {
        deliveryId: delivery.id,
        webhookId: delivery.webhook_id,
        event: delivery.event,
      });
    }
  }
}

// ============================================================================
// TEST WEBHOOK
// ============================================================================

/**
 * Send a test webhook to verify endpoint
 */
export async function testWebhook(webhook: Webhook): Promise<DeliveryResult> {
  const payload: WebhookPayload = {
    event: 'post.created' as WebhookEvent,
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: 'This is a test webhook from Scroungers Multimedia',
    },
  };

  return deliverWebhook(webhook, payload, `test-${Date.now()}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

const webhookDispatcher = {
  dispatch: dispatchWebhook,
  processRetries: processWebhookRetries,
  test: testWebhook,
  generateSignature,
  verifySignature,
};

export default webhookDispatcher;
