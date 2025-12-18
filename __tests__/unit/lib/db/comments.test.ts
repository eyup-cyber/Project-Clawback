/**
 * Unit tests for comments database operations
 */

import { createMockSupabaseClient } from '@/lib/test/mocks';
import { mockComment, mockPost, mockUser } from '@/lib/test/fixtures';

// Create a persistent mock instance
const mockSupabaseClient = createMockSupabaseClient();

// Mock Supabase client to return our mock asynchronously
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}));

describe('Comments Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCommentById', () => {
    it('should fetch comment with author', async () => {
      const mockCommentData = {
        ...mockComment,
        author: {
          id: mockUser.id,
          username: mockUser.profile.username,
          display_name: mockUser.profile.display_name,
          avatar_url: null,
        },
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCommentData,
              error: null,
            }),
          }),
        }),
      });

      const { getCommentById } = await import('@/lib/db/comments');
      const result = await getCommentById(mockComment.id);

      expect(result.id).toBe(mockComment.id);
      expect(result.author).toBeDefined();
    });

    it('should throw not found for non-existent comment', async () => {
      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const { getCommentById } = await import('@/lib/db/comments');
      await expect(getCommentById('non-existent')).rejects.toThrow();
    });
  });

  describe('listComments', () => {
    it('should list comments for a post', async () => {
      const mockComments = [mockComment, { ...mockComment, id: 'comment-2' }];

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockComments,
                  error: null,
                  count: 2,
                }),
              }),
            }),
          }),
        }),
      });

      const { listComments } = await import('@/lib/db/comments');
      const result = await listComments({
        post_id: mockPost.id,
        page: 1,
        limit: 10,
      });

      expect(result.comments).toHaveLength(2);
    });

    it('should filter by parent_id for replies', async () => {
      const parentId = 'parent-comment-id';

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 0,
                }),
              }),
            }),
          }),
        }),
      });

      const { listComments } = await import('@/lib/db/comments');
      await listComments({
        post_id: mockPost.id,
        parent_id: parentId,
        page: 1,
        limit: 10,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('comments');
    });
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const newComment = {
        post_id: mockPost.id,
        author_id: mockUser.id,
        content: 'Test comment content',
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-comment-id', ...newComment },
              error: null,
            }),
          }),
        }),
      });

      const { createComment } = await import('@/lib/db/comments');
      const result = await createComment(newComment);

      expect(result.id).toBe('new-comment-id');
      expect(result.content).toBe(newComment.content);
    });

    it('should create a reply to another comment', async () => {
      const reply = {
        post_id: mockPost.id,
        author_id: mockUser.id,
        content: 'Reply content',
        parent_id: mockComment.id,
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'reply-id', ...reply },
              error: null,
            }),
          }),
        }),
      });

      const { createComment } = await import('@/lib/db/comments');
      const result = await createComment(reply);

      expect(result.parent_id).toBe(mockComment.id);
    });
  });

  describe('updateComment', () => {
    it('should update comment content', async () => {
      const newContent = 'Updated comment content';

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockComment, content: newContent },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { updateComment } = await import('@/lib/db/comments');
      const result = await updateComment(mockComment.id, newContent);

      expect(result.content).toBe(newContent);
    });
  });

  describe('deleteComment', () => {
    it('should soft delete by setting status to deleted', async () => {
      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const { deleteComment } = await import('@/lib/db/comments');
      await expect(deleteComment(mockComment.id)).resolves.not.toThrow();
    });
  });
});
