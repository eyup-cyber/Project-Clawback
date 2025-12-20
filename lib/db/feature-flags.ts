/**
 * Feature Flags Database Operations
 * Phase 1.7.9: Feature flag management
 */

import { createClient } from '@/lib/supabase/server';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  targeting_rules: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Check if a feature is enabled for a user
 */
export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('is_feature_enabled', {
    p_key: key,
    p_user_id: userId || null,
  });

  if (error) {
    // If function doesn't exist yet, return false
    console.error('Feature flag check error:', error);
    return false;
  }

  return data || false;
}

/**
 * Get all feature flags for a user
 */
export async function getFeatureFlagsForUser(userId?: string): Promise<Record<string, boolean>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_feature_flags_for_user', {
    p_user_id: userId || null,
  });

  if (error) {
    console.error('Get feature flags error:', error);
    return {};
  }

  // Convert array to object
  const flags: Record<string, boolean> = {};
  (data || []).forEach((item: { key: string; enabled: boolean }) => {
    flags[item.key] = item.enabled;
  });

  return flags;
}

/**
 * Get all feature flags (admin only)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('feature_flags').select('*').order('key');

  if (error) throw error;
  return data || [];
}
