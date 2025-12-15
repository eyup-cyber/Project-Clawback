/**
 * Enhanced rate limiting with Redis support
 * Falls back to in-memory storage in development
 */

import { logger } from '@/lib/logger';
import type { RedisClientType } from 'redis';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  sliding?: boolean; // enable sliding window in Redis
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
  retryAfterSeconds?: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory fallback store
const memoryStore = new Map<string, RateLimitRecord>();

// Redis client (lazy-loaded)
let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client
 */
async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  // Only use Redis in production if REDIS_URL is set
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    try {
      const { createClient: createRedisClient } = await import('redis');
      const client = createRedisClient({ url: process.env.REDIS_URL }) as RedisClientType;
      await client.connect();
      redisClient = client;
      logger.info('Redis client connected for rate limiting');
      return redisClient;
    } catch (error) {
      logger.warn('Failed to connect to Redis, using in-memory rate limiting', {
        error: (error as Error).message,
      });
      return null;
    }
  }

  return null;
}

/**
 * Build full key with prefix
 */
function buildKey(key: string, keyPrefix?: string) {
  return keyPrefix ? `${keyPrefix}:${key}` : key;
}

/**
 * Check rate limit (Redis sliding window when available, otherwise fixed window)
 */
export async function checkRateLimit(
  key: string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  const opts: RateLimitOptions = options ?? { maxRequests: 100, windowMs: 60000 };
  const now = Date.now();
  const fullKey = buildKey(key, opts.keyPrefix ?? 'ratelimit');
  const client = await getRedisClient();

  if (client && opts.sliding !== false) {
    // Sliding window using Redis INCR + PTTL
    try {
      const ttlMs = opts.windowMs;
      const count = await client.incr(fullKey);
      let ttl = await client.pTTL(fullKey);
      if (ttl === -1) {
        await client.pExpire(fullKey, ttlMs);
        ttl = ttlMs;
      }

      const remaining = Math.max(opts.maxRequests - count, 0);
      if (count > opts.maxRequests) {
        const retryAfterSeconds = Math.ceil((ttl === -1 ? ttlMs : ttl) / 1000);
        return {
          allowed: false,
          remaining: 0,
          limit: opts.maxRequests,
          resetMs: now + (ttl === -1 ? ttlMs : ttl),
          retryAfterSeconds,
        };
      }

      return {
        allowed: true,
        remaining,
        limit: opts.maxRequests,
        resetMs: now + (ttl === -1 ? ttlMs : ttl),
      };
    } catch (error) {
      logger.warn('Redis rate limit error, falling back to memory', {
        error: (error as Error).message,
      });
    }
  }

  // Fixed window fallback (in-memory or Redis failure)
  const record = memoryStore.get(fullKey);
  const resetAt = record && now <= record.resetAt ? record.resetAt : now + opts.windowMs;
  const count = record && now <= record.resetAt ? record.count + 1 : 1;
  const remaining = Math.max(opts.maxRequests - count, 0);
  memoryStore.set(fullKey, { count, resetAt });

  if (count > opts.maxRequests) {
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      limit: opts.maxRequests,
      resetMs: resetAt,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining,
    limit: opts.maxRequests,
    resetMs: resetAt,
  };
}

/**
 * Rate limit by IP address
 */
export async function rateLimitByIp(
  request: Request,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  return checkRateLimit(`ip:${ip}`, options);
}

/**
 * Rate limit by user ID
 */
export async function rateLimitByUser(
  userId: string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`, options);
}

/**
 * Extract client IP from request
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Build standard rate limit headers
 */
export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetMs / 1000).toString(),
  };
  if (result.retryAfterSeconds !== undefined) {
    headers['Retry-After'] = result.retryAfterSeconds.toString();
  }
  return headers;
}

/**
 * Clean up expired records (for in-memory store)
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
}
