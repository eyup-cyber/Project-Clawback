/**
 * Unified Cache Interface
 * Provides a consistent API with Redis or in-memory fallback
 */

import { redis, isRedisConnected } from './redis';
import { cacheAside, invalidateByTag, invalidateByPattern, cacheHealthCheck, type CacheOptions } from './strategies';

// In-memory fallback cache
const memoryCache = new Map<string, { data: unknown; expires: number }>();
const memoryCacheTags = new Map<string, Set<string>>();

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache) {
      if (entry.expires < now) {
        memoryCache.delete(key);
      }
    }
  }, 60000); // Every minute
}

/**
 * Unified cache interface
 */
export const cache = {
  /**
   * Get a value from cache (Redis or memory fallback)
   */
  async get<T>(key: string): Promise<T | null> {
    if (isRedisConnected()) {
      return redis.get<T>(key);
    }
    
    // Memory fallback
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  },

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300, tags?: string[]): Promise<boolean> {
    if (isRedisConnected()) {
      const success = await redis.set(key, value, ttlSeconds);
      if (success && tags) {
        for (const tag of tags) {
          await redis.sets.add(`cache:tag:${tag}`, key);
        }
      }
      return success;
    }
    
    // Memory fallback
    memoryCache.set(key, {
      data: value,
      expires: Date.now() + ttlSeconds * 1000,
    });
    
    if (tags) {
      for (const tag of tags) {
        if (!memoryCacheTags.has(tag)) {
          memoryCacheTags.set(tag, new Set());
        }
        memoryCacheTags.get(tag)!.add(key);
      }
    }
    
    return true;
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    if (isRedisConnected()) {
      return redis.del(key);
    }
    
    // Memory fallback
    memoryCache.delete(key);
    return true;
  },

  /**
   * Delete keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (isRedisConnected()) {
      return redis.delPattern(pattern);
    }
    
    // Memory fallback - simple pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deleted = 0;
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        deleted++;
      }
    }
    return deleted;
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (isRedisConnected()) {
      return redis.exists(key);
    }
    
    // Memory fallback
    const entry = memoryCache.get(key);
    if (!entry) return false;
    if (entry.expires < Date.now()) {
      memoryCache.delete(key);
      return false;
    }
    return true;
  },

  /**
   * Cache-aside with automatic source fetching
   */
  async fetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    if (isRedisConnected()) {
      return cacheAside(key, fetchFn, options);
    }

    // Memory fallback
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    await this.set(key, data, options.ttl, options.tags);
    return data;
  },

  /**
   * Invalidate cache by tag
   */
  async invalidateTag(tag: string): Promise<number> {
    if (isRedisConnected()) {
      return invalidateByTag(tag);
    }
    
    // Memory fallback
    const keys = memoryCacheTags.get(tag);
    if (!keys) return 0;
    
    let deleted = 0;
    for (const key of keys) {
      if (memoryCache.delete(key)) {
        deleted++;
      }
    }
    memoryCacheTags.delete(tag);
    return deleted;
  },

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (isRedisConnected()) {
      return invalidateByPattern(pattern);
    }
    return this.delPattern(pattern);
  },

  /**
   * Health check
   */
  async health(): Promise<{ redis: boolean; memory: boolean; latencyMs: number | null }> {
    const redisHealth = await cacheHealthCheck();
    return {
      redis: redisHealth.connected,
      memory: true,
      latencyMs: redisHealth.latencyMs,
    };
  },

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (isRedisConnected()) {
      await redis.delPattern('*');
    }
    memoryCache.clear();
    memoryCacheTags.clear();
  },

  /**
   * Get cache stats
   */
  async stats(): Promise<{
    type: 'redis' | 'memory';
    keys: number;
    memoryUsage?: number;
  }> {
    if (isRedisConnected()) {
      const client = await import('./redis').then(m => m.getRedisClient());
      if (client) {
        const info = await client.info('keyspace');
        const match = info.match(/keys=(\d+)/);
        return {
          type: 'redis',
          keys: match ? parseInt(match[1], 10) : 0,
        };
      }
    }
    
    return {
      type: 'memory',
      keys: memoryCache.size,
      memoryUsage: process.memoryUsage?.().heapUsed,
    };
  },
};

// Export individual modules for advanced use cases
export { redis, isRedisConnected, getRedisClient, closeRedis } from './redis';
export { cacheAside, writeThrough, writeBehind, invalidateByTag, invalidateByPattern, memoize, singleFlight, withLock, warmCache, cacheHealthCheck } from './strategies';
export type { CacheOptions, CacheEntry } from './strategies';

// Default export
export default cache;
