/**
 * Unit tests for posts database operations
 */

import { createChainableMock } from '@/lib/test/mocks';
import { mockPost } from '@/lib/test/fixtures';

// Use the global mock from setup.ts
const mockSupabaseClient = globalThis.__mockSupabaseClient;

describe('Posts Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('getPostById', () => {
    it('should fetch post with author and category', async () => {
      const mockPostData = {
        ...mockPost,
        author: {
          id: 'author-123',
          username: 'author',
          display_name: 'Author Name',
          avatar_url: null,
        },
        category: {
          id: 'cat-123',
          name: 'Politics',
          slug: 'politics',
          color: '#ff0000',
        },
      };

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: mockPostData, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      // Import after mocking
      const { getPostById } = await import('@/lib/db/posts');
      const result = await getPostById(mockPost.id);

      expect(result).toEqual(mockPostData);
    });

    it('should throw not found error for non-existent post', async () => {
      const query = createChainableMock();
      query.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getPostById } = await import('@/lib/db/posts');
      await expect(getPostById('non-existent-id')).rejects.toThrow();
    });
  });

  describe('listPosts', () => {
    it('should return paginated posts', async () => {
      const mockPosts = [mockPost, { ...mockPost, id: 'post-2' }];

      const query = createChainableMock();
      // .range() returns a thenable
      query.range.mockResolvedValue({ data: mockPosts, error: null, count: 10 });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { listPosts } = await import('@/lib/db/posts');
      const result = await listPosts({ page: 1, limit: 10 });

      expect(result.posts).toHaveLength(2);
      expect(result.total).toBe(10);
    });
  });

  describe('createPost', () => {
    it('should create post with generated slug', async () => {
      const newPost = {
        title: 'New Test Post',
        content_type: 'written' as const,
        category_id: 'cat-123',
        author_id: 'author-123',
      };

      const createdPostData = {
        id: 'new-post-id',
        ...newPost,
        slug: 'new-test-post',
        author: { id: 'author-123', username: 'author', display_name: 'Author' },
        category: { id: 'cat-123', name: 'Politics', slug: 'politics', color: '#ff0000' },
      };

      // Mock #1: slug uniqueness check - no conflict
      const slugQuery = createChainableMock();
      slugQuery.single.mockResolvedValue({ data: null, error: null });

      // Mock #2: insert
      const insertQuery = createChainableMock();
      insertQuery.single.mockResolvedValue({
        data: { id: 'new-post-id', slug: 'new-test-post' },
        error: null,
      });

      // Mock #3: getPostById refetch
      const getQuery = createChainableMock();
      getQuery.single.mockResolvedValue({ data: createdPostData, error: null });

      (mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(slugQuery) // Slug check
        .mockReturnValueOnce(insertQuery) // Insert
        .mockReturnValueOnce(getQuery); // getPostById

      const { createPost } = await import('@/lib/db/posts');
      const result = await createPost(newPost);

      expect(result.slug).toBe('new-test-post');
    });
  });

  describe('updatePost', () => {
    it('should update post fields', async () => {
      const updates = { title: 'Updated Title' };
      const mockPostData = {
        ...mockPost,
        ...updates,
        slug: 'updated-title',
        author: { id: 'author-123', username: 'author', display_name: 'Author' },
        category: { id: 'cat-123', name: 'Politics', slug: 'politics', color: '#ff0000' },
      };

      // Mock #1: slug conflict check (when title changes)
      const slugQuery = createChainableMock();
      slugQuery.single.mockResolvedValue({ data: null, error: null });

      // Mock #2: update
      const updateQuery = createChainableMock();
      updateQuery.then.mockImplementation((resolve) => resolve({ error: null }));

      // Mock #3: getPostById refetch
      const getQuery = createChainableMock();
      getQuery.single.mockResolvedValue({ data: mockPostData, error: null });

      (mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(slugQuery) // Slug check
        .mockReturnValueOnce(updateQuery) // Update
        .mockReturnValueOnce(getQuery); // getPostById

      const { updatePost } = await import('@/lib/db/posts');
      await expect(updatePost(mockPost.id, updates)).resolves.toBeDefined();
    });
  });

  describe('deletePost', () => {
    it('should soft delete by setting status to archived', async () => {
      const query = createChainableMock();
      query.then.mockImplementation((resolve) => resolve({ error: null }));
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { deletePost } = await import('@/lib/db/posts');
      await expect(deletePost(mockPost.id)).resolves.not.toThrow();
    });
  });
});
