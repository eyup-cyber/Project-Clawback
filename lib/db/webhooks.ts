/**
 * Webhooks Database Operations
 * Phase 1.7.6: Webhook management
 */

import { createClient } from '@/lib/supabase/server';

export interface Webhook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  max_failures: number;
  headers: Record<string, string>;
  last_triggered_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: Record<string, unknown>;
  request_headers: Record<string, string> | null;
  response_status: number | null;
  response_body: string | null;
  response_headers: Record<string, string> | null;
  duration_ms: number | null;
  success: boolean;
  error_message: string | null;
  attempt_number: number;
  next_retry_at: string | null;
  created_at: string;
}

export interface CreateWebhookInput {
  name: string;
  description?: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
}

export interface UpdateWebhookInput {
  name?: string;
  description?: string;
  url?: string;
  events?: string[];
  headers?: Record<string, string>;
  is_active?: boolean;
}

// ============================================================================
// WEBHOOK OPERATIONS
// ============================================================================

export async function createWebhook(userId: string, input: CreateWebhookInput): Promise<Webhook> {
  const supabase = await createClient();

  // Generate secret (in production, use crypto.randomBytes)
  const secret = crypto.randomUUID() + crypto.randomUUID();

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description || null,
      url: input.url,
      secret,
      events: input.events,
      headers: input.headers || {},
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWebhooks(userId: string): Promise<Webhook[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getWebhook(webhookId: string, userId: string): Promise<Webhook> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Webhook not found');
  }

  return data;
}

export async function updateWebhook(
  webhookId: string,
  userId: string,
  input: UpdateWebhookInput
): Promise<Webhook> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhooks')
    .update(input)
    .eq('id', webhookId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWebhook(webhookId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', webhookId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================================================
// WEBHOOK DELIVERIES
// ============================================================================

export async function getWebhookDeliveries(
  webhookId: string,
  userId: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  const supabase = await createClient();

  // Verify webhook belongs to user
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('id')
    .eq('id', webhookId)
    .eq('user_id', userId)
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

  if (error) throw error;
  return data || [];
}

// ============================================================================
// WEBHOOK TRIGGERS (for internal use)
// ============================================================================

export async function getWebhooksForEvent(event: string): Promise<
  Array<{
    id: string;
    url: string;
    secret: string;
    headers: Record<string, string>;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_webhooks_for_event', {
    p_event: event,
  });

  if (error) throw error;
  return data || [];
}

export async function logWebhookDelivery(
  webhookId: string,
  event: string,
  payload: Record<string, unknown>,
  responseStatus: number,
  responseBody: string,
  durationMs: number,
  success: boolean,
  errorMessage?: string
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('log_webhook_delivery', {
    p_webhook_id: webhookId,
    p_event: event,
    p_payload: payload,
    p_response_status: responseStatus,
    p_response_body: responseBody,
    p_duration_ms: durationMs,
    p_success: success,
    p_error_message: errorMessage || null,
  });

  if (error) throw error;
  return data;
}
