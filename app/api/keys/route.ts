export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, unauthorized, badRequest, handleApiError, parseBody } from '@/lib/api';
import {
  createApiKey,
  getUserApiKeys,
  deleteApiKey,
  API_KEY_SCOPES,
  type ApiKeyScope,
} from '@/lib/security/api-keys';
import { applySecurityHeaders } from '@/lib/security/headers';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  allowedIps: z
    .array(
      z
        .string()
        .regex(
          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/,
          'Invalid IP address'
        )
    )
    .optional(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

/**
 * GET /api/keys
 * List all API keys for the authenticated user
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

    const keys = await getUserApiKeys(user.id);

    // Format keys for response (never expose full key or hash)
    const formattedKeys = keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      allowedIps: key.allowedIps,
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
      expiresAt: key.expiresAt?.toISOString() || null,
      createdAt: key.createdAt.toISOString(),
    }));

    return applySecurityHeaders(
      success({
        keys: formattedKeys,
        availableScopes: API_KEY_SCOPES,
      })
    );
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}

/**
 * POST /api/keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(unauthorized('Authentication required'));
    }

    const body = await parseBody(request, createKeySchema);

    // Validate scopes
    const validScopes = Object.keys(API_KEY_SCOPES);
    const invalidScopes = body.scopes.filter((s) => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return applySecurityHeaders(badRequest(`Invalid scopes: ${invalidScopes.join(', ')}`));
    }

    const result = await createApiKey(user.id, {
      name: body.name,
      scopes: body.scopes as ApiKeyScope[],
      allowedIps: body.allowedIps,
      expiresInDays: body.expiresInDays,
    });

    if (!result) {
      return applySecurityHeaders(
        badRequest('Failed to create API key. You may have reached your limit.')
      );
    }

    return applySecurityHeaders(
      success({
        key: result.key, // Only shown once!
        apiKey: {
          id: result.apiKey.id,
          name: result.apiKey.name,
          keyPrefix: result.apiKey.keyPrefix,
          scopes: result.apiKey.scopes,
          expiresAt: result.apiKey.expiresAt?.toISOString() || null,
          createdAt: result.apiKey.createdAt.toISOString(),
        },
        message: 'API key created. Save this key securely - it will only be shown once!',
      })
    );
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}

/**
 * DELETE /api/keys
 * Delete an API key (requires key ID in query params)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(unauthorized('Authentication required'));
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return applySecurityHeaders(badRequest('API key ID is required'));
    }

    const deleted = await deleteApiKey(keyId, user.id);

    if (!deleted) {
      return applySecurityHeaders(badRequest('Failed to delete API key'));
    }

    return applySecurityHeaders(
      success({
        deleted: true,
        message: 'API key deleted',
      })
    );
  } catch (error) {
    return applySecurityHeaders(handleApiError(error));
  }
}
