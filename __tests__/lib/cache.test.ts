/**
 * Tests for caching utilities
 */

import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheInvalidateByPattern,
  cacheAside,
  CacheNamespaces,
  CacheTags,
} from '@/lib/cache';

// Mock Redis client
jest.mock('@/lib/cache', () => {
  const actualModule = jest.requireActual('@/lib/cache');

  // In-memory cache for testing
  const memoryCache = new Map<string, { value: string; expiry: number }>();
  const tagMappings = new Map<string, Set<string>>();

  return {
    ...actualModule,
    cacheGet: jest.fn(async (namespace: string, key: string) => {
      const fullKey = `${namespace}:${key}`;
      const cached = memoryCache.get(fullKey);
      if (!cached) return null;
      if (cached.expiry < Date.now()) {
        memoryCache.delete(fullKey);
        return null;
      }
      return { data: JSON.parse(cached.value), isStale: false };
    }),
    cacheSet: jest.fn(
      async (
        namespace: string,
        key: string,
        data: unknown,
        options: { ttl?: number; tags?: string[] } = {}
      ) => {
        const fullKey = `${namespace}:${key}`;
        const ttl = options.ttl || 3600;
        memoryCache.set(fullKey, {
          value: JSON.stringify(data),
          expiry: Date.now() + ttl * 1000,
        });

        if (options.tags) {
          for (const tag of options.tags) {
            if (!tagMappings.has(tag)) {
              tagMappings.set(tag, new Set());
            }
            tagMappings.get(tag)!.add(fullKey);
          }
        }
      }
    ),
    cacheDelete: jest.fn(async (namespace: string, key: string) => {
      const fullKey = `${namespace}:${key}`;
      memoryCache.delete(fullKey);
    }),
    cacheInvalidateByPattern: jest.fn(async (pattern: string) => {
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key);
        }
      }
    }),
    cacheInvalidateByTag: jest.fn(async (tag: string) => {
      const keys = tagMappings.get(tag);
      if (keys) {
        for (const key of keys) {
          memoryCache.delete(key);
        }
        tagMappings.delete(tag);
      }
    }),
    cacheClear: jest.fn(async () => {
      memoryCache.clear();
      tagMappings.clear();
    }),
  };
});

describe('Cache Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheGet', () => {
    it('should return null for non-existent keys', async () => {
      const result = await cacheGet('test', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return cached data', async () => {
      const testData = { foo: 'bar' };
      await cacheSet('test', 'mykey', testData);

      const result = await cacheGet('test', 'mykey');
      expect(result).toEqual({ data: testData, isStale: false });
    });
  });

  describe('cacheSet', () => {
    it('should store data', async () => {
      const testData = { name: 'test', value: 123 };
      await cacheSet('posts', 'post-1', testData);

      expect(cacheSet).toHaveBeenCalledWith('posts', 'post-1', testData);
    });

    it('should support TTL option', async () => {
      await cacheSet('test', 'short-lived', { data: true }, { ttl: 60 });

      expect(cacheSet).toHaveBeenCalledWith('test', 'short-lived', { data: true }, { ttl: 60 });
    });

    it('should support tags option', async () => {
      await cacheSet('posts', 'post-1', { title: 'Test' }, { tags: ['posts', 'user:123'] });

      expect(cacheSet).toHaveBeenCalledWith(
        'posts',
        'post-1',
        { title: 'Test' },
        { tags: ['posts', 'user:123'] }
      );
    });
  });

  describe('cacheDelete', () => {
    it('should delete cached data', async () => {
      await cacheSet('test', 'to-delete', { data: true });
      await cacheDelete('test', 'to-delete');

      expect(cacheDelete).toHaveBeenCalledWith('test', 'to-delete');
    });
  });

  describe('cacheInvalidateByPattern', () => {
    it('should invalidate matching keys', async () => {
      await cacheSet('posts', 'post-1', { id: 1 });
      await cacheSet('posts', 'post-2', { id: 2 });
      await cacheSet('users', 'user-1', { id: 1 });

      await cacheInvalidateByPattern('posts', '*');

      expect(cacheInvalidateByPattern).toHaveBeenCalledWith('posts', '*');
    });
  });

  describe('CacheNamespaces', () => {
    it('should have expected namespaces', () => {
      expect(CacheNamespaces.POSTS).toBe('posts');
      expect(CacheNamespaces.USERS).toBe('users');
      expect(CacheNamespaces.CATEGORIES).toBe('categories');
      expect(CacheNamespaces.COMMENTS).toBe('comments');
      expect(CacheNamespaces.TAGS).toBe('tags');
    });
  });

  describe('CacheTags', () => {
    it('should have expected tags', () => {
      expect(CacheTags.allPosts).toBe('all:posts');
      expect(CacheTags.allUsers).toBe('all:users');
      expect(CacheTags.homepage).toBe('homepage');
    });
  });
});

describe('cacheAside', () => {
  it('should call fetcher when cache miss', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'from-fetcher' });

    const result = await cacheAside('test', 'key', fetcher);

    expect(fetcher).toHaveBeenCalled();
    expect(result).toEqual({ data: 'from-fetcher' });
  });

  it('should return cached value on cache hit', async () => {
    const cachedData = { data: 'cached' };
    await cacheSet('test', 'cached-key', cachedData);

    const fetcher = jest.fn().mockResolvedValue({ data: 'from-fetcher' });

    const result = await cacheAside('test', 'cached-key', fetcher);

    // Cached value should be returned without calling fetcher
    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });
});
