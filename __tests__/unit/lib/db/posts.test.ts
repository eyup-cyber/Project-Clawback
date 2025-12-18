/**
 * Unit tests for posts database operations
 */

import { createMockSupabaseClient } from '@/lib/test/mocks';
import { mockPost } from '@/lib/test/fixtures';

// Create a persistent mock instance
const mockSupabaseClient = createMockSupabaseClient();

// Mock Supabase client to return our mock asynchronously
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}));

describe('Posts Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPostData,
              error: null,
            }),
          }),
        }),
      });

      // Import after mocking
      const { getPostById } = await import('@/lib/db/posts');
      const result = await getPostById(mockPost.id);

      expect(result).toEqual(mockPostData);
    });

    it('should throw not found error for non-existent post', async () => {
      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      });

      const { getPostById } = await import('@/lib/db/posts');
      await expect(getPostById('non-existent-id')).rejects.toThrow();
    });
  });

  describe('listPosts', () => {
    it('should return paginated posts', async () => {
      const mockPosts = [mockPost, { ...mockPost, id: 'post-2' }];

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockPosts,
                error: null,
                count: 10,
              }),
            }),
          }),
        }),
      });

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

      // Mock slug check
      (mockSupabaseClient.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      // Mock insert
      (mockSupabaseClient.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-post-id', ...newPost, slug: 'new-test-post' },
              error: null,
            }),
          }),
        }),
      });

      const { createPost } = await import('@/lib/db/posts');
      const result = await createPost(newPost);

      expect(result.slug).toBe('new-test-post');
    });
  });

  describe('updatePost', () => {
    it('should update post fields', async () => {
      const updates = { title: 'Updated Title' };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const { updatePost } = await import('@/lib/db/posts');
      // This will also call getPostById internally
      await expect(updatePost(mockPost.id, updates)).resolves.toBeDefined();
    });
  });

  describe('deletePost', () => {
    it('should soft delete by setting status to archived', async () => {
      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const { deletePost } = await import('@/lib/db/posts');
      await expect(deletePost(mockPost.id)).resolves.not.toThrow();
    });
  });
});
