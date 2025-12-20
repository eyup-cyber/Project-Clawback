/**
 * Server-Side Caching Utilities
 * Phase 8.5: Redis setup, cache-aside pattern, invalidation
 */

import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  staleWhileRevalidate?: number; // Serve stale for this many seconds while revalidating
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  staleUntil?: number;
  tags: string[];
}

// ============================================================================
// IN-MEMORY CACHE (Fallback when Redis is unavailable)
// ============================================================================

const memoryCache = new Map<string, CacheEntry<unknown>>();
const tagIndex = new Map<string, Set<string>>(); // tag -> keys

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache) {
      const expiry = entry.timestamp + (entry.staleUntil || entry.ttl) * 1000;
      if (now > expiry) {
        memoryCache.delete(key);
        // Clean up tag index
        for (const tag of entry.tags) {
          tagIndex.get(tag)?.delete(key);
        }
      }
    }
  }, 60000); // Clean up every minute
}

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redisClient: RedisClientType | null = null;
let redisConnected = false;

type RedisClientType = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { EX?: number }) => Promise<void>;
  del: (key: string | string[]) => Promise<void>;
  keys: (pattern: string) => Promise<string[]>;
  sadd: (key: string, ...members: string[]) => Promise<void>;
  smembers: (key: string) => Promise<string[]>;
};

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (redisClient && redisConnected) {
    return redisClient;
  }

  try {
    // Dynamic import to avoid build errors if redis is not installed
    const { createClient } = await import('redis');

    redisClient = createClient({
      url: process.env.REDIS_URL,
    }) as unknown as RedisClientType;

    void redisClient.connect();
    redisConnected = true;

    logger.info('[Cache] Redis connected');
    return redisClient;
  } catch (error) {
    logger.warn('[Cache] Redis unavailable, using in-memory cache', error);
    return null;
  }
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

const CACHE_PREFIX = 'scroungers:';

function getCacheKey(namespace: string, key: string): string {
  return `${CACHE_PREFIX}${namespace}:${key}`;
}

function getTagKey(tag: string): string {
  return `${CACHE_PREFIX}tag:${tag}`;
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get a value from cache
 */
export async function cacheGet<T>(
  namespace: string,
  key: string
): Promise<{ data: T; isStale: boolean } | null> {
  const cacheKey = getCacheKey(namespace, key);

  try {
    const redis = await getRedisClient();

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const now = Date.now();
        const expired = now > entry.timestamp + entry.ttl * 1000;
        const staleExpired = entry.staleUntil && now > entry.timestamp + entry.staleUntil * 1000;

        if (staleExpired) {
          return null;
        }

        return {
          data: entry.data,
          isStale: expired,
        };
      }
    } else {
      // Fall back to memory cache
      const entry = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
      if (entry) {
        const now = Date.now();
        const expired = now > entry.timestamp + entry.ttl * 1000;
        const staleExpired = entry.staleUntil && now > entry.timestamp + entry.staleUntil * 1000;

        if (staleExpired) {
          memoryCache.delete(cacheKey);
          return null;
        }

        return {
          data: entry.data,
          isStale: expired,
        };
      }
    }
  } catch (error) {
    logger.error('[Cache] Get error', error, { namespace, key });
  }

  return null;
}

/**
 * Set a value in cache
 */
export async function cacheSet<T>(
  namespace: string,
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 300, tags = [], staleWhileRevalidate } = options;
  const cacheKey = getCacheKey(namespace, key);

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
    staleUntil: staleWhileRevalidate ? ttl + staleWhileRevalidate : undefined,
    tags,
  };

  try {
    const redis = await getRedisClient();

    if (redis) {
      const expiry = staleWhileRevalidate ? ttl + staleWhileRevalidate : ttl;
      await redis.set(cacheKey, JSON.stringify(entry), { EX: expiry });

      // Add to tag index
      for (const tag of tags) {
        await redis.sadd(getTagKey(tag), cacheKey);
      }
    } else {
      // Fall back to memory cache
      memoryCache.set(cacheKey, entry);

      // Update tag index
      for (const tag of tags) {
        if (!tagIndex.has(tag)) {
          tagIndex.set(tag, new Set());
        }
        tagIndex.get(tag)!.add(cacheKey);
      }
    }
  } catch (error) {
    logger.error('[Cache] Set error', error, { namespace, key });
  }
}

/**
 * Delete a specific cache entry
 */
export async function cacheDelete(namespace: string, key: string): Promise<void> {
  const cacheKey = getCacheKey(namespace, key);

  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.del(cacheKey);
    } else {
      const entry = memoryCache.get(cacheKey);
      if (entry) {
        // Clean up tag index
        for (const tag of (entry as CacheEntry<unknown>).tags) {
          tagIndex.get(tag)?.delete(cacheKey);
        }
        memoryCache.delete(cacheKey);
      }
    }
  } catch (error) {
    logger.error('[Cache] Delete error', error, { namespace, key });
  }
}

/**
 * Invalidate all entries with a specific tag
 */
export async function cacheInvalidateByTag(tag: string): Promise<void> {
  try {
    const redis = await getRedisClient();

    if (redis) {
      const tagKey = getTagKey(tag);
      const keys = await redis.smembers(tagKey);

      if (keys.length > 0) {
        await redis.del(keys);
        await redis.del(tagKey);
      }
    } else {
      const keys = tagIndex.get(tag);
      if (keys) {
        for (const key of keys) {
          memoryCache.delete(key);
        }
        tagIndex.delete(tag);
      }
    }

    logger.info('[Cache] Invalidated by tag', { tag });
  } catch (error) {
    logger.error('[Cache] Invalidate by tag error', error, { tag });
  }
}

/**
 * Invalidate all entries matching a pattern
 */
export async function cacheInvalidateByPattern(namespace: string, pattern: string): Promise<void> {
  const keyPattern = getCacheKey(namespace, pattern);

  try {
    const redis = await getRedisClient();

    if (redis) {
      const keys = await redis.keys(keyPattern.replace('*', '*'));
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } else {
      const regex = new RegExp(keyPattern.replace(/\*/g, '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
        }
      }
    }

    logger.info('[Cache] Invalidated by pattern', { namespace, pattern });
  } catch (error) {
    logger.error('[Cache] Invalidate by pattern error', error, { namespace, pattern });
  }
}

/**
 * Clear all cache entries
 */
export async function cacheClear(): Promise<void> {
  try {
    const redis = await getRedisClient();

    if (redis) {
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } else {
      memoryCache.clear();
      tagIndex.clear();
    }

    logger.info('[Cache] Cleared all entries');
  } catch (error) {
    logger.error('[Cache] Clear error', error);
  }
}

// ============================================================================
// CACHE-ASIDE PATTERN
// ============================================================================

/**
 * Cache-aside pattern: Try to get from cache, otherwise fetch and cache
 */
export async function cacheAside<T>(
  namespace: string,
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(namespace, key);

  if (cached) {
    // If stale, trigger background refresh
    if (cached.isStale) {
      // Don't await - refresh in background
      fetcher()
        .then((data) => {
          void cacheSet(namespace, key, data, options);
        })
        .catch((error) => {
          logger.error('[Cache] Background refresh failed', error, { namespace, key });
        });
    }

    return cached.data;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  await cacheSet(namespace, key, data, options);

  return data;
}

// ============================================================================
// CACHE DECORATORS
// ============================================================================

/**
 * Memoize a function with caching
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  namespace: string,
  keyGenerator: (...args: Parameters<T>) => string,
  options: CacheOptions = {}
) {
  return function (target: T): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      return cacheAside(namespace, key, () => target(...args) as Promise<unknown>, options);
    }) as T;
  };
}

// ============================================================================
// COMMON CACHE NAMESPACES
// ============================================================================

export const CacheNamespaces = {
  POSTS: 'posts',
  USERS: 'users',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COMMENTS: 'comments',
  FEED: 'feed',
  SEARCH: 'search',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
} as const;

// ============================================================================
// COMMON CACHE TAGS
// ============================================================================

export const CacheTags = {
  post: (id: string) => `post:${id}`,
  user: (id: string) => `user:${id}`,
  category: (slug: string) => `category:${slug}`,
  tag: (slug: string) => `tag:${slug}`,
  allPosts: 'all:posts',
  allUsers: 'all:users',
  allCategories: 'all:categories',
  allTags: 'all:tags',
  homepage: 'homepage',
  feed: (userId: string) => `feed:${userId}`,
} as const;

const cache = {
  get: cacheGet,
  set: cacheSet,
  delete: cacheDelete,
  invalidateByTag: cacheInvalidateByTag,
  invalidateByPattern: cacheInvalidateByPattern,
  clear: cacheClear,
  aside: cacheAside,
  cached,
  namespaces: CacheNamespaces,
  tags: CacheTags,
};

export default cache;
