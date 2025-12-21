/**
 * External API Webhooks for Integrations
 * Phase 55: Third-party integrations via webhooks
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: ApiScope[];
  rate_limit: number;
  last_used_at: string | null;
  usage_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ApiScope =
  | 'posts:read'
  | 'posts:write'
  | 'comments:read'
  | 'comments:write'
  | 'users:read'
  | 'media:read'
  | 'media:write'
  | 'analytics:read'
  | 'webhooks:manage'
  | 'admin';

export interface ExternalWebhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  headers: Record<string, string>;
  is_active: boolean;
  retry_count: number;
  retry_delay_seconds: number;
  timeout_seconds: number;
  last_triggered_at: string | null;
  last_status: 'success' | 'failure' | null;
  last_response_code: number | null;
  total_deliveries: number;
  failed_deliveries: number;
  created_at: string;
  updated_at: string;
}

export type WebhookEvent =
  // Post events
  | 'post.created'
  | 'post.updated'
  | 'post.published'
  | 'post.unpublished'
  | 'post.deleted'
  // Comment events
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  // User events
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.followed'
  | 'user.unfollowed'
  // Media events
  | 'media.uploaded'
  | 'media.deleted'
  // Reaction events
  | 'reaction.added'
  | 'reaction.removed'
  // Subscription events
  | 'subscription.created'
  | 'subscription.cancelled';

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  request_headers: Record<string, string>;
  response_code: number | null;
  response_body: string | null;
  response_headers: Record<string, string> | null;
  attempt: number;
  status: 'pending' | 'success' | 'failure' | 'retry';
  error_message: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface IntegrationConfig {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_connected: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export type IntegrationProvider =
  | 'slack'
  | 'discord'
  | 'twitter'
  | 'mastodon'
  | 'zapier'
  | 'ifttt'
  | 'notion'
  | 'google_sheets'
  | 'airtable';

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Generate a new API key
 */
export async function createApiKey(
  name: string,
  scopes: ApiScope[],
  options: {
    rateLimit?: number;
    expiresInDays?: number;
  } = {}
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Generate key
  const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  // Calculate expiry
  let expiresAt: string | null = null;
  if (options.expiresInDays) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + options.expiresInDays);
    expiresAt = expiry.toISOString();
  }

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes,
      rate_limit: options.rateLimit || 1000,
      expires_at: expiresAt,
      is_active: true,
      usage_count: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error('[ApiKeys] Failed to create API key', error);
    throw error;
  }

  logger.info('[ApiKeys] API key created', { key_id: data.id, name });

  return {
    apiKey: data as ApiKey,
    rawKey, // Only returned once!
  };
}

/**
 * Validate an API key
 */
export async function validateApiKey(
  rawKey: string
): Promise<{ valid: boolean; apiKey?: ApiKey; error?: string }> {
  const supabase = await createServiceClient();

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 12);

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .single();

  if (error || !apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (!apiKey.is_active) {
    return { valid: false, error: 'API key is inactive' };
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Update usage
  await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: apiKey.usage_count + 1,
    })
    .eq('id', apiKey.id);

  return { valid: true, apiKey: apiKey as ApiKey };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('[ApiKeys] Failed to revoke API key', error);
    throw error;
  }

  logger.info('[ApiKeys] API key revoked', { key_id: keyId });
}

/**
 * List user's API keys
 */
export async function listApiKeys(): Promise<ApiKey[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as ApiKey[];
}

// ============================================================================
// EXTERNAL WEBHOOK MANAGEMENT
// ============================================================================

/**
 * Create an external webhook
 */
export async function createWebhook(
  input: Pick<ExternalWebhook, 'name' | 'url' | 'events'> &
    Partial<Pick<ExternalWebhook, 'headers' | 'retry_count' | 'retry_delay_seconds' | 'timeout_seconds'>>
): Promise<ExternalWebhook> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Generate webhook secret
  const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

  const { data, error } = await supabase
    .from('external_webhooks')
    .insert({
      user_id: user.id,
      name: input.name,
      url: input.url,
      events: input.events,
      secret,
      headers: input.headers || {},
      is_active: true,
      retry_count: input.retry_count || 3,
      retry_delay_seconds: input.retry_delay_seconds || 60,
      timeout_seconds: input.timeout_seconds || 30,
      total_deliveries: 0,
      failed_deliveries: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Webhooks] Failed to create webhook', error);
    throw error;
  }

  logger.info('[Webhooks] Webhook created', { webhook_id: data.id, name: input.name });
  return data as ExternalWebhook;
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  updates: Partial<Pick<ExternalWebhook, 'name' | 'url' | 'events' | 'headers' | 'is_active' | 'retry_count' | 'timeout_seconds'>>
): Promise<ExternalWebhook> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('external_webhooks')
    .update(updates)
    .eq('id', webhookId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('[Webhooks] Failed to update webhook', error);
    throw error;
  }

  return data as ExternalWebhook;
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('external_webhooks')
    .delete()
    .eq('id', webhookId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('[Webhooks] Failed to delete webhook', error);
    throw error;
  }

  logger.info('[Webhooks] Webhook deleted', { webhook_id: webhookId });
}

/**
 * List user's webhooks
 */
export async function listWebhooks(): Promise<ExternalWebhook[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('external_webhooks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as ExternalWebhook[];
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(webhookId: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

  const { error } = await supabase
    .from('external_webhooks')
    .update({ secret })
    .eq('id', webhookId)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }

  return secret;
}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  event: WebhookEvent,
  data: Record<string, unknown>,
  userId?: string
): Promise<void> {
  const supabase = await createServiceClient();

  // Get active webhooks for this event
  let query = supabase
    .from('external_webhooks')
    .select('*')
    .eq('is_active', true)
    .contains('events', [event]);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: webhooks, error } = await query;

  if (error) {
    logger.error('[Webhooks] Failed to get webhooks', error);
    return;
  }

  // Deliver to each webhook
  for (const webhook of webhooks || []) {
    await deliverWebhook(webhook as ExternalWebhook, event, data);
  }
}

/**
 * Deliver webhook payload
 */
async function deliverWebhook(
  webhook: ExternalWebhook,
  event: WebhookEvent,
  data: Record<string, unknown>,
  attempt: number = 1
): Promise<void> {
  const supabase = await createServiceClient();

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Generate signature
  const signature = generateWebhookSignature(JSON.stringify(payload), webhook.secret);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': event,
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': payload.timestamp,
    'User-Agent': 'Scroungers-Webhooks/1.0',
    ...webhook.headers,
  };

  // Create delivery record
  const { data: delivery, error: deliveryError } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhook.id,
      event,
      payload,
      request_headers: headers,
      attempt,
      status: 'pending',
    })
    .select()
    .single();

  if (deliveryError) {
    logger.error('[Webhooks] Failed to create delivery record', deliveryError);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), webhook.timeout_seconds * 1000);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text();

    // Update delivery record
    await supabase
      .from('webhook_deliveries')
      .update({
        response_code: response.status,
        response_body: responseBody.substring(0, 10000),
        response_headers: Object.fromEntries(response.headers.entries()),
        status: response.ok ? 'success' : 'failure',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', delivery.id);

    // Update webhook stats
    await supabase
      .from('external_webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status: response.ok ? 'success' : 'failure',
        last_response_code: response.status,
        total_deliveries: webhook.total_deliveries + 1,
        failed_deliveries: response.ok
          ? webhook.failed_deliveries
          : webhook.failed_deliveries + 1,
      })
      .eq('id', webhook.id);

    if (!response.ok && attempt < webhook.retry_count) {
      // Schedule retry
      setTimeout(() => {
        void deliverWebhook(webhook, event, data, attempt + 1);
      }, webhook.retry_delay_seconds * 1000 * attempt);
    }

    logger.info('[Webhooks] Webhook delivered', {
      webhook_id: webhook.id,
      event,
      status: response.status,
      attempt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'failure',
        error_message: errorMessage,
      })
      .eq('id', delivery.id);

    await supabase
      .from('external_webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status: 'failure',
        total_deliveries: webhook.total_deliveries + 1,
        failed_deliveries: webhook.failed_deliveries + 1,
      })
      .eq('id', webhook.id);

    if (attempt < webhook.retry_count) {
      setTimeout(() => {
        void deliverWebhook(webhook, event, data, attempt + 1);
      }, webhook.retry_delay_seconds * 1000 * attempt);
    }

    logger.error('[Webhooks] Webhook delivery failed', {
      webhook_id: webhook.id,
      event,
      error: errorMessage,
      attempt,
    });
  }
}

/**
 * Generate webhook signature
 */
function generateWebhookSignature(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Get webhook deliveries
 */
export async function getWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify webhook ownership
  const { data: webhook } = await supabase
    .from('external_webhooks')
    .select('id')
    .eq('id', webhookId)
    .eq('user_id', user.id)
    .single();

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const { data, error } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as WebhookDelivery[];
}

/**
 * Test webhook endpoint
 */
export async function testWebhook(webhookId: string): Promise<{
  success: boolean;
  responseCode?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: webhook, error } = await supabase
    .from('external_webhooks')
    .select('*')
    .eq('id', webhookId)
    .eq('user_id', user.id)
    .single();

  if (error || !webhook) {
    throw new Error('Webhook not found');
  }

  const testPayload: WebhookPayload = {
    event: 'post.created' as WebhookEvent,
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: 'This is a test webhook delivery',
    },
  };

  const signature = generateWebhookSignature(
    JSON.stringify(testPayload),
    webhook.secret
  );

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'test',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': testPayload.timestamp,
        ...webhook.headers,
      },
      body: JSON.stringify(testPayload),
    });

    return {
      success: response.ok,
      responseCode: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Request failed',
    };
  }
}

// ============================================================================
// INTEGRATION MANAGEMENT
// ============================================================================

/**
 * Get integration config
 */
export async function getIntegration(
  provider: IntegrationProvider
): Promise<IntegrationConfig | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as IntegrationConfig;
}

/**
 * Save integration config
 */
export async function saveIntegration(
  provider: IntegrationProvider,
  config: Record<string, unknown>,
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  }
): Promise<IntegrationConfig> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('integrations')
    .upsert({
      user_id: user.id,
      provider,
      config,
      access_token: tokens?.accessToken || null,
      refresh_token: tokens?.refreshToken || null,
      token_expires_at: tokens?.expiresAt?.toISOString() || null,
      is_connected: true,
      last_sync_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as IntegrationConfig;
}

/**
 * Disconnect integration
 */
export async function disconnectIntegration(provider: IntegrationProvider): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  await supabase
    .from('integrations')
    .update({
      is_connected: false,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    })
    .eq('user_id', user.id)
    .eq('provider', provider);
}

/**
 * List all integrations
 */
export async function listIntegrations(): Promise<IntegrationConfig[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }

  return (data || []) as IntegrationConfig[];
}
