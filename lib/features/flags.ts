/**
 * Feature Flags System
 * Phase 60: Toggle features, gradual rollouts, and A/B testing
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: FlagType;
  value: FlagValue;
  default_value: FlagValue;
  targeting_rules: TargetingRule[];
  rollout_percentage: number;
  is_enabled: boolean;
  environment: Environment;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type FlagType = 'boolean' | 'string' | 'number' | 'json';
export type FlagValue = boolean | string | number | Record<string, unknown>;
export type Environment = 'development' | 'staging' | 'production' | 'all';

export interface TargetingRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  value: FlagValue;
  priority: number;
  is_enabled: boolean;
}

export interface RuleCondition {
  attribute: string;
  operator: ConditionOperator;
  value: string | string[] | number | boolean;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'is_true'
  | 'is_false'
  | 'is_set'
  | 'is_not_set';

export interface EvaluationContext {
  user_id?: string;
  email?: string;
  role?: string;
  plan?: string;
  country?: string;
  device?: string;
  browser?: string;
  app_version?: string;
  custom?: Record<string, unknown>;
}

export interface FlagEvaluation {
  key: string;
  value: FlagValue;
  reason: EvaluationReason;
  rule_id?: string;
}

export type EvaluationReason =
  | 'default'
  | 'disabled'
  | 'targeting_match'
  | 'rollout'
  | 'error';

export interface FlagAuditEntry {
  id: string;
  flag_id: string;
  action: 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled';
  changes: Record<string, { old: unknown; new: unknown }>;
  performed_by: string;
  created_at: string;
}

// ============================================================================
// FLAG MANAGEMENT
// ============================================================================

/**
 * Create a new feature flag
 */
export async function createFlag(
  input: Pick<FeatureFlag, 'key' | 'name' | 'type' | 'default_value'> &
    Partial<Pick<FeatureFlag, 'description' | 'environment' | 'tags' | 'is_enabled'>>
): Promise<FeatureFlag> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check for duplicate key
  const { data: existing } = await supabase
    .from('feature_flags')
    .select('id')
    .eq('key', input.key)
    .single();

  if (existing) {
    throw new Error('A flag with this key already exists');
  }

  const { data, error } = await supabase
    .from('feature_flags')
    .insert({
      key: input.key,
      name: input.name,
      description: input.description || null,
      type: input.type,
      value: input.default_value,
      default_value: input.default_value,
      targeting_rules: [],
      rollout_percentage: 100,
      is_enabled: input.is_enabled ?? false,
      environment: input.environment || 'all',
      tags: input.tags || [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Features] Failed to create flag', error);
    throw error;
  }

  // Audit log
  await createAuditEntry(data.id, 'created', {}, user.id);

  logger.info('[Features] Flag created', { flag_key: input.key });
  return data as FeatureFlag;
}

/**
 * Update a feature flag
 */
export async function updateFlag(
  flagId: string,
  updates: Partial<Pick<FeatureFlag, 'name' | 'description' | 'value' | 'targeting_rules' | 'rollout_percentage' | 'is_enabled' | 'environment' | 'tags'>>
): Promise<FeatureFlag> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get current values for audit
  const { data: current } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('id', flagId)
    .single();

  if (!current) {
    throw new Error('Flag not found');
  }

  const { data, error } = await supabase
    .from('feature_flags')
    .update(updates)
    .eq('id', flagId)
    .select()
    .single();

  if (error) {
    logger.error('[Features] Failed to update flag', error);
    throw error;
  }

  // Build changes for audit
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (JSON.stringify(current[key]) !== JSON.stringify(value)) {
      changes[key] = { old: current[key], new: value };
    }
  }

  if (Object.keys(changes).length > 0) {
    const action = 'is_enabled' in changes
      ? (updates.is_enabled ? 'enabled' : 'disabled')
      : 'updated';
    await createAuditEntry(flagId, action, changes, user.id);
  }

  return data as FeatureFlag;
}

/**
 * Delete a feature flag
 */
export async function deleteFlag(flagId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  await createAuditEntry(flagId, 'deleted', {}, user.id);

  const { error } = await supabase.from('feature_flags').delete().eq('id', flagId);

  if (error) {
    throw error;
  }
}

/**
 * Get a flag by key
 */
export async function getFlag(key: string): Promise<FeatureFlag | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as FeatureFlag;
}

/**
 * List all flags
 */
export async function listFlags(options: {
  environment?: Environment;
  tags?: string[];
  search?: string;
} = {}): Promise<FeatureFlag[]> {
  const supabase = await createClient();

  let query = supabase.from('feature_flags').select('*');

  if (options.environment && options.environment !== 'all') {
    query = query.or(`environment.eq.${options.environment},environment.eq.all`);
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  if (options.search) {
    query = query.or(`key.ilike.%${options.search}%,name.ilike.%${options.search}%`);
  }

  const { data, error } = await query.order('key');

  if (error) {
    throw error;
  }

  return (data || []) as FeatureFlag[];
}

// ============================================================================
// FLAG EVALUATION
// ============================================================================

/**
 * Evaluate a flag for a given context
 */
export async function evaluateFlag(
  key: string,
  context: EvaluationContext = {}
): Promise<FlagEvaluation> {
  const flag = await getFlag(key);

  if (!flag) {
    return {
      key,
      value: false,
      reason: 'default',
    };
  }

  // Check if flag is enabled
  if (!flag.is_enabled) {
    return {
      key,
      value: flag.default_value,
      reason: 'disabled',
    };
  }

  // Check targeting rules (in priority order)
  const sortedRules = [...flag.targeting_rules]
    .filter((r) => r.is_enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (evaluateRule(rule, context)) {
      return {
        key,
        value: rule.value,
        reason: 'targeting_match',
        rule_id: rule.id,
      };
    }
  }

  // Check rollout percentage
  if (flag.rollout_percentage < 100) {
    const hash = hashContext(key, context);
    const bucket = hash % 100;

    if (bucket >= flag.rollout_percentage) {
      return {
        key,
        value: flag.default_value,
        reason: 'rollout',
      };
    }
  }

  return {
    key,
    value: flag.value,
    reason: 'default',
  };
}

/**
 * Evaluate multiple flags at once
 */
export async function evaluateFlags(
  keys: string[],
  context: EvaluationContext = {}
): Promise<Record<string, FlagEvaluation>> {
  const results: Record<string, FlagEvaluation> = {};

  await Promise.all(
    keys.map(async (key) => {
      results[key] = await evaluateFlag(key, context);
    })
  );

  return results;
}

/**
 * Simple isEnabled check
 */
export async function isEnabled(
  key: string,
  context: EvaluationContext = {}
): Promise<boolean> {
  const evaluation = await evaluateFlag(key, context);
  return evaluation.value === true;
}

/**
 * Get flag value with type
 */
export async function getFlagValue<T extends FlagValue>(
  key: string,
  defaultValue: T,
  context: EvaluationContext = {}
): Promise<T> {
  const evaluation = await evaluateFlag(key, context);
  return (evaluation.value as T) ?? defaultValue;
}

// ============================================================================
// RULE EVALUATION
// ============================================================================

/**
 * Evaluate a targeting rule against context
 */
function evaluateRule(rule: TargetingRule, context: EvaluationContext): boolean {
  // All conditions must match (AND)
  return rule.conditions.every((condition) => evaluateCondition(condition, context));
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition: RuleCondition, context: EvaluationContext): boolean {
  const contextValue = getContextValue(context, condition.attribute);
  const conditionValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return contextValue === conditionValue;

    case 'not_equals':
      return contextValue !== conditionValue;

    case 'contains':
      return String(contextValue).includes(String(conditionValue));

    case 'not_contains':
      return !String(contextValue).includes(String(conditionValue));

    case 'starts_with':
      return String(contextValue).startsWith(String(conditionValue));

    case 'ends_with':
      return String(contextValue).endsWith(String(conditionValue));

    case 'greater_than':
      return Number(contextValue) > Number(conditionValue);

    case 'less_than':
      return Number(contextValue) < Number(conditionValue);

    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(contextValue);

    case 'not_in':
      return Array.isArray(conditionValue) && !conditionValue.includes(contextValue);

    case 'is_true':
      return contextValue === true;

    case 'is_false':
      return contextValue === false;

    case 'is_set':
      return contextValue !== undefined && contextValue !== null;

    case 'is_not_set':
      return contextValue === undefined || contextValue === null;

    default:
      return false;
  }
}

/**
 * Get value from context by attribute path
 */
function getContextValue(context: EvaluationContext, attribute: string): unknown {
  // Handle nested attributes (e.g., "custom.company_size")
  const parts = attribute.split('.');
  let value: unknown = context;

  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Hash context for consistent rollout bucketing
 */
function hashContext(flagKey: string, context: EvaluationContext): number {
  const identifier = context.user_id || context.email || 'anonymous';
  const str = `${flagKey}:${identifier}`;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash);
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Create an audit entry
 */
async function createAuditEntry(
  flagId: string,
  action: FlagAuditEntry['action'],
  changes: Record<string, { old: unknown; new: unknown }>,
  userId: string
): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('feature_flag_audit').insert({
    flag_id: flagId,
    action,
    changes,
    performed_by: userId,
  });
}

/**
 * Get audit history for a flag
 */
export async function getFlagAuditHistory(
  flagId: string,
  limit: number = 50
): Promise<FlagAuditEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('feature_flag_audit')
    .select('*')
    .eq('flag_id', flagId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as FlagAuditEntry[];
}

// ============================================================================
// PRESETS AND HELPERS
// ============================================================================

/**
 * Create a percentage rollout rule
 */
export function createPercentageRollout(percentage: number): Partial<FeatureFlag> {
  return {
    rollout_percentage: percentage,
  };
}

/**
 * Create a user targeting rule
 */
export function createUserTargetingRule(
  userIds: string[],
  value: FlagValue = true
): TargetingRule {
  return {
    id: crypto.randomUUID(),
    name: 'User targeting',
    conditions: [
      {
        attribute: 'user_id',
        operator: 'in',
        value: userIds,
      },
    ],
    value,
    priority: 1,
    is_enabled: true,
  };
}

/**
 * Create a role-based rule
 */
export function createRoleRule(
  roles: string[],
  value: FlagValue = true
): TargetingRule {
  return {
    id: crypto.randomUUID(),
    name: 'Role targeting',
    conditions: [
      {
        attribute: 'role',
        operator: 'in',
        value: roles,
      },
    ],
    value,
    priority: 2,
    is_enabled: true,
  };
}

/**
 * Create an environment rule
 */
export function createEnvironmentRule(
  environments: Environment[],
  value: FlagValue = true
): TargetingRule {
  return {
    id: crypto.randomUUID(),
    name: 'Environment targeting',
    conditions: [
      {
        attribute: 'environment',
        operator: 'in',
        value: environments,
      },
    ],
    value,
    priority: 0,
    is_enabled: true,
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize common feature flags
 */
export async function initializeDefaultFlags(): Promise<void> {
  const defaultFlags: Array<Parameters<typeof createFlag>[0]> = [
    {
      key: 'dark_mode',
      name: 'Dark Mode',
      type: 'boolean',
      default_value: true,
      description: 'Enable dark mode theme option',
      tags: ['ui', 'theme'],
    },
    {
      key: 'new_editor',
      name: 'New Editor',
      type: 'boolean',
      default_value: false,
      description: 'Enable the new rich text editor',
      tags: ['editor', 'beta'],
    },
    {
      key: 'ai_suggestions',
      name: 'AI Suggestions',
      type: 'boolean',
      default_value: false,
      description: 'Enable AI-powered content suggestions',
      tags: ['ai', 'beta'],
    },
    {
      key: 'social_login_providers',
      name: 'Social Login Providers',
      type: 'json',
      default_value: { google: true, github: true, twitter: false },
      description: 'Configure which social login providers are enabled',
      tags: ['auth', 'social'],
    },
    {
      key: 'max_upload_size_mb',
      name: 'Max Upload Size',
      type: 'number',
      default_value: 10,
      description: 'Maximum file upload size in megabytes',
      tags: ['media', 'limits'],
    },
  ];

  for (const flag of defaultFlags) {
    try {
      const existing = await getFlag(flag.key);
      if (!existing) {
        await createFlag({ ...flag, is_enabled: true });
      }
    } catch {
      // Silently continue
    }
  }
}
