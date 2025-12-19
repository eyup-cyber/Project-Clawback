/**
 * Cache Strategies
 * Implements various caching patterns for different use cases
 */

import { redis, isRedisConnected } from './redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  staleWhileRevalidate?: number; // Additional time to serve stale content
  tags?: string[]; // Tags for cache invalidation
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  staleUntil?: number;
}

/**
 * Cache-Aside Pattern (Lazy Loading)
 * - Check cache first
 * - On miss, fetch from source and populate cache
 * - Most common pattern for read-heavy workloads
 */
export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300, staleWhileRevalidate = 60 } = options;

  // Try to get from cache
  const cached = await redis.get<CacheEntry<T>>(key);
  
  if (cached) {
    const now = Date.now();
    const age = (now - cached.timestamp) / 1000;
    
    // Fresh cache hit
    if (age < cached.ttl) {
      return cached.data;
    }
    
    // Stale but within revalidation window
    if (cached.staleUntil && now < cached.staleUntil) {
      // Revalidate in background
      void revalidateInBackground(key, fetchFn, options);
      return cached.data;
    }
  }

  // Cache miss or expired - fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
    staleUntil: staleWhileRevalidate 
      ? Date.now() + (ttl + staleWhileRevalidate) * 1000 
      : undefined,
  };
  
  await redis.set(key, entry, ttl + staleWhileRevalidate);
  
  // Store tags for invalidation
  if (options.tags) {
    for (const tag of options.tags) {
      await redis.sets.add(`cache:tag:${tag}`, key);
    }
  }
  
  return data;
}

/**
 * Background revalidation for stale-while-revalidate
 */
async function revalidateInBackground<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions
): Promise<void> {
  const lockKey = `lock:${key}`;
  
  // Try to acquire lock to prevent thundering herd
  const acquired = await redis.set(lockKey, '1', 30);
  if (!acquired) return;
  
  try {
    const data = await fetchFn();
    const { ttl = 300, staleWhileRevalidate = 60 } = options;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      staleUntil: staleWhileRevalidate 
        ? Date.now() + (ttl + staleWhileRevalidate) * 1000 
        : undefined,
    };
    
    await redis.set(key, entry, ttl + staleWhileRevalidate);
  } finally {
    await redis.del(lockKey);
  }
}

/**
 * Write-Through Pattern
 * - Write to cache and database simultaneously
 * - Ensures cache consistency
 * - Slightly higher write latency
 */
export async function writeThrough<T>(
  key: string,
  data: T,
  writeFn: (data: T) => Promise<void>,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 300 } = options;

  // Write to both cache and database
  await Promise.all([
    writeFn(data),
    redis.set(key, { data, timestamp: Date.now(), ttl }, ttl),
  ]);

  // Update tags
  if (options.tags) {
    for (const tag of options.tags) {
      await redis.sets.add(`cache:tag:${tag}`, key);
    }
  }
}

/**
 * Write-Behind (Write-Back) Pattern
 * - Write to cache immediately
 * - Asynchronously write to database
 * - Lower write latency but eventual consistency
 */
export async function writeBehind<T>(
  key: string,
  data: T,
  writeFn: (data: T) => Promise<void>,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 300 } = options;

  // Write to cache immediately
  await redis.set(key, { data, timestamp: Date.now(), ttl }, ttl);

  // Queue async write to database
  const writeQueueKey = 'cache:write-queue';
  await redis.list.push(writeQueueKey, { key, data, timestamp: Date.now() });

  // Trigger background write (in production, this would be a worker)
  void processWriteQueue(writeFn);
}

/**
 * Process write-behind queue
 */
async function processWriteQueue<T>(
  writeFn: (data: T) => Promise<void>
): Promise<void> {
  const writeQueueKey = 'cache:write-queue';
  const lockKey = 'cache:write-queue:lock';
  
  // Try to acquire lock
  const acquired = await redis.set(lockKey, '1', 10);
  if (!acquired) return;
  
  try {
    const items = await redis.list.range<{ key: string; data: T }>(writeQueueKey, 0, 9);
    
    for (const item of items) {
      try {
        await writeFn(item.data);
      } catch (error) {
        console.error('Write-behind failed for key:', item.key, error);
      }
    }
    
    // Remove processed items
    if (items.length > 0) {
      const client = await import('./redis').then(m => m.getRedisClient());
      if (client) {
        await client.ltrim(writeQueueKey, items.length, -1);
      }
    }
  } finally {
    await redis.del(lockKey);
  }
}

/**
 * Cache invalidation by tag
 */
export async function invalidateByTag(tag: string): Promise<number> {
  const tagKey = `cache:tag:${tag}`;
  const keys = await redis.sets.members(tagKey);
  
  if (keys.length === 0) return 0;
  
  // Delete all cached entries with this tag
  let deleted = 0;
  for (const key of keys) {
    const success = await redis.del(key);
    if (success) deleted++;
  }
  
  // Delete the tag set
  await redis.del(tagKey);
  
  return deleted;
}

/**
 * Cache invalidation by pattern
 */
export async function invalidateByPattern(pattern: string): Promise<number> {
  return redis.delPattern(pattern);
}

/**
 * Memoization with cache
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    keyGenerator: (...args: TArgs) => string;
    ttl?: number;
  }
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = options.keyGenerator(...args);
    return cacheAside(key, () => fn(...args), { ttl: options.ttl });
  };
}

/**
 * Cache stampede protection with single-flight
 */
const inflightRequests = new Map<string, Promise<unknown>>();

export async function singleFlight<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check if request is already in-flight
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // Create new request
  const promise = fetchFn().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}

/**
 * Distributed lock using Redis
 */
export async function withLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  options: { ttl?: number; retries?: number; retryDelay?: number } = {}
): Promise<T | null> {
  const { ttl = 30, retries = 3, retryDelay = 100 } = options;
  const fullLockKey = `lock:${lockKey}`;

  // Try to acquire lock
  for (let i = 0; i < retries; i++) {
    const acquired = await redis.set(fullLockKey, Date.now().toString(), ttl);
    if (acquired) {
      try {
        return await fn();
      } finally {
        await redis.del(fullLockKey);
      }
    }
    
    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, retryDelay * (i + 1)));
  }

  return null; // Failed to acquire lock
}

/**
 * Cache warming - pre-populate cache
 */
export async function warmCache<T>(
  items: Array<{ key: string; data: T; ttl?: number }>
): Promise<number> {
  let warmed = 0;
  
  for (const item of items) {
    const entry: CacheEntry<T> = {
      data: item.data,
      timestamp: Date.now(),
      ttl: item.ttl || 300,
    };
    
    const success = await redis.set(item.key, entry, item.ttl || 300);
    if (success) warmed++;
  }
  
  return warmed;
}

/**
 * Health check for cache
 */
export async function cacheHealthCheck(): Promise<{
  connected: boolean;
  latencyMs: number | null;
}> {
  const start = Date.now();
  
  if (!isRedisConnected()) {
    return { connected: false, latencyMs: null };
  }

  try {
    await redis.set('health:check', Date.now(), 10);
    await redis.get('health:check');
    return { connected: true, latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: null };
  }
}
