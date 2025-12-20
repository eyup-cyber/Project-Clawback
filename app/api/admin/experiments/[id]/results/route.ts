/**
 * Experiment Results API
 * Get results and statistics for an experiment
 */

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';
import { getExperimentResults } from '@/lib/experiments';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/experiments/[id]/results
 * Get experiment results
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: experimentKeyOrId } = await context.params;
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

    // Find experiment by ID or key
    let experimentKey = experimentKeyOrId;

    // Check if it's a UUID (id) vs key
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(experimentKeyOrId)) {
      const { data: experiment } = await supabase
        .from('experiments')
        .select('key')
        .eq('id', experimentKeyOrId)
        .single();

      if (!experiment) {
        return applySecurityHeaders(apiError('Experiment not found', 'NOT_FOUND', 404));
      }
      experimentKey = experiment.key;
    }

    // Get results using the library function
    const results = await getExperimentResults(experimentKey);

    return applySecurityHeaders(success(results));
  } catch (err) {
    logger.error(
      'Experiment results GET error',
      err instanceof Error ? err : new Error(String(err))
    );
    return applySecurityHeaders(apiError('Internal error', 'INTERNAL_ERROR', 500));
  }
}
