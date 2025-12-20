/**
 * Feature Flag Hook
 * React hook for checking feature flags
 */

import React, { useState, useEffect, useCallback } from 'react';

interface FeatureFlagState {
  enabled: boolean;
  loading: boolean;
  error: Error | null;
}

interface FeatureFlags {
  [key: string]: boolean;
}

// Cache for feature flags
let flagsCache: FeatureFlags | null = null;
let flagsCacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Fetch all feature flags for the current user
 */
async function fetchFlags(): Promise<FeatureFlags> {
  const now = Date.now();

  // Return cached flags if still valid
  if (flagsCache && now - flagsCacheTimestamp < CACHE_TTL) {
    return flagsCache;
  }

  try {
    const response = await fetch('/api/features');
    if (!response.ok) {
      throw new Error('Failed to fetch feature flags');
    }

    const data = await response.json();
    const flags: FeatureFlags = {};

    // Transform array of flags to object
    for (const flag of data.data || []) {
      flags[flag.key] = flag.enabled;
    }

    flagsCache = flags;
    flagsCacheTimestamp = now;

    return flags;
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return flagsCache || {};
  }
}

/**
 * Check if a specific feature flag is enabled
 */
async function checkFlag(key: string): Promise<boolean> {
  const flags = await fetchFlags();
  return flags[key] ?? false;
}

/**
 * Hook to check a single feature flag
 */
export function useFeatureFlag(key: string): FeatureFlagState {
  const [state, setState] = useState<FeatureFlagState>({
    enabled: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const enabled = await checkFlag(key);
        if (mounted) {
          setState({ enabled, loading: false, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({
            enabled: false,
            loading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          });
        }
      }
    };

    void check();

    return () => {
      mounted = false;
    };
  }, [key]);

  return state;
}

/**
 * Hook to check multiple feature flags at once
 */
export function useFeatureFlags(keys: string[]): {
  flags: FeatureFlags;
  loading: boolean;
  error: Error | null;
} {
  const [state, setState] = useState<{
    flags: FeatureFlags;
    loading: boolean;
    error: Error | null;
  }>({
    flags: {},
    loading: true,
    error: null,
  });

  // Serialize keys to avoid complex expression in deps
  const keysString = keys.join(',');

  useEffect(() => {
    let mounted = true;
    const currentKeys = keysString.split(',').filter(Boolean);

    const check = async () => {
      try {
        const allFlags = await fetchFlags();
        const requestedFlags: FeatureFlags = {};

        for (const key of currentKeys) {
          requestedFlags[key] = allFlags[key] ?? false;
        }

        if (mounted) {
          setState({ flags: requestedFlags, loading: false, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({
            flags: {},
            loading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          });
        }
      }
    };

    void check();

    return () => {
      mounted = false;
    };
  }, [keysString]);

  return state;
}

/**
 * Hook that provides a function to check flags on-demand
 */
export function useFeatureFlagChecker() {
  const [loading, setLoading] = useState(false);

  const check = useCallback(async (key: string): Promise<boolean> => {
    setLoading(true);
    try {
      return await checkFlag(key);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkMultiple = useCallback(async (keys: string[]): Promise<FeatureFlags> => {
    setLoading(true);
    try {
      const allFlags = await fetchFlags();
      const result: FeatureFlags = {};
      for (const key of keys) {
        result[key] = allFlags[key] ?? false;
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateCache = useCallback(() => {
    flagsCache = null;
    flagsCacheTimestamp = 0;
  }, []);

  return { check, checkMultiple, loading, invalidateCache };
}

/**
 * HOC to conditionally render components based on feature flags
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  flagKey: string,
  FallbackComponent?: React.ComponentType<P>
): React.FC<P> {
  return function WithFeatureFlagComponent(props: P) {
    const { enabled, loading } = useFeatureFlag(flagKey);

    if (loading) {
      return null; // Or a loading spinner
    }

    if (!enabled) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Utility to clear the flags cache (e.g., after login/logout)
 */
export function clearFeatureFlagsCache(): void {
  flagsCache = null;
  flagsCacheTimestamp = 0;
}

/**
 * Server-side feature flag check
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/features/${key}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.data?.enabled ?? false;
  } catch {
    return false;
  }
}
