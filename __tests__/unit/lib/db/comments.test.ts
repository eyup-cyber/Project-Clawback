/**
 * Unit tests for comments database operations
 */

import { createChainableMock } from '@/lib/test/mocks';
import { mockComment, mockPost, mockUser } from '@/lib/test/fixtures';

// Use the global mock from setup.ts
const mockSupabaseClient = globalThis.__mockSupabaseClient;

describe('Comments Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
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

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: mockCommentData, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getCommentById } = await import('@/lib/db/comments');
      const result = await getCommentById(mockComment.id);

      expect(result.id).toBe(mockComment.id);
      expect(result.author).toBeDefined();
    });

    it('should throw not found for non-existent comment', async () => {
      const query = createChainableMock();
      query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getCommentById } = await import('@/lib/db/comments');
      await expect(getCommentById('non-existent')).rejects.toThrow();
    });
  });

  describe('listComments', () => {
    it('should list comments for a post', async () => {
      const mockComments = [mockComment, { ...mockComment, id: 'comment-2' }];

      const query = createChainableMock();
      // Configure .range() to return the result (it's thenable through the mock's then)
      query.range.mockResolvedValue({ data: mockComments, error: null, count: 2 });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

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

      const query = createChainableMock();
      query.range.mockResolvedValue({ data: [], error: null, count: 0 });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

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

      // Mock post check
      const postQuery = createChainableMock();
      postQuery.single.mockResolvedValue({
        data: { id: mockPost.id, status: 'published' },
        error: null,
      });

      // Mock insert
      const insertQuery = createChainableMock();
      insertQuery.single.mockResolvedValue({
        data: { id: 'new-comment-id', ...newComment },
        error: null,
      });

      (mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(postQuery)
        .mockReturnValueOnce(insertQuery);

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

      // Mock post check
      const postQuery = createChainableMock();
      postQuery.single.mockResolvedValue({
        data: { id: mockPost.id, status: 'published' },
        error: null,
      });

      // Mock parent comment check
      const parentQuery = createChainableMock();
      parentQuery.single.mockResolvedValue({
        data: { id: mockComment.id, post_id: mockPost.id },
        error: null,
      });

      // Mock insert
      const insertQuery = createChainableMock();
      insertQuery.single.mockResolvedValue({
        data: { id: 'reply-id', ...reply },
        error: null,
      });

      (mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(postQuery)
        .mockReturnValueOnce(parentQuery)
        .mockReturnValueOnce(insertQuery);

      const { createComment } = await import('@/lib/db/comments');
      const result = await createComment(reply);

      expect(result.parent_id).toBe(mockComment.id);
    });
  });

  describe('updateComment', () => {
    it('should update comment content', async () => {
      const newContent = 'Updated comment content';

      // Mock getCommentById first
      const getQuery = createChainableMock();
      getQuery.single.mockResolvedValue({
        data: { ...mockComment, author: { id: mockUser.id } },
        error: null,
      });

      // Mock update
      const updateQuery = createChainableMock();
      updateQuery.single.mockResolvedValue({
        data: { ...mockComment, content: newContent },
        error: null,
      });

      (mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(getQuery)
        .mockReturnValueOnce(updateQuery);

      const { updateComment } = await import('@/lib/db/comments');
      const result = await updateComment(mockComment.id, newContent);

      expect(result.content).toBe(newContent);
    });
  });

  describe('deleteComment', () => {
    it('should soft delete by setting status to deleted', async () => {
      const query = createChainableMock();
      query.then.mockImplementation((resolve) => resolve({ error: null }));
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { deleteComment } = await import('@/lib/db/comments');
      await expect(deleteComment(mockComment.id)).resolves.not.toThrow();
    });
  });
});
