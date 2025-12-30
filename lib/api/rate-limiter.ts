/**
 * API Rate Limiter
 * Phase 24: Token bucket algorithm, IP/user limits, sliding window
 */

import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  // Requests allowed per window
  limit: number;
  // Window size in seconds
  window: number;
  // Strategy for rate limiting
  strategy: 'sliding_window' | 'fixed_window' | 'token_bucket';
  // Key to identify the requester
  keyBy: 'ip' | 'user' | 'api_key' | 'ip_user';
  // Actions to take when limit exceeded
  onLimitExceeded?: 'block' | 'slow' | 'warn';
  // Skip rate limiting for certain conditions
  skip?: (req: NextRequest) => boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds until retry
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

// ============================================================================
// IN-MEMORY STORE (Use Redis in production)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
  tokens?: number;
  lastRefill?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

// ============================================================================
// RATE LIMIT PRESETS
// ============================================================================

export const RATE_LIMIT_PRESETS = {
  // Standard API endpoints
  standard: {
    limit: 100,
    window: 60,
    strategy: 'sliding_window' as const,
    keyBy: 'ip_user' as const,
  },
  // Authentication endpoints (more restrictive)
  auth: {
    limit: 10,
    window: 60,
    strategy: 'fixed_window' as const,
    keyBy: 'ip' as const,
  },
  // Public read endpoints (more lenient)
  public: {
    limit: 300,
    window: 60,
    strategy: 'sliding_window' as const,
    keyBy: 'ip' as const,
  },
  // Write operations (posting, commenting)
  write: {
    limit: 30,
    window: 60,
    strategy: 'sliding_window' as const,
    keyBy: 'user' as const,
  },
  // Search endpoints
  search: {
    limit: 60,
    window: 60,
    strategy: 'token_bucket' as const,
    keyBy: 'ip_user' as const,
  },
  // Upload endpoints
  upload: {
    limit: 10,
    window: 60,
    strategy: 'fixed_window' as const,
    keyBy: 'user' as const,
  },
  // Admin endpoints
  admin: {
    limit: 200,
    window: 60,
    strategy: 'sliding_window' as const,
    keyBy: 'user' as const,
  },
  // Webhook endpoints
  webhook: {
    limit: 1000,
    window: 60,
    strategy: 'token_bucket' as const,
    keyBy: 'ip' as const,
  },
};

// ============================================================================
// RATE LIMITING ALGORITHMS
// ============================================================================

/**
 * Fixed window rate limiting
 */
function checkFixedWindow(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000);
  const windowEnd = windowStart + windowSeconds * 1000;

  const storeKey = `fixed:${key}:${windowStart}`;
  let entry = rateLimitStore.get(storeKey);

  if (!entry) {
    entry = { count: 0, resetAt: windowEnd };
    rateLimitStore.set(storeKey, entry);
  }

  entry.count++;

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);
  const reset = Math.ceil(windowEnd / 1000);
  const retryAfter = allowed ? undefined : Math.ceil((windowEnd - now) / 1000);

  return { allowed, remaining, reset, retryAfter };
}

/**
 * Sliding window rate limiting
 */
function checkSlidingWindow(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const _windowStart = now - windowMs; // Used for sliding window calculation

  const storeKey = `sliding:${key}`;
  let entry = rateLimitStore.get(storeKey);

  if (!entry || entry.resetAt < now) {
    // Start fresh window
    entry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(storeKey, entry);
    return {
      allowed: true,
      remaining: limit - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  // Interpolate count based on time remaining in window
  const timeInWindow = entry.resetAt - now;
  const windowRatio = timeInWindow / windowMs;
  const adjustedCount = Math.floor(entry.count * windowRatio) + 1;

  entry.count = adjustedCount;
  entry.resetAt = now + windowMs;

  const allowed = adjustedCount <= limit;
  const remaining = Math.max(0, limit - adjustedCount);
  const reset = Math.ceil((now + windowMs) / 1000);
  const retryAfter = allowed ? undefined : Math.ceil(windowMs / 1000);

  return { allowed, remaining, reset, retryAfter };
}

/**
 * Token bucket rate limiting
 */
function checkTokenBucket(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const refillRate = limit / windowSeconds; // Tokens per second
  const storeKey = `bucket:${key}`;

  let entry = rateLimitStore.get(storeKey);

  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + windowSeconds * 1000,
      tokens: limit - 1, // Use one token
      lastRefill: now,
    };
    rateLimitStore.set(storeKey, entry);
    return {
      allowed: true,
      remaining: entry.tokens ?? 0,
      reset: Math.ceil(entry.resetAt / 1000),
    };
  }

  // Refill tokens based on time passed
  const timePassed = (now - (entry.lastRefill || now)) / 1000;
  const tokensToAdd = timePassed * refillRate;
  entry.tokens = Math.min(limit, (entry.tokens || 0) + tokensToAdd);
  entry.lastRefill = now;

  if (entry.tokens < 1) {
    // No tokens available
    const timeUntilToken = (1 - entry.tokens) / refillRate;
    return {
      allowed: false,
      remaining: 0,
      reset: Math.ceil((now + windowSeconds * 1000) / 1000),
      retryAfter: Math.ceil(timeUntilToken),
    };
  }

  // Consume a token
  entry.tokens -= 1;

  return {
    allowed: true,
    remaining: Math.floor(entry.tokens),
    reset: Math.ceil((now + windowSeconds * 1000) / 1000),
  };
}

// ============================================================================
// MAIN RATE LIMITER
// ============================================================================

/**
 * Get rate limit key from request
 */
function getRateLimitKey(req: NextRequest, config: RateLimitConfig, userId?: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
  const path = new URL(req.url).pathname;

  switch (config.keyBy) {
    case 'ip':
      return `${path}:ip:${ip}`;
    case 'user':
      return `${path}:user:${userId || ip}`;
    case 'api_key': {
      const apiKey = req.headers.get('x-api-key') || 'none';
      return `${path}:key:${apiKey}`;
    }
    case 'ip_user':
      return `${path}:${ip}:${userId || 'anon'}`;
    default:
      return `${path}:${ip}`;
  }
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): RateLimitResult {
  // Check skip condition
  if (config.skip?.(req)) {
    return {
      allowed: true,
      remaining: config.limit,
      reset: Math.ceil(Date.now() / 1000) + config.window,
    };
  }

  const key = getRateLimitKey(req, config, userId);

  switch (config.strategy) {
    case 'fixed_window':
      return checkFixedWindow(key, config.limit, config.window);
    case 'sliding_window':
      return checkSlidingWindow(key, config.limit, config.window);
    case 'token_bucket':
      return checkTokenBucket(key, config.limit, config.window);
    default:
      return checkSlidingWindow(key, config.limit, config.window);
  }
}

/**
 * Rate limit middleware
 */
export function rateLimit(config: RateLimitConfig = RATE_LIMIT_PRESETS.standard) {
  return (req: NextRequest, userId?: string): NextResponse | null => {
    const result = checkRateLimit(req, config, userId);

    if (!result.allowed) {
      logger.warn('[RateLimit] Rate limit exceeded', {
        path: new URL(req.url).pathname,
        ip: req.headers.get('x-forwarded-for'),
        userId,
        retryAfter: result.retryAfter,
      });

      return NextResponse.json(
        {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': result.retryAfter?.toString() || config.window.toString(),
          },
        }
      );
    }

    return null;
  };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  config: RateLimitConfig
): NextResponse {
  response.headers.set('X-RateLimit-Limit', config.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());

  return response;
}

/**
 * Get rate limit info for display
 */
export function getRateLimitInfo(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): RateLimitInfo {
  const result = checkRateLimit(req, config, userId);

  return {
    limit: config.limit,
    remaining: result.remaining,
    reset: new Date(result.reset * 1000),
  };
}

// ============================================================================
// API KEY RATE LIMITING
// ============================================================================

const API_KEY_LIMITS: Record<string, { limit: number; window: number }> = {
  free: { limit: 100, window: 3600 }, // 100 per hour
  basic: { limit: 1000, window: 3600 }, // 1000 per hour
  pro: { limit: 10000, window: 3600 }, // 10000 per hour
  unlimited: { limit: 1000000, window: 3600 }, // Effectively unlimited
};

/**
 * Get rate limit config for API key tier
 */
export function getApiKeyRateLimitConfig(tier: string): RateLimitConfig {
  const tierConfig = API_KEY_LIMITS[tier] || API_KEY_LIMITS.free;

  return {
    limit: tierConfig.limit,
    window: tierConfig.window,
    strategy: 'sliding_window',
    keyBy: 'api_key',
  };
}

export default {
  checkRateLimit,
  rateLimit,
  addRateLimitHeaders,
  getRateLimitInfo,
  getApiKeyRateLimitConfig,
  RATE_LIMIT_PRESETS,
};
