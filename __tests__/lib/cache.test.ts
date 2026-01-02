/**
 * Tests for caching utilities
 * @jest-environment node
 */

import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheInvalidateByPattern,
  cacheAside,
  cacheClear,
  CacheNamespaces,
  CacheTags,
} from '@/lib/cache';

describe('Cache Module', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await cacheClear();
  });

  afterAll(async () => {
    await cacheClear();
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
      expect(result?.data).toEqual(testData);
      expect(result?.isStale).toBe(false);
    });
  });

  describe('cacheSet', () => {
    it('should store data', async () => {
      const testData = { name: 'test', value: 123 };
      await cacheSet('posts', 'post-1', testData);

      const result = await cacheGet('posts', 'post-1');
      expect(result?.data).toEqual(testData);
    });

    it('should support TTL option', async () => {
      await cacheSet('test', 'short-lived', { data: true }, { ttl: 60 });

      const result = await cacheGet('test', 'short-lived');
      expect(result?.data).toEqual({ data: true });
    });

    it('should support tags option', async () => {
      await cacheSet('posts', 'post-1', { title: 'Test' }, { tags: ['posts', 'user:123'] });

      const result = await cacheGet('posts', 'post-1');
      expect(result?.data).toEqual({ title: 'Test' });
    });
  });

  describe('cacheDelete', () => {
    it('should delete cached data', async () => {
      await cacheSet('test', 'to-delete', { data: true });
      await cacheDelete('test', 'to-delete');

      const result = await cacheGet('test', 'to-delete');
      expect(result).toBeNull();
    });
  });

  describe('cacheInvalidateByPattern', () => {
    it('should invalidate matching keys', async () => {
      await cacheSet('posts', 'post-1', { id: 1 });
      await cacheSet('posts', 'post-2', { id: 2 });
      await cacheSet('users', 'user-1', { id: 1 });

      await cacheInvalidateByPattern('posts', '*');

      // Posts should be invalidated
      const post1 = await cacheGet('posts', 'post-1');
      const post2 = await cacheGet('posts', 'post-2');
      expect(post1).toBeNull();
      expect(post2).toBeNull();
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
  beforeEach(async () => {
    await cacheClear();
  });

  afterAll(async () => {
    await cacheClear();
  });

  it('should call fetcher when cache miss', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'from-fetcher' });

    const result = await cacheAside('test', 'key', fetcher);

    expect(fetcher).toHaveBeenCalled();
    expect(result).toEqual({ data: 'from-fetcher' });
  });

  it('should return cached value on cache hit', async () => {
    const cachedData = { data: 'cached' };
    // First call populates cache
    await cacheAside('test', 'cached-key', async () => cachedData);

    const fetcher = jest.fn().mockResolvedValue({ data: 'from-fetcher' });

    // Second call should use cache
    const result = await cacheAside('test', 'cached-key', fetcher);

    // Cached value should be returned without calling fetcher
    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });
});
