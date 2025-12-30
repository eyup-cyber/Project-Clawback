/**
 * Experiments Admin API
 * CRUD operations for A/B experiments
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';

// Validation schemas
const variantSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  weight: z.number().int().min(0).max(100),
  control: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const createExperimentSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  variants: z.array(variantSchema).min(2),
  targetingRules: z
    .array(
      z.object({
        attribute: z.string(),
        operator: z.enum(['equals', 'not_equals', 'contains', 'gt', 'lt', 'in']),
        value: z.unknown(),
      })
    )
    .optional(),
  sampleSize: z.number().int().min(1).max(100).optional().default(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/admin/experiments
 * List all experiments (admin only)
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
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED'));
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return applySecurityHeaders(apiError('Admin access required', 'FORBIDDEN'));
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('experiments')
      .select(
        `
        *,
        created_by_profile:profiles!created_by(username, display_name),
        updated_by_profile:profiles!updated_by(username, display_name)
      `
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: experiments, error } = await query;

    if (error) {
      logger.error('Error fetching experiments', error);
      return applySecurityHeaders(apiError('Failed to fetch experiments', 'INTERNAL_ERROR'));
    }

    // Transform to camelCase
    const transformedExperiments = (experiments || []).map((e) => ({
      id: e.id,
      key: e.key,
      name: e.name,
      description: e.description,
      status: e.status,
      variants: e.variants || [],
      targetingRules: e.targeting_rules,
      sampleSize: e.sample_size,
      startDate: e.start_date,
      endDate: e.end_date,
      winningVariant: e.winning_variant,
      metadata: e.metadata,
      createdBy: e.created_by,
      updatedBy: e.updated_by,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      createdByProfile: e.created_by_profile,
      updatedByProfile: e.updated_by_profile,
    }));

    return applySecurityHeaders(success({ experiments: transformedExperiments }));
  } catch (err) {
    logger.error('Experiments GET error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}

/**
 * POST /api/admin/experiments
 * Create a new experiment
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

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return applySecurityHeaders(apiError('Admin access required', 'FORBIDDEN'));
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = createExperimentSchema.safeParse(body);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid request', 'VALIDATION_ERROR', {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const input = parseResult.data;

    // Validate variant weights sum to 100
    const totalWeight = input.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      return applySecurityHeaders(apiError('Variant weights must sum to 100%', 'VALIDATION_ERROR'));
    }

    // Ensure exactly one control variant
    const controlCount = input.variants.filter((v) => v.control).length;
    if (controlCount !== 1) {
      return applySecurityHeaders(
        apiError('Exactly one variant must be marked as control', 'VALIDATION_ERROR')
      );
    }

    // Check if key already exists
    const { data: existing } = await supabase
      .from('experiments')
      .select('id')
      .eq('key', input.key)
      .single();

    if (existing) {
      return applySecurityHeaders(apiError('Experiment key already exists', 'CONFLICT'));
    }

    // Add IDs to variants
    const variantsWithIds = input.variants.map((v, i) => ({
      ...v,
      id: `${input.key}_variant_${i}`,
    }));

    // Create experiment
    const { data: experiment, error } = await supabase
      .from('experiments')
      .insert({
        key: input.key,
        name: input.name,
        description: input.description,
        status: 'draft',
        variants: variantsWithIds,
        targeting_rules: input.targetingRules,
        sample_size: input.sampleSize,
        start_date: input.startDate,
        end_date: input.endDate,
        metadata: input.metadata || {},
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating experiment', error);
      return applySecurityHeaders(apiError('Failed to create experiment', 'INTERNAL_ERROR'));
    }

    logger.info('Experiment created', { key: input.key, userId: user.id });

    return applySecurityHeaders(
      success({
        experiment: {
          id: experiment.id,
          key: experiment.key,
          name: experiment.name,
          status: experiment.status,
        },
      })
    );
  } catch (err) {
    logger.error('Experiments POST error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}
