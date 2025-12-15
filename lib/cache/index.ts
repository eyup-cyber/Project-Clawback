/**
 * In-memory cache with TTL support
 * Provides cache-aside pattern implementation
 */

import { logger } from '@/lib/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheOptions {
  ttlMs: number; // Time to live in milliseconds
}

// Default TTL values
export const TTL = {
  SHORT: 10_000, // 10 seconds
  MEDIUM: 60_000, // 1 minute
  LONG: 300_000, // 5 minutes
  VERY_LONG: 900_000, // 15 minutes
} as const;

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, options: CacheOptions): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + options.ttlMs,
    };

    this.cache.set(key, entry);
    logger.debug('Cache set', { key, ttlMs: options.ttlMs });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug('Cache delete', { key });
    }
    return deleted;
  }

  /**
   * Delete all values matching a prefix
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug('Cache delete by prefix', { prefix, count });
    }
    return count;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug('Cache cleared', { size });
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup', { cleaned });
    }
  }

  /**
   * Stop the cleanup interval (for testing)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const cache = new MemoryCache();

// ============================================================================
// CACHE-ASIDE PATTERN HELPERS
// ============================================================================

/**
 * Get or set pattern - fetches from cache or calls loader function
 */
export async function getOrSet<T>(
  key: string,
  loader: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  // Try cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Load from source
  const value = await loader();

  // Store in cache
  cache.set(key, value, options);

  return value;
}

/**
 * Invalidate cache entries by key or prefix
 */
export function invalidate(keyOrPrefix: string, isPrefix = false): void {
  if (isPrefix) {
    cache.deleteByPrefix(keyOrPrefix);
  } else {
    cache.delete(keyOrPrefix);
  }
}

// ============================================================================
// PRE-DEFINED CACHE KEYS
// ============================================================================

export const CacheKeys = {
  // Categories
  categories: () => 'categories:all',
  categoriesWithCounts: () => 'categories:with_counts',
  category: (slug: string) => `category:${slug}`,

  // Site settings
  siteContent: () => 'site:content',
  siteSettings: (key: string) => `site:settings:${key}`,

  // Posts
  featuredPosts: () => 'posts:featured',
  trendingPosts: () => 'posts:trending',
  postBySlug: (slug: string) => `post:slug:${slug}`,
  postById: (id: string) => `post:id:${id}`,

  // Users
  userProfile: (id: string) => `user:profile:${id}`,
  userByUsername: (username: string) => `user:username:${username}`,
} as const;

// ============================================================================
// CACHED DATA FETCHERS
// ============================================================================

import { getCategories, getCategoriesWithCounts } from '@/lib/db/categories';
import { getSiteContent } from '@/lib/db/site-content';
import { getFeaturedPosts, getTrendingPosts } from '@/lib/db/posts';

/**
 * Get categories (cached 5 minutes)
 */
export async function getCachedCategories() {
  return getOrSet(CacheKeys.categories(), () => getCategories(), { ttlMs: TTL.LONG });
}

/**
 * Get categories with counts (cached 5 minutes)
 */
export async function getCachedCategoriesWithCounts() {
  return getOrSet(CacheKeys.categoriesWithCounts(), () => getCategoriesWithCounts(), {
    ttlMs: TTL.LONG,
  });
}

/**
 * Get site content (cached 1 minute)
 */
export async function getCachedSiteContent() {
  return getOrSet(CacheKeys.siteContent(), () => getSiteContent(), { ttlMs: TTL.MEDIUM });
}

/**
 * Get featured posts (cached 1 minute)
 */
export async function getCachedFeaturedPosts(limit = 6) {
  return getOrSet(CacheKeys.featuredPosts(), () => getFeaturedPosts(limit), { ttlMs: TTL.MEDIUM });
}

/**
 * Get trending posts (cached 1 minute)
 */
export async function getCachedTrendingPosts(limit = 10) {
  return getOrSet(CacheKeys.trendingPosts(), () => getTrendingPosts(limit), { ttlMs: TTL.MEDIUM });
}

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

/**
 * Invalidate all category caches
 */
export function invalidateCategories(): void {
  invalidate('categories:', true);
  invalidate('category:', true);
}

/**
 * Invalidate all post caches
 */
export function invalidatePosts(): void {
  invalidate('posts:', true);
  invalidate('post:', true);
}

/**
 * Invalidate site content cache
 */
export function invalidateSiteContent(): void {
  invalidate('site:', true);
}

/**
 * Invalidate user cache
 */
export function invalidateUser(id: string): void {
  cache.delete(CacheKeys.userProfile(id));
}
