export const runtime = 'edge';

/**
 * Individual Experiment Admin API
 * Get, update, delete individual experiments
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateExperimentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'running', 'paused', 'completed']).optional(),
  winningVariant: z.string().optional(),
  sampleSize: z.number().int().min(1).max(100).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

/**
 * GET /api/admin/experiments/[id]
 * Get a single experiment
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    const { data: experiment, error } = await supabase
      .from('experiments')
      .select(
        `
        *,
        created_by_profile:profiles!created_by(username, display_name),
        updated_by_profile:profiles!updated_by(username, display_name)
      `
      )
      .eq('id', id)
      .single();

    if (error || !experiment) {
      return applySecurityHeaders(apiError('Experiment not found', 'NOT_FOUND'));
    }

    return applySecurityHeaders(
      success({
        experiment: {
          id: experiment.id,
          key: experiment.key,
          name: experiment.name,
          description: experiment.description,
          status: experiment.status,
          variants: experiment.variants,
          targetingRules: experiment.targeting_rules,
          sampleSize: experiment.sample_size,
          startDate: experiment.start_date,
          endDate: experiment.end_date,
          winningVariant: experiment.winning_variant,
          metadata: experiment.metadata,
          createdAt: experiment.created_at,
          updatedAt: experiment.updated_at,
          createdByProfile: experiment.created_by_profile,
          updatedByProfile: experiment.updated_by_profile,
        },
      })
    );
  } catch (err) {
    logger.error('Experiment GET error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}

/**
 * PATCH /api/admin/experiments/[id]
 * Update an experiment
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    // Parse body
    const body = await request.json();
    const parseResult = updateExperimentSchema.safeParse(body);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid request', 'VALIDATION_ERROR', {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const input = parseResult.data;

    // Get current experiment
    const { data: current } = await supabase
      .from('experiments')
      .select('status')
      .eq('id', id)
      .single();

    if (!current) {
      return applySecurityHeaders(apiError('Experiment not found', 'NOT_FOUND'));
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.sampleSize !== undefined) updateData.sample_size = input.sampleSize;
    if (input.startDate !== undefined) updateData.start_date = input.startDate;
    if (input.endDate !== undefined) updateData.end_date = input.endDate;
    if (input.winningVariant !== undefined) updateData.winning_variant = input.winningVariant;

    // Handle status transitions
    if (input.status !== undefined && input.status !== current.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['running'],
        running: ['paused'],
        paused: ['running', 'completed'],
        completed: [],
      };

      if (!validTransitions[current.status]?.includes(input.status)) {
        return applySecurityHeaders(
          apiError(
            `Cannot transition from ${current.status} to ${input.status}`,
            'VALIDATION_ERROR'
          )
        );
      }

      updateData.status = input.status;

      // Set start_date when starting
      if (input.status === 'running' && current.status === 'draft') {
        updateData.start_date = new Date().toISOString();
      }
    }

    // Update experiment
    const { data: updated, error } = await supabase
      .from('experiments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating experiment', error);
      return applySecurityHeaders(apiError('Failed to update experiment', 'INTERNAL_ERROR'));
    }

    logger.info('Experiment updated', { id, userId: user.id, changes: Object.keys(updateData) });

    return applySecurityHeaders(
      success({
        experiment: {
          id: updated.id,
          key: updated.key,
          name: updated.name,
          status: updated.status,
        },
      })
    );
  } catch (err) {
    logger.error('Experiment PATCH error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}

/**
 * DELETE /api/admin/experiments/[id]
 * Delete an experiment (only drafts)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    // Check experiment exists and is in draft status
    const { data: experiment } = await supabase
      .from('experiments')
      .select('status, key')
      .eq('id', id)
      .single();

    if (!experiment) {
      return applySecurityHeaders(apiError('Experiment not found', 'NOT_FOUND'));
    }

    if (experiment.status !== 'draft') {
      return applySecurityHeaders(
        apiError('Only draft experiments can be deleted', 'VALIDATION_ERROR')
      );
    }

    const { error } = await supabase.from('experiments').delete().eq('id', id);

    if (error) {
      logger.error('Error deleting experiment', error);
      return applySecurityHeaders(apiError('Failed to delete experiment', 'INTERNAL_ERROR'));
    }

    logger.info('Experiment deleted', { id, key: experiment.key, userId: user.id });

    return applySecurityHeaders(success({ deleted: true }));
  } catch (err) {
    logger.error('Experiment DELETE error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR'));
  }
}
