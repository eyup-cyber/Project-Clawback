/**
 * Webhook Dispatcher
 * Handles sending webhook notifications for platform events
 */

import { createServiceClient } from '@/lib/supabase/server';
import { signWebhookPayload } from './signing';

export { verifyWebhookSignature } from './signing';

export interface WebhookEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: Date;
  lastTriggeredAt?: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
  deliveredAt: Date;
  success: boolean;
}

// Supported webhook events
export const WEBHOOK_EVENTS = {
  POST_CREATED: 'post.created',
  POST_PUBLISHED: 'post.published',
  POST_UPDATED: 'post.updated',
  POST_DELETED: 'post.deleted',
  COMMENT_CREATED: 'comment.created',
  USER_REGISTERED: 'user.registered',
  APPLICATION_SUBMITTED: 'application.submitted',
  APPLICATION_APPROVED: 'application.approved',
  APPLICATION_REJECTED: 'application.rejected',
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

/**
 * Get all webhooks for a user
 */
export async function getUserWebhooks(userId: string): Promise<Webhook[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(transformWebhook);
}

/**
 * Get webhooks subscribed to an event
 */
export async function getWebhooksForEvent(eventType: string): Promise<Webhook[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('enabled', true)
    .contains('events', [eventType]);

  if (error || !data) {
    return [];
  }

  return data.map(transformWebhook);
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  userId: string,
  url: string,
  events: string[],
  secret: string
): Promise<Webhook | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      user_id: userId,
      url,
      events,
      secret,
      enabled: true,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create webhook:', error);
    return null;
  }

  return transformWebhook(data);
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  userId: string,
  updates: Partial<{ url: string; events: string[]; enabled: boolean }>
): Promise<Webhook | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('webhooks')
    .update(updates)
    .eq('id', webhookId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return transformWebhook(data);
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', webhookId)
    .eq('user_id', userId);

  return !error;
}

/**
 * Dispatch event to all subscribed webhooks
 */
export async function dispatchWebhookEvent(
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await getWebhooksForEvent(eventType);

  if (webhooks.length === 0) {
    return;
  }

  const event: WebhookEvent = {
    type: eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  // Send to all webhooks in parallel
  await Promise.allSettled(webhooks.map((webhook) => sendWebhook(webhook, event)));
}

/**
 * Send webhook to a single endpoint
 */
async function sendWebhook(
  webhook: Webhook,
  event: WebhookEvent,
  retryCount: number = 0
): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

  const payload = JSON.stringify(event);
  const signature = signWebhookPayload(payload, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event.type,
        'X-Webhook-Timestamp': event.timestamp,
        'User-Agent': 'Scroungers-Webhook/1.0',
      },
      body: payload,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    // Log delivery
    await logDelivery(webhook.id, event, response);

    // Retry on 5xx errors
    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[retryCount]));
      return sendWebhook(webhook, event, retryCount + 1);
    }
  } catch (error) {
    console.error(`Webhook delivery failed for ${webhook.id}:`, error);

    // Log failed delivery
    await logDelivery(
      webhook.id,
      event,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[retryCount]));
      return sendWebhook(webhook, event, retryCount + 1);
    }
  }
}

/**
 * Log webhook delivery attempt
 */
async function logDelivery(
  webhookId: string,
  event: WebhookEvent,
  response: Response | null,
  errorMessage?: string
): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('webhook_deliveries').insert({
    webhook_id: webhookId,
    event: event.type,
    payload: event.data,
    response_status: response?.status,
    response_body: errorMessage || (response ? await response.text().catch(() => '') : null),
  });

  // Update last triggered time
  await supabase
    .from('webhooks')
    .update({ last_triggered_at: new Date().toISOString() })
    .eq('id', webhookId);
}

/**
 * Get delivery history for a webhook
 */
export async function getDeliveryHistory(
  webhookId: string,
  limit: number = 20
): Promise<WebhookDelivery[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('delivered_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((d) => ({
    id: d.id,
    webhookId: d.webhook_id,
    event: d.event,
    payload: d.payload,
    responseStatus: d.response_status,
    responseBody: d.response_body,
    deliveredAt: new Date(d.delivered_at),
    success: d.response_status ? d.response_status >= 200 && d.response_status < 300 : false,
  }));
}

/**
 * Test a webhook endpoint
 */
export async function testWebhook(
  webhookId: string,
  userId: string
): Promise<{
  success: boolean;
  statusCode?: number;
  error?: string;
}> {
  const supabase = await createServiceClient();

  const { data: webhook } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .eq('user_id', userId)
    .single();

  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  const testEvent: WebhookEvent = {
    type: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test webhook delivery' },
  };

  try {
    const payload = JSON.stringify(testEvent);
    const signature = signWebhookPayload(payload, webhook.secret);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'test',
        'User-Agent': 'Scroungers-Webhook/1.0',
      },
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    return {
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

function transformWebhook(row: Record<string, unknown>): Webhook {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    url: row.url as string,
    secret: row.secret as string,
    events: row.events as string[],
    enabled: row.enabled as boolean,
    createdAt: new Date(row.created_at as string),
    lastTriggeredAt: row.last_triggered_at ? new Date(row.last_triggered_at as string) : undefined,
  };
}
