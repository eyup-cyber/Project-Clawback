/**
 * Enhanced rate limiting with Redis support
 * Falls back to in-memory storage in development or when Redis unavailable
 */

import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { recordMetric } from '@/lib/monitoring/metrics';
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
let redisConnectionAttempts = 0;
let redisLastConnectionAttempt = 0;
let redisHealthy = false;

const MAX_CONNECTION_RETRIES = 3;
const RETRY_BACKOFF_MS = 5000;
const HEALTH_CHECK_INTERVAL_MS = 30000;
const KEY_PREFIX = config.nodeEnv === 'production' ? 'scroungers:prod' : 'scroungers:dev';

/**
 * Initialize Redis client with retry logic
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  // Return existing healthy client
  if (redisClient && redisHealthy) {
    return redisClient;
  }

  // Return null if Redis not configured
  if (!config.redisUrl || !config.features.redisCache) {
    return null;
  }

  // Prevent retry spam
  const now = Date.now();
  if (redisConnectionAttempts >= MAX_CONNECTION_RETRIES) {
    if (now - redisLastConnectionAttempt < RETRY_BACKOFF_MS * Math.pow(2, redisConnectionAttempts - 1)) {
      return null;
    }
    // Reset attempts after backoff period
    redisConnectionAttempts = 0;
  }

  redisLastConnectionAttempt = now;
  redisConnectionAttempts++;

  try {
    const { createClient: createRedisClient } = await import('redis');
    const client = createRedisClient({
      url: config.redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
      },
    }) as RedisClientType;

    client.on('error', (err) => {
      logger.error('Redis client error', err);
      redisHealthy = false;
      recordMetric('redis.error', 1);
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
      redisHealthy = true;
      redisConnectionAttempts = 0;
      recordMetric('redis.ready', 1);
    });

    await client.connect();
    redisClient = client;
    redisHealthy = true;
    logger.info('Redis client connected successfully');
    recordMetric('redis.connected', 1);
    
    return redisClient;
  } catch (error) {
    logger.warn('Failed to connect to Redis, using in-memory fallback', {
      error: (error as Error).message,
      attempt: redisConnectionAttempts,
    });
    recordMetric('redis.connection_failed', 1);
    return null;
  }
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!redisClient || !redisHealthy) {
    return false;
  }

  try {
    await redisClient.ping();
    redisHealthy = true;
    return true;
  } catch (error) {
    logger.warn('Redis health check failed', { error: (error as Error).message });
    redisHealthy = false;
    recordMetric('redis.health_check_failed', 1);
    return false;
  }
}

// Periodic health check
if (typeof setInterval !== 'undefined') {
  setInterval(async () => {
    if (redisClient) {
      await checkRedisHealth();
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

/**
 * Build full key with environment-aware prefix and namespace
 */
function buildKey(key: string, keyPrefix?: string): string {
  const namespace = keyPrefix || 'ratelimit';
  return `${KEY_PREFIX}:${namespace}:${key}`;
}

/**
 * Check rate limit (Redis sliding window when available, otherwise fixed window)
 */
export async function checkRateLimit(
  key: string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  const startTime = Date.now();
  const opts: RateLimitOptions = options ?? { maxRequests: 100, windowMs: 60000 };
  const now = Date.now();
  const fullKey = buildKey(key, opts.keyPrefix);
  const client = await getRedisClient();

  if (client && redisHealthy && opts.sliding !== false) {
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
      const allowed = count <= opts.maxRequests;
      
      // Record metrics
      recordMetric('rate_limit.check.redis', Date.now() - startTime);
      recordMetric(allowed ? 'rate_limit.allowed' : 'rate_limit.blocked', 1);

      if (!allowed) {
        const retryAfterSeconds = Math.ceil((ttl === -1 ? ttlMs : ttl) / 1000);
        logger.warn('Rate limit exceeded', { key: fullKey, count, limit: opts.maxRequests });
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
      redisHealthy = false;
      recordMetric('rate_limit.redis_error', 1);
    }
  }

  // Fixed window fallback (in-memory or Redis failure)
  recordMetric('rate_limit.check.memory', Date.now() - startTime);
  const record = memoryStore.get(fullKey);
  const resetAt = record && now <= record.resetAt ? record.resetAt : now + opts.windowMs;
  const count = record && now <= record.resetAt ? record.count + 1 : 1;
  const remaining = Math.max(opts.maxRequests - count, 0);
  const allowed = count <= opts.maxRequests;
  
  memoryStore.set(fullKey, { count, resetAt });
  recordMetric(allowed ? 'rate_limit.allowed' : 'rate_limit.blocked', 1);

  if (!allowed) {
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);
    logger.warn('Rate limit exceeded (memory)', { key: fullKey, count, limit: opts.maxRequests });
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
