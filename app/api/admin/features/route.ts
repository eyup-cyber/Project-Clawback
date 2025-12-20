/**
 * Feature Flags Admin API
 * CRUD operations for feature flags
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';

// Validation schemas
const createFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).optional().default(100),
  targetUserIds: z.array(z.string().uuid()).optional(),
  targetRoles: z.array(z.string()).optional(),
  environments: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

// For PATCH operations
export const updateFlagSchema = createFlagSchema.partial().omit({ key: true });

/**
 * GET /api/admin/features
 * List all feature flags (admin only)
 */
export async function GET(request: NextRequest) {
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

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return applySecurityHeaders(apiError('Admin access required', 'FORBIDDEN', 403));
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');
    const tag = searchParams.get('tag');

    let query = supabase
      .from('feature_flags')
      .select(
        `
        *,
        created_by_profile:profiles!created_by(username, display_name),
        updated_by_profile:profiles!updated_by(username, display_name)
      `
      )
      .order('created_at', { ascending: false });

    if (enabled !== null) {
      query = query.eq('enabled', enabled === 'true');
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: flags, error } = await query;

    if (error) {
      logger.error('Error fetching feature flags', error);
      return applySecurityHeaders(apiError('Failed to fetch flags', 'INTERNAL_ERROR', 500));
    }

    // Transform to camelCase
    const transformedFlags = flags.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description,
      enabled: f.enabled,
      rolloutPercentage: f.rollout_percentage,
      targetUserIds: f.target_user_ids,
      targetRoles: f.target_roles,
      targetAttributes: f.target_attributes,
      environments: f.environments,
      startDate: f.start_date,
      endDate: f.end_date,
      metadata: f.metadata,
      tags: f.tags,
      createdBy: f.created_by,
      updatedBy: f.updated_by,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      createdByProfile: f.created_by_profile,
      updatedByProfile: f.updated_by_profile,
    }));

    return applySecurityHeaders(success({ flags: transformedFlags }));
  } catch (err) {
    logger.error('Feature flags GET error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR', 500));
  }
}

/**
 * POST /api/admin/features
 * Create a new feature flag
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

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return applySecurityHeaders(apiError('Admin access required', 'FORBIDDEN', 403));
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = createFlagSchema.safeParse(body);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid request', 'VALIDATION_ERROR', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const input = parseResult.data;

    // Check if key already exists
    const { data: existing } = await supabase
      .from('feature_flags')
      .select('id')
      .eq('key', input.key)
      .single();

    if (existing) {
      return applySecurityHeaders(apiError('Flag key already exists', 'CONFLICT', 409));
    }

    // Create flag
    const { data: flag, error } = await supabase
      .from('feature_flags')
      .insert({
        key: input.key,
        name: input.name,
        description: input.description,
        enabled: input.enabled,
        rollout_percentage: input.rolloutPercentage,
        target_user_ids: input.targetUserIds,
        target_roles: input.targetRoles,
        environments: input.environments,
        start_date: input.startDate,
        end_date: input.endDate,
        metadata: input.metadata || {},
        tags: input.tags,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating feature flag', error);
      return applySecurityHeaders(apiError('Failed to create flag', 'INTERNAL_ERROR', 500));
    }

    logger.info('Feature flag created', { key: input.key, userId: user.id });

    return applySecurityHeaders(
      success({
        flag: {
          id: flag.id,
          key: flag.key,
          name: flag.name,
          enabled: flag.enabled,
        },
      })
    );
  } catch (err) {
    logger.error('Feature flags POST error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR', 500));
  }
}

/**
 * PATCH /api/admin/features
 * Bulk update feature flags
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
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED', 401));
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return applySecurityHeaders(apiError('Admin access required', 'FORBIDDEN', 403));
    }

    const body = await request.json();
    const { updates } = z
      .object({
        updates: z.array(
          z.object({
            id: z.string().uuid(),
            enabled: z.boolean().optional(),
            rolloutPercentage: z.number().int().min(0).max(100).optional(),
          })
        ),
      })
      .parse(body);

    const results = await Promise.all(
      updates.map(async (update) => {
        const updateData: Record<string, unknown> = { updated_by: user.id };
        if (update.enabled !== undefined) updateData.enabled = update.enabled;
        if (update.rolloutPercentage !== undefined)
          updateData.rollout_percentage = update.rolloutPercentage;

        const { error } = await supabase
          .from('feature_flags')
          .update(updateData)
          .eq('id', update.id);

        return { id: update.id, success: !error };
      })
    );

    logger.info('Bulk feature flag update', { count: updates.length, userId: user.id });

    return applySecurityHeaders(success({ results }));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return applySecurityHeaders(apiError('Invalid request', 'VALIDATION_ERROR', 400));
    }
    logger.error('Feature flags PATCH error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR', 500));
  }
}
