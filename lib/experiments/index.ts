/**
 * A/B Testing & Experiments
 * Experiment management and variant assignment
 */

import crypto from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';

export interface Experiment {
  id: string;
  key: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ExperimentVariant[];
  targetingRules?: TargetingRule[];
  startDate?: string;
  endDate?: string;
  sampleSize: number; // Percentage of users to include (0-100)
  winningVariant?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentVariant {
  id: string;
  key: string;
  name: string;
  description?: string;
  weight: number; // Percentage of traffic (0-100)
  control: boolean;
  config?: Record<string, unknown>;
}

export interface TargetingRule {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'in';
  value: unknown;
}

export interface ExperimentAssignment {
  experimentKey: string;
  variantKey: string;
  userId?: string;
  sessionId?: string;
  assignedAt: string;
}

export interface ExperimentContext {
  userId?: string;
  sessionId?: string;
  attributes?: Record<string, unknown>;
}

// In-memory cache for experiments
let experimentsCache: Map<string, Experiment> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get all active experiments
 */
export async function getExperiments(): Promise<Experiment[]> {
  const now = Date.now();

  if (experimentsCache && now - cacheTimestamp < CACHE_TTL) {
    return Array.from(experimentsCache.values());
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .in('status', ['running', 'paused']);

  if (error) {
    console.error('Error fetching experiments:', error);
    return experimentsCache ? Array.from(experimentsCache.values()) : [];
  }

  experimentsCache = new Map();
  for (const exp of data || []) {
    const experiment = transformExperiment(exp);
    experimentsCache.set(experiment.key, experiment);
  }
  cacheTimestamp = now;

  return Array.from(experimentsCache.values());
}

/**
 * Get a specific experiment
 */
export async function getExperiment(key: string): Promise<Experiment | null> {
  const experiments = await getExperiments();
  return experiments.find((e) => e.key === key) || null;
}

/**
 * Assign a variant to a user/session
 */
export async function assignVariant(
  experimentKey: string,
  context: ExperimentContext
): Promise<ExperimentAssignment | null> {
  const experiment = await getExperiment(experimentKey);

  if (!experiment || experiment.status !== 'running') {
    return null;
  }

  // Check targeting rules
  if (!matchesTargeting(experiment, context)) {
    return null;
  }

  // Check sample size (use hash-based sampling for consistency)
  const sampleHash = hashForSampling(experimentKey, context);
  if (sampleHash > experiment.sampleSize) {
    return null;
  }

  // Check for existing assignment
  const existingAssignment = await getExistingAssignment(experimentKey, context);
  if (existingAssignment) {
    return existingAssignment;
  }

  // Assign variant based on weights
  const variant = selectVariant(experiment.variants, experimentKey, context);

  if (!variant) {
    return null;
  }

  // Store assignment
  const assignment: ExperimentAssignment = {
    experimentKey,
    variantKey: variant.key,
    userId: context.userId,
    sessionId: context.sessionId,
    assignedAt: new Date().toISOString(),
  };

  await storeAssignment(assignment);

  return assignment;
}

/**
 * Get variant for a user (without creating new assignment)
 */
export async function getVariant(
  experimentKey: string,
  context: ExperimentContext
): Promise<string | null> {
  const assignment = await getExistingAssignment(experimentKey, context);
  return assignment?.variantKey || null;
}

/**
 * Get all experiment assignments for a user/session
 */
export async function getAssignments(context: ExperimentContext): Promise<ExperimentAssignment[]> {
  const supabase = await createServiceClient();

  let query = supabase.from('experiment_assignments').select('*');

  if (context.userId) {
    query = query.eq('user_id', context.userId);
  } else if (context.sessionId) {
    query = query.eq('session_id', context.sessionId);
  } else {
    return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }

  return (data || []).map((a) => ({
    experimentKey: a.experiment_key,
    variantKey: a.variant_key,
    userId: a.user_id,
    sessionId: a.session_id,
    assignedAt: a.assigned_at,
  }));
}

/**
 * Track conversion for an experiment
 */
export async function trackConversion(
  experimentKey: string,
  context: ExperimentContext,
  goalKey: string,
  value?: number
): Promise<boolean> {
  const assignment = await getExistingAssignment(experimentKey, context);

  if (!assignment) {
    return false;
  }

  const supabase = await createServiceClient();

  const { error } = await supabase.from('experiment_conversions').insert({
    experiment_key: experimentKey,
    variant_key: assignment.variantKey,
    user_id: context.userId,
    session_id: context.sessionId,
    goal_key: goalKey,
    value,
  });

  if (error) {
    console.error('Error tracking conversion:', error);
    return false;
  }

  return true;
}

/**
 * Get experiment results
 */
export async function getExperimentResults(experimentKey: string): Promise<{
  variants: Array<{
    key: string;
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    avgValue?: number;
  }>;
  winner?: string;
  confidence?: number;
}> {
  const experiment = await getExperiment(experimentKey);

  if (!experiment) {
    return { variants: [] };
  }

  const supabase = await createServiceClient();

  // Get participant counts per variant
  const { data: assignments } = await supabase
    .from('experiment_assignments')
    .select('variant_key')
    .eq('experiment_key', experimentKey);

  // Get conversion counts per variant
  const { data: conversions } = await supabase
    .from('experiment_conversions')
    .select('variant_key, value')
    .eq('experiment_key', experimentKey);

  const variantStats = new Map<
    string,
    { participants: number; conversions: number; totalValue: number }
  >();

  // Initialize variants
  for (const variant of experiment.variants) {
    variantStats.set(variant.key, {
      participants: 0,
      conversions: 0,
      totalValue: 0,
    });
  }

  // Count participants
  for (const a of assignments || []) {
    const stats = variantStats.get(a.variant_key);
    if (stats) stats.participants++;
  }

  // Count conversions
  for (const c of conversions || []) {
    const stats = variantStats.get(c.variant_key);
    if (stats) {
      stats.conversions++;
      stats.totalValue += c.value || 0;
    }
  }

  const results = experiment.variants.map((variant) => {
    const stats = variantStats.get(variant.key)!;
    return {
      key: variant.key,
      name: variant.name,
      participants: stats.participants,
      conversions: stats.conversions,
      conversionRate: stats.participants > 0 ? (stats.conversions / stats.participants) * 100 : 0,
      avgValue: stats.conversions > 0 ? stats.totalValue / stats.conversions : undefined,
    };
  });

  // Calculate statistical significance (simplified)
  const controlVariant = results.find(
    (r) => experiment.variants.find((v) => v.key === r.key)?.control
  );

  let winner: string | undefined;
  let confidence: number | undefined;

  if (controlVariant) {
    const bestTreatment = results
      .filter((r) => r.key !== controlVariant.key)
      .sort((a, b) => b.conversionRate - a.conversionRate)[0];

    if (bestTreatment && bestTreatment.conversionRate > controlVariant.conversionRate) {
      // Simplified statistical significance calculation
      const uplift =
        (bestTreatment.conversionRate - controlVariant.conversionRate) /
        controlVariant.conversionRate;
      const sampleSize = Math.min(controlVariant.participants, bestTreatment.participants);

      if (uplift > 0.1 && sampleSize > 100) {
        confidence = Math.min(95, 50 + sampleSize / 10);
        if (confidence >= 95) {
          winner = bestTreatment.key;
        }
      }
    }
  }

  return { variants: results, winner, confidence };
}

// Helper functions

function transformExperiment(data: Record<string, unknown>): Experiment {
  return {
    id: data.id as string,
    key: data.key as string,
    name: data.name as string,
    description: data.description as string | undefined,
    status: data.status as Experiment['status'],
    variants: (data.variants as ExperimentVariant[]) || [],
    targetingRules: data.targeting_rules as TargetingRule[] | undefined,
    startDate: data.start_date as string | undefined,
    endDate: data.end_date as string | undefined,
    sampleSize: (data.sample_size as number) || 100,
    winningVariant: data.winning_variant as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function matchesTargeting(experiment: Experiment, context: ExperimentContext): boolean {
  if (!experiment.targetingRules || experiment.targetingRules.length === 0) {
    return true;
  }

  const attributes = context.attributes || {};

  for (const rule of experiment.targetingRules) {
    const value = attributes[rule.attribute];

    switch (rule.operator) {
      case 'equals':
        if (value !== rule.value) return false;
        break;
      case 'not_equals':
        if (value === rule.value) return false;
        break;
      case 'contains':
        if (typeof value !== 'string' || !value.includes(String(rule.value))) return false;
        break;
      case 'gt':
        if (typeof value !== 'number' || value <= (rule.value as number)) return false;
        break;
      case 'lt':
        if (typeof value !== 'number' || value >= (rule.value as number)) return false;
        break;
      case 'in':
        if (!Array.isArray(rule.value) || !rule.value.includes(value)) return false;
        break;
    }
  }

  return true;
}

function hashForSampling(experimentKey: string, context: ExperimentContext): number {
  const identifier = context.userId || context.sessionId || 'anonymous';
  const hash = crypto.createHash('md5').update(`${experimentKey}:${identifier}`).digest('hex');
  // Convert first 8 hex chars to number (0-100)
  return parseInt(hash.substring(0, 8), 16) % 100;
}

function selectVariant(
  variants: ExperimentVariant[],
  experimentKey: string,
  context: ExperimentContext
): ExperimentVariant | null {
  if (variants.length === 0) return null;

  const identifier = context.userId || context.sessionId || 'anonymous';
  const hash = crypto
    .createHash('md5')
    .update(`${experimentKey}:variant:${identifier}`)
    .digest('hex');
  const bucket = parseInt(hash.substring(0, 8), 16) % 100;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant;
    }
  }

  return variants[variants.length - 1];
}

async function getExistingAssignment(
  experimentKey: string,
  context: ExperimentContext
): Promise<ExperimentAssignment | null> {
  const supabase = await createServiceClient();

  let query = supabase
    .from('experiment_assignments')
    .select('*')
    .eq('experiment_key', experimentKey);

  if (context.userId) {
    query = query.eq('user_id', context.userId);
  } else if (context.sessionId) {
    query = query.eq('session_id', context.sessionId);
  } else {
    return null;
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  return {
    experimentKey: data.experiment_key,
    variantKey: data.variant_key,
    userId: data.user_id,
    sessionId: data.session_id,
    assignedAt: data.assigned_at,
  };
}

async function storeAssignment(assignment: ExperimentAssignment): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('experiment_assignments').insert({
    experiment_key: assignment.experimentKey,
    variant_key: assignment.variantKey,
    user_id: assignment.userId,
    session_id: assignment.sessionId,
    assigned_at: assignment.assignedAt,
  });
}

/**
 * Clear experiment cache
 */
export function clearExperimentCache(): void {
  experimentsCache = null;
  cacheTimestamp = 0;
}
