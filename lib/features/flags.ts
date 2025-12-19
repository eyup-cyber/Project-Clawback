/**
 * Feature Flag Service
 * Enables controlled feature rollouts and A/B testing
 */

import { createServiceClient } from '@/lib/supabase/server';
import { cache } from '@/lib/cache';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  userTargeting: {
    includeUserIds?: string[];
    excludeUserIds?: string[];
    includeRoles?: string[];
    excludeRoles?: string[];
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  userTargeting?: FeatureFlag['userTargeting'];
}

const CACHE_TTL = 60; // 1 minute cache
const CACHE_PREFIX = 'feature:';

/**
 * Get all feature flags
 */
export async function getAllFlags(): Promise<FeatureFlag[]> {
  return cache.fetch(
    `${CACHE_PREFIX}all`,
    async () => {
      const supabase = await createServiceClient();
      
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('key');

      if (error) {
        console.error('Failed to fetch feature flags:', error);
        return [];
      }

      return data.map(transformFlag);
    },
    { ttl: CACHE_TTL }
  );
}

/**
 * Get a single feature flag by key
 */
export async function getFlag(key: string): Promise<FeatureFlag | null> {
  return cache.fetch(
    `${CACHE_PREFIX}${key}`,
    async () => {
      const supabase = await createServiceClient();
      
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('key', key)
        .single();

      if (error || !data) {
        return null;
      }

      return transformFlag(data);
    },
    { ttl: CACHE_TTL }
  );
}

/**
 * Check if a feature is enabled for a specific user
 */
export async function isFeatureEnabled(
  key: string,
  context?: {
    userId?: string;
    userRole?: string;
    attributes?: Record<string, unknown>;
  }
): Promise<boolean> {
  const flag = await getFlag(key);
  
  if (!flag) {
    // Unknown flags are disabled by default
    return false;
  }

  // Check if globally disabled
  if (!flag.enabled) {
    return false;
  }

  // Check user targeting
  if (context && flag.userTargeting) {
    const { includeUserIds, excludeUserIds, includeRoles, excludeRoles } = flag.userTargeting;

    // Check excluded users
    if (excludeUserIds?.includes(context.userId || '')) {
      return false;
    }

    // Check excluded roles
    if (excludeRoles?.includes(context.userRole || '')) {
      return false;
    }

    // Check included users (whitelist)
    if (includeUserIds?.length && includeUserIds.includes(context.userId || '')) {
      return true;
    }

    // Check included roles (whitelist)
    if (includeRoles?.length && includeRoles.includes(context.userRole || '')) {
      return true;
    }

    // If there's a whitelist but user isn't in it, check percentage rollout
    if (includeUserIds?.length || includeRoles?.length) {
      if (!includeUserIds?.includes(context.userId || '') && !includeRoles?.includes(context.userRole || '')) {
        return isInRolloutPercentage(key, context.userId, flag.rolloutPercentage);
      }
    }
  }

  // Check percentage rollout
  return isInRolloutPercentage(key, context?.userId, flag.rolloutPercentage);
}

/**
 * Deterministic percentage check based on user ID
 */
function isInRolloutPercentage(key: string, userId?: string, percentage?: number): boolean {
  if (!percentage || percentage === 0) return false;
  if (percentage >= 100) return true;

  // Use deterministic hash for consistent user experience
  const identifier = userId || 'anonymous';
  const hash = simpleHash(`${key}:${identifier}`);
  const bucket = hash % 100;

  return bucket < percentage;
}

/**
 * Simple hash function for deterministic bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Create a new feature flag
 */
export async function createFlag(input: FeatureFlagInput): Promise<FeatureFlag | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('feature_flags')
    .insert({
      key: input.key,
      name: input.name,
      description: input.description,
      enabled: input.enabled ?? false,
      rollout_percentage: input.rolloutPercentage ?? 0,
      user_targeting: input.userTargeting,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create feature flag:', error);
    return null;
  }

  // Invalidate cache
  await cache.del(`${CACHE_PREFIX}all`);

  return transformFlag(data);
}

/**
 * Update a feature flag
 */
export async function updateFlag(
  key: string,
  updates: Partial<FeatureFlagInput>
): Promise<FeatureFlag | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('feature_flags')
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
      ...(updates.rolloutPercentage !== undefined && { rollout_percentage: updates.rolloutPercentage }),
      ...(updates.userTargeting !== undefined && { user_targeting: updates.userTargeting }),
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)
    .select()
    .single();

  if (error) {
    console.error('Failed to update feature flag:', error);
    return null;
  }

  // Invalidate cache
  await cache.del(`${CACHE_PREFIX}${key}`);
  await cache.del(`${CACHE_PREFIX}all`);

  return transformFlag(data);
}

/**
 * Delete a feature flag
 */
export async function deleteFlag(key: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('feature_flags')
    .delete()
    .eq('key', key);

  if (error) {
    console.error('Failed to delete feature flag:', error);
    return false;
  }

  // Invalidate cache
  await cache.del(`${CACHE_PREFIX}${key}`);
  await cache.del(`${CACHE_PREFIX}all`);

  return true;
}

/**
 * Get multiple flags at once (for client-side)
 */
export async function getFlags(
  keys: string[],
  context?: {
    userId?: string;
    userRole?: string;
  }
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  
  await Promise.all(
    keys.map(async (key) => {
      result[key] = await isFeatureEnabled(key, context);
    })
  );

  return result;
}

/**
 * Transform database row to FeatureFlag type
 */
function transformFlag(row: Record<string, unknown>): FeatureFlag {
  return {
    id: row.id as string,
    key: row.key as string,
    name: row.name as string,
    description: row.description as string | null,
    enabled: row.enabled as boolean,
    rolloutPercentage: row.rollout_percentage as number,
    userTargeting: row.user_targeting as FeatureFlag['userTargeting'],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
