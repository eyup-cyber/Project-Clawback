/**
 * Enhanced health check utilities
 * Provides detailed system health information
 */

import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    storage?: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    cache?: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    email?: {
      status: 'healthy' | 'unhealthy';
      configured: boolean;
      error?: string;
    };
  };
  version?: string;
  uptime?: number;
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<{
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
    
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check storage health (R2)
 */
async function checkStorage(): Promise<{
  status: 'healthy' | 'unhealthy';
  error?: string;
}> {
  if (!config.r2BucketName) {
    return {
      status: 'unhealthy',
      error: 'R2 not configured',
    };
  }
  
  // Basic check - verify configuration exists
  return {
    status: 'healthy',
  };
}

/**
 * Check cache health (Redis)
 */
async function checkCache(): Promise<{
  status: 'healthy' | 'unhealthy';
  error?: string;
}> {
  if (!config.features.redisCache) {
    return {
      status: 'healthy', // Not required
    };
  }
  
  try {
    const client = await getRedisClient();
    if (!client) {
      return {
        status: 'unhealthy',
        error: 'Redis client not available',
      };
    }
    
    // Try a simple ping
    await client.ping();
    
    return {
      status: 'healthy',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check email service health
 */
function checkEmail(): {
  status: 'healthy' | 'unhealthy';
  configured: boolean;
  error?: string;
} {
  const configured = !!config.resendApiKey;
  
  if (!configured) {
    return {
      status: 'healthy', // Not required, but note it's not configured
      configured: false,
    };
  }
  
  return {
    status: 'healthy',
    configured: true,
  };
}

/**
 * Get comprehensive health status
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const [database, storage, cache, email] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkCache(),
    Promise.resolve(checkEmail()),
  ]);
  
  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (database.status === 'unhealthy') {
    status = 'unhealthy';
  } else if (storage.status === 'unhealthy' || cache.status === 'unhealthy') {
    status = 'degraded';
  }
  
  return {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database,
      storage,
      cache,
      email,
    },
    version: process.env.npm_package_version,
    uptime: process.uptime ? Math.floor(process.uptime()) : undefined,
  };
}

