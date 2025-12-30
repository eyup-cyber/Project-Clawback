/**
 * API Key Management
 * Generates, validates, and manages API keys for external integrations
 */

import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

const API_KEY_PREFIX = 'scrng_';
const API_KEY_LENGTH = 32;

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string; // First 8 chars for identification
  scopes: string[];
  allowedIps: string[] | null;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  allowedIps?: string[];
  expiresInDays?: number;
}

/**
 * Available API key scopes
 */
export const API_KEY_SCOPES = {
  'posts:read': 'Read published posts',
  'posts:write': 'Create and edit posts',
  'media:upload': 'Upload media files',
  'profile:read': 'Read user profile',
  'profile:write': 'Update user profile',
  'comments:read': 'Read comments',
  'comments:write': 'Create comments',
  'analytics:read': 'Read analytics data',
} as const;

export type ApiKeyScope = keyof typeof API_KEY_SCOPES;

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const key = randomBytes.toString('base64url').substring(0, API_KEY_LENGTH);
  return `${API_KEY_PREFIX}${key}`;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Get the prefix of an API key for display
 */
export function getKeyPrefix(key: string): string {
  return key.substring(0, API_KEY_PREFIX.length + 8);
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key.startsWith(API_KEY_PREFIX)) return false;
  if (key.length !== API_KEY_PREFIX.length + API_KEY_LENGTH) return false;
  return true;
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  input: CreateApiKeyInput
): Promise<{ key: string; apiKey: ApiKey } | null> {
  const supabase = await createServiceClient();

  // Generate the key
  const plainKey = generateApiKey();
  const hashedKey = hashApiKey(plainKey);
  const keyPrefix = getKeyPrefix(plainKey);

  // Calculate expiration
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  // Insert into database
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name: input.name,
      key_hash: hashedKey,
      key_prefix: keyPrefix,
      scopes: input.scopes,
      allowed_ips: input.allowedIps || null,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create API key:', error);
    return null;
  }

  return {
    key: plainKey, // Only returned once at creation
    apiKey: {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      keyPrefix: data.key_prefix,
      scopes: data.scopes,
      allowedIps: data.allowed_ips,
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : null,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      createdAt: new Date(data.created_at),
    },
  };
}

/**
 * Validate an API key and return the associated user/scopes
 */
export async function validateApiKey(
  key: string,
  requiredScopes: string[] = [],
  clientIp?: string
): Promise<{
  valid: boolean;
  userId?: string;
  scopes?: string[];
  error?: string;
}> {
  if (!isValidApiKeyFormat(key)) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const supabase = await createServiceClient();
  const hashedKey = hashApiKey(key);

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', hashedKey)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Check IP allowlist
  if (data.allowed_ips && data.allowed_ips.length > 0 && clientIp) {
    if (!data.allowed_ips.includes(clientIp)) {
      return { valid: false, error: 'IP address not allowed' };
    }
  }

  // Check scopes
  const keyScopes = data.scopes as string[];
  const missingScopes = requiredScopes.filter((s) => !keyScopes.includes(s));
  if (missingScopes.length > 0) {
    return {
      valid: false,
      error: `Missing required scopes: ${missingScopes.join(', ')}`,
    };
  }

  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    valid: true,
    userId: data.user_id,
    scopes: keyScopes,
  };
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((key) => ({
    id: key.id,
    userId: key.user_id,
    name: key.name,
    keyPrefix: key.key_prefix,
    scopes: key.scopes,
    allowedIps: key.allowed_ips,
    lastUsedAt: key.last_used_at ? new Date(key.last_used_at) : null,
    expiresAt: key.expires_at ? new Date(key.expires_at) : null,
    createdAt: new Date(key.created_at),
  }));
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('api_keys').delete().eq('id', keyId).eq('user_id', userId);

  return !error;
}

/**
 * Update API key name or scopes
 */
export async function updateApiKey(
  keyId: string,
  userId: string,
  updates: { name?: string; scopes?: string[]; allowedIps?: string[] | null }
): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('api_keys')
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.scopes && { scopes: updates.scopes }),
      ...(updates.allowedIps !== undefined && {
        allowed_ips: updates.allowedIps,
      }),
    })
    .eq('id', keyId)
    .eq('user_id', userId);

  return !error;
}

/**
 * Rotate an API key (generate new key, keep same settings)
 */
export async function rotateApiKey(keyId: string, userId: string): Promise<{ key: string } | null> {
  const supabase = await createServiceClient();

  // Get existing key settings
  const { data: existing, error: fetchError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', keyId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return null;
  }

  // Generate new key
  const plainKey = generateApiKey();
  const hashedKey = hashApiKey(plainKey);
  const keyPrefix = getKeyPrefix(plainKey);

  // Update with new key
  const { error: updateError } = await supabase
    .from('api_keys')
    .update({
      key_hash: hashedKey,
      key_prefix: keyPrefix,
      last_used_at: null, // Reset last used
    })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (updateError) {
    return null;
  }

  return { key: plainKey };
}
