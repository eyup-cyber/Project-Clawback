// @ts-nocheck
/**
 * A/B Testing Framework
 * Phase 34: Experiment setup, variant assignment, results analysis
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface Experiment {
  id: string;
  name: string;
  description: string | null;
  hypothesis: string | null;
  type: ExperimentType;
  status: ExperimentStatus;
  variants: Variant[];
  targeting: TargetingRules;
  metrics: ExperimentMetrics;
  traffic_allocation: number; // 0-100 percentage of traffic
  started_at: string | null;
  ended_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ExperimentType = 'ab' | 'multivariate' | 'bandit';
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

export interface Variant {
  id: string;
  name: string;
  description: string | null;
  weight: number; // Distribution weight (must sum to 100 across variants)
  is_control: boolean;
  config: Record<string, unknown>; // Variant-specific configuration
}

export interface TargetingRules {
  user_segments?: string[];
  user_attributes?: Record<string, unknown>;
  url_patterns?: string[];
  device_types?: ('desktop' | 'mobile' | 'tablet')[];
  browsers?: string[];
  countries?: string[];
  languages?: string[];
  is_logged_in?: boolean;
  min_sessions?: number;
  custom_rules?: CustomRule[];
}

export interface CustomRule {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'lt'
    | 'gte'
    | 'lte'
    | 'contains'
    | 'not_contains'
    | 'in'
    | 'not_in';
  value: unknown;
}

export interface ExperimentMetrics {
  primary_metric: string;
  secondary_metrics: string[];
  guardrail_metrics: string[];
  minimum_sample_size: number;
  minimum_effect_size: number;
  confidence_level: number; // 0.9, 0.95, 0.99
}

export interface ExperimentAssignment {
  id: string;
  experiment_id: string;
  user_id: string | null;
  visitor_id: string;
  variant_id: string;
  assigned_at: string;
  context: AssignmentContext;
}

export interface AssignmentContext {
  url: string;
  device_type: string;
  browser: string;
  country?: string;
  language?: string;
  user_agent: string;
  referrer?: string;
}

export interface ExperimentEvent {
  id: string;
  experiment_id: string;
  variant_id: string;
  user_id: string | null;
  visitor_id: string;
  event_type: string;
  event_value: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ExperimentResults {
  experiment_id: string;
  variants: VariantResults[];
  winner: string | null;
  statistical_significance: number;
  confidence_interval: [number, number];
  sample_size: number;
  duration_days: number;
  recommendation: string;
}

export interface VariantResults {
  variant_id: string;
  variant_name: string;
  is_control: boolean;
  sample_size: number;
  conversion_rate: number;
  conversion_rate_change: number; // vs control
  confidence_interval: [number, number];
  events: Record<string, number>;
}

// ============================================================================
// EXPERIMENT MANAGEMENT
// ============================================================================

/**
 * Create a new experiment
 */
export async function createExperiment(
  createdBy: string,
  experiment: Omit<
    Experiment,
    'id' | 'status' | 'created_by' | 'created_at' | 'updated_at' | 'started_at' | 'ended_at'
  >
): Promise<Experiment> {
  const supabase = await createClient();

  // Validate variants sum to 100
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight !== 100) {
    throw new Error('Variant weights must sum to 100');
  }

  // Ensure exactly one control
  const controls = experiment.variants.filter((v) => v.is_control);
  if (controls.length !== 1) {
    throw new Error('Exactly one variant must be marked as control');
  }

  const { data, error } = await supabase
    .from('experiments')
    .insert({
      ...experiment,
      status: 'draft',
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    logger.error('[A/B Testing] Failed to create experiment', error);
    throw error;
  }

  logger.info('[A/B Testing] Experiment created', {
    experimentId: data.id,
    name: experiment.name,
  });

  return data as Experiment;
}

/**
 * Get an experiment
 */
export async function getExperiment(experimentId: string): Promise<Experiment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .eq('id', experimentId)
    .single();

  if (error) return null;
  return data as Experiment;
}

/**
 * Update an experiment
 */
export async function updateExperiment(
  experimentId: string,
  updates: Partial<Omit<Experiment, 'id' | 'created_by' | 'created_at'>>
): Promise<Experiment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('experiments')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', experimentId)
    .select()
    .single();

  if (error) {
    logger.error('[A/B Testing] Failed to update experiment', error);
    throw error;
  }

  return data as Experiment;
}

/**
 * Start an experiment
 */
export async function startExperiment(experimentId: string): Promise<Experiment> {
  return updateExperiment(experimentId, {
    status: 'running',
    started_at: new Date().toISOString(),
  });
}

/**
 * Pause an experiment
 */
export async function pauseExperiment(experimentId: string): Promise<Experiment> {
  return updateExperiment(experimentId, { status: 'paused' });
}

/**
 * End an experiment
 */
export async function endExperiment(experimentId: string): Promise<Experiment> {
  return updateExperiment(experimentId, {
    status: 'completed',
    ended_at: new Date().toISOString(),
  });
}

/**
 * List experiments
 */
export async function listExperiments(options: {
  status?: ExperimentStatus;
  type?: ExperimentType;
  limit?: number;
  offset?: number;
}): Promise<{ experiments: Experiment[]; total: number }> {
  const { status, type, limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  let query = supabase
    .from('experiments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  const { data, count, error } = await query;

  if (error) {
    logger.error('[A/B Testing] Failed to list experiments', error);
    throw error;
  }

  return {
    experiments: (data || []) as Experiment[],
    total: count || 0,
  };
}

// ============================================================================
// VARIANT ASSIGNMENT
// ============================================================================

/**
 * Get or assign a variant for a user/visitor
 */
export async function getVariantAssignment(
  experimentId: string,
  visitorId: string,
  userId?: string,
  context?: Partial<AssignmentContext>
): Promise<{ variant: Variant; isNew: boolean } | null> {
  const supabase = await createServiceClient();

  // Get experiment
  const experiment = await getExperiment(experimentId);
  if (!experiment || experiment.status !== 'running') {
    return null;
  }

  // Check if user is in target audience
  if (!isUserInTarget(experiment.targeting, context, userId)) {
    return null;
  }

  // Check traffic allocation
  if (!isInTrafficAllocation(visitorId, experiment.traffic_allocation)) {
    return null;
  }

  // Check for existing assignment
  const { data: existing } = await supabase
    .from('experiment_assignments')
    .select('variant_id')
    .eq('experiment_id', experimentId)
    .eq('visitor_id', visitorId)
    .single();

  if (existing) {
    const variant = experiment.variants.find((v) => v.id === existing.variant_id);
    if (variant) {
      return { variant, isNew: false };
    }
  }

  // Assign new variant
  const variant = assignVariant(visitorId, experiment.variants);

  const { error } = await supabase.from('experiment_assignments').insert({
    experiment_id: experimentId,
    user_id: userId || null,
    visitor_id: visitorId,
    variant_id: variant.id,
    context: context || {},
  });

  if (error) {
    logger.error('[A/B Testing] Failed to create assignment', error);
    throw error;
  }

  logger.debug('[A/B Testing] Variant assigned', {
    experimentId,
    visitorId,
    variantId: variant.id,
  });

  return { variant, isNew: true };
}

/**
 * Check if user matches targeting rules
 */
function isUserInTarget(
  targeting: TargetingRules,
  context?: Partial<AssignmentContext>,
  _userId?: string
): boolean {
  // Check device type
  if (targeting.device_types?.length && context?.device_type) {
    if (!targeting.device_types.includes(context.device_type as 'desktop' | 'mobile' | 'tablet')) {
      return false;
    }
  }

  // Check browser
  if (targeting.browsers?.length && context?.browser) {
    if (!targeting.browsers.some((b) => context.browser?.toLowerCase().includes(b.toLowerCase()))) {
      return false;
    }
  }

  // Check country
  if (targeting.countries?.length && context?.country) {
    if (!targeting.countries.includes(context.country)) {
      return false;
    }
  }

  // Check URL patterns
  if (targeting.url_patterns?.length && context?.url) {
    const matchesPattern = targeting.url_patterns.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(context.url);
    });
    if (!matchesPattern) return false;
  }

  // Check custom rules
  if (targeting.custom_rules?.length) {
    for (const rule of targeting.custom_rules) {
      if (!evaluateCustomRule(rule, context)) {
        return false;
      }
    }
  }

  return true;
}

function evaluateCustomRule(rule: CustomRule, context?: Partial<AssignmentContext>): boolean {
  const value = context?.[rule.field as keyof AssignmentContext];
  if (value === undefined) return true; // Skip if field not available

  switch (rule.operator) {
    case 'eq':
      return value === rule.value;
    case 'neq':
      return value !== rule.value;
    case 'gt':
      return (value as number) > (rule.value as number);
    case 'lt':
      return (value as number) < (rule.value as number);
    case 'gte':
      return (value as number) >= (rule.value as number);
    case 'lte':
      return (value as number) <= (rule.value as number);
    case 'contains':
      return String(value).includes(String(rule.value));
    case 'not_contains':
      return !String(value).includes(String(rule.value));
    case 'in':
      return (rule.value as unknown[]).includes(value);
    case 'not_in':
      return !(rule.value as unknown[]).includes(value);
    default:
      return true;
  }
}

/**
 * Check if visitor is in traffic allocation
 */
function isInTrafficAllocation(visitorId: string, allocation: number): boolean {
  // Use consistent hashing to determine allocation
  const hash = hashString(visitorId);
  const bucket = hash % 100;
  return bucket < allocation;
}

/**
 * Assign a variant based on weights
 */
function assignVariant(visitorId: string, variants: Variant[]): Variant {
  const hash = hashString(visitorId + 'variant');
  const bucket = hash % 100;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant
  return variants[variants.length - 1];
}

/**
 * Simple hash function for consistent bucketing
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Track an experiment event
 */
export async function trackExperimentEvent(
  experimentId: string,
  variantId: string,
  visitorId: string,
  eventType: string,
  options?: {
    userId?: string;
    eventValue?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('experiment_events').insert({
    experiment_id: experimentId,
    variant_id: variantId,
    visitor_id: visitorId,
    user_id: options?.userId || null,
    event_type: eventType,
    event_value: options?.eventValue || null,
    metadata: options?.metadata || {},
  });

  if (error) {
    logger.error('[A/B Testing] Failed to track event', error);
    throw error;
  }
}

/**
 * Track conversion event
 */
export async function trackConversion(
  experimentId: string,
  visitorId: string,
  conversionValue?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createServiceClient();

  // Get assignment
  const { data: assignment } = await supabase
    .from('experiment_assignments')
    .select('variant_id')
    .eq('experiment_id', experimentId)
    .eq('visitor_id', visitorId)
    .single();

  if (!assignment) {
    logger.warn('[A/B Testing] No assignment found for conversion', {
      experimentId,
      visitorId,
    });
    return;
  }

  await trackExperimentEvent(experimentId, assignment.variant_id, visitorId, 'conversion', {
    eventValue: conversionValue,
    metadata,
  });
}

// ============================================================================
// RESULTS ANALYSIS
// ============================================================================

/**
 * Get experiment results
 */
export async function getExperimentResults(experimentId: string): Promise<ExperimentResults> {
  const supabase = await createServiceClient();

  const experiment = await getExperiment(experimentId);
  if (!experiment) throw new Error('Experiment not found');

  // Get all assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('experiment_assignments')
    .select('variant_id')
    .eq('experiment_id', experimentId);

  if (assignmentsError) throw assignmentsError;

  // Get all events
  const { data: events, error: eventsError } = await supabase
    .from('experiment_events')
    .select('variant_id, event_type, event_value')
    .eq('experiment_id', experimentId);

  if (eventsError) throw eventsError;

  // Calculate results per variant
  const variantResults: VariantResults[] = [];
  let controlConversionRate = 0;

  for (const variant of experiment.variants) {
    const variantAssignments = (assignments || []).filter((a) => a.variant_id === variant.id);
    const variantEvents = (events || []).filter((e) => e.variant_id === variant.id);
    const conversions = variantEvents.filter((e) => e.event_type === 'conversion');

    const sampleSize = variantAssignments.length;
    const conversionRate = sampleSize > 0 ? conversions.length / sampleSize : 0;

    if (variant.is_control) {
      controlConversionRate = conversionRate;
    }

    // Calculate confidence interval (Wilson score interval)
    const confidenceInterval = calculateWilsonInterval(conversions.length, sampleSize, 0.95);

    // Count events by type
    const eventCounts: Record<string, number> = {};
    variantEvents.forEach((e) => {
      eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
    });

    variantResults.push({
      variant_id: variant.id,
      variant_name: variant.name,
      is_control: variant.is_control,
      sample_size: sampleSize,
      conversion_rate: conversionRate,
      conversion_rate_change: 0, // Will be calculated after
      confidence_interval: confidenceInterval,
      events: eventCounts,
    });
  }

  // Calculate relative change vs control
  variantResults.forEach((result) => {
    if (!result.is_control && controlConversionRate > 0) {
      result.conversion_rate_change =
        ((result.conversion_rate - controlConversionRate) / controlConversionRate) * 100;
    }
  });

  // Determine winner and significance
  const { winner, significance } = determineWinner(
    variantResults,
    experiment.metrics.confidence_level
  );

  // Calculate duration
  const startDate = experiment.started_at ? new Date(experiment.started_at) : new Date();
  const endDate = experiment.ended_at ? new Date(experiment.ended_at) : new Date();
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    experiment_id: experimentId,
    variants: variantResults,
    winner,
    statistical_significance: significance,
    confidence_interval: [0, 0], // Overall CI
    sample_size: (assignments || []).length,
    duration_days: durationDays,
    recommendation: generateRecommendation(variantResults, significance, experiment.metrics),
  };
}

/**
 * Calculate Wilson score confidence interval
 */
function calculateWilsonInterval(
  successes: number,
  trials: number,
  confidenceLevel: number
): [number, number] {
  if (trials === 0) return [0, 0];

  // Z-score for confidence level
  const zScores: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  const z = zScores[confidenceLevel] || 1.96;

  const phat = successes / trials;
  const denominator = 1 + (z * z) / trials;

  const center = (phat + (z * z) / (2 * trials)) / denominator;
  const margin =
    (z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * trials)) / trials)) / denominator;

  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

/**
 * Determine experiment winner
 */
function determineWinner(
  variants: VariantResults[],
  confidenceLevel: number
): { winner: string | null; significance: number } {
  const control = variants.find((v) => v.is_control);
  if (!control) return { winner: null, significance: 0 };

  let bestVariant: VariantResults | null = null;
  let bestSignificance = 0;

  for (const variant of variants) {
    if (variant.is_control) continue;

    // Simple chi-square test
    const significance = calculateSignificance(control, variant);

    if (significance >= confidenceLevel && variant.conversion_rate > control.conversion_rate) {
      if (!bestVariant || variant.conversion_rate > bestVariant.conversion_rate) {
        bestVariant = variant;
        bestSignificance = significance;
      }
    }
  }

  return {
    winner: bestVariant?.variant_id || null,
    significance: bestSignificance,
  };
}

/**
 * Calculate statistical significance
 */
function calculateSignificance(control: VariantResults, variant: VariantResults): number {
  const n1 = control.sample_size;
  const n2 = variant.sample_size;

  if (n1 === 0 || n2 === 0) return 0;

  const p1 = control.conversion_rate;
  const p2 = variant.conversion_rate;
  const p = (p1 * n1 + p2 * n2) / (n1 + n2);

  if (p === 0 || p === 1) return 0;

  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (se === 0) return 0;

  const z = Math.abs(p2 - p1) / se;

  // Convert z-score to p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(z));

  return 1 - pValue;
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Generate recommendation based on results
 */
function generateRecommendation(
  variants: VariantResults[],
  significance: number,
  metrics: ExperimentMetrics
): string {
  const control = variants.find((v) => v.is_control);
  const winner = variants.find(
    (v) => !v.is_control && v.conversion_rate > (control?.conversion_rate || 0)
  );

  if (!winner) {
    return 'No variant outperformed the control. Consider running the experiment longer or testing different variations.';
  }

  if (significance < metrics.confidence_level) {
    return `The results are not yet statistically significant (${(significance * 100).toFixed(1)}% vs ${metrics.confidence_level * 100}% required). Continue running the experiment.`;
  }

  const totalSamples = variants.reduce((sum, v) => sum + v.sample_size, 0);
  if (totalSamples < metrics.minimum_sample_size) {
    return `More samples needed (${totalSamples} vs ${metrics.minimum_sample_size} minimum). Continue running the experiment.`;
  }

  const lift = winner.conversion_rate_change;
  if (Math.abs(lift) < metrics.minimum_effect_size * 100) {
    return `The effect size (${lift.toFixed(2)}%) is below the minimum detectable effect (${metrics.minimum_effect_size * 100}%). The difference may not be practically significant.`;
  }

  return `Variant "${winner.variant_name}" is the winner with ${lift.toFixed(2)}% improvement over control. Statistical significance: ${(significance * 100).toFixed(1)}%. Recommend implementing this variant.`;
}

export default {
  createExperiment,
  getExperiment,
  updateExperiment,
  startExperiment,
  pauseExperiment,
  endExperiment,
  listExperiments,
  getVariantAssignment,
  trackExperimentEvent,
  trackConversion,
  getExperimentResults,
};
