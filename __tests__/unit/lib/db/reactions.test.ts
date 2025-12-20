/**
 * Unit tests for reactions database operations
 *
 * Note: Post reactions use a multi-reaction model (multiple types per user),
 * while comment reactions use a single-reaction model (like/dislike).
 */

import { createChainableMock } from '@/lib/test/mocks';
import { mockPost, mockUser } from '@/lib/test/fixtures';

// Use the global mock from setup.ts
const mockSupabaseClient = globalThis.__mockSupabaseClient;

describe('Reactions Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('togglePostReaction', () => {
    it('should add reaction when user has no reaction of that type', async () => {
      const query = createChainableMock();
      // Mock: no existing reaction of this type found
      query.single.mockResolvedValueOnce({ data: null, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      // Import after mocking
      const { togglePostReaction } = await import('@/lib/db/reactions');
      const result = await togglePostReaction(mockPost.id, mockUser.id, 'star');

      expect(result.action).toBe('added');
      expect(result.type).toBe('star');
      expect(query.insert).toHaveBeenCalled();
    });

    it('should remove reaction when same type already exists', async () => {
      const query = createChainableMock();
      // Mock: existing reaction found with same type
      query.single.mockResolvedValueOnce({
        data: {
          id: 'existing-reaction',
          reaction_type: 'star',
        },
        error: null,
      });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { togglePostReaction } = await import('@/lib/db/reactions');
      const result = await togglePostReaction(mockPost.id, mockUser.id, 'star');

      expect(result.action).toBe('removed');
      expect(result.type).toBeNull();
      expect(query.delete).toHaveBeenCalled();
    });

    it('should allow multiple reaction types from same user', async () => {
      const query = createChainableMock();
      // Post reactions allow multiple types - if user has 'heart' and clicks 'star',
      // the query for 'star' will not find existing (since it queries exact type)
      query.single.mockResolvedValueOnce({ data: null, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { togglePostReaction } = await import('@/lib/db/reactions');
      const result = await togglePostReaction(mockPost.id, mockUser.id, 'star');

      // Should add a new 'star' reaction (user might already have 'heart')
      expect(result.action).toBe('added');
      expect(result.type).toBe('star');
    });
  });

  describe('getPostReactionSummary', () => {
    it('should return reaction counts from database', async () => {
      // Mock: return a list of reactions
      const mockReactions = [
        { reaction_type: 'star', user_id: 'user-1' },
        { reaction_type: 'star', user_id: 'user-2' },
        { reaction_type: 'heart', user_id: 'user-3' },
        { reaction_type: 'fire', user_id: 'user-4' },
      ];

      const query = createChainableMock();
      // The function doesn't use .single() - it expects array data
      query.eq.mockReturnValue({
        ...query,
        then: jest.fn((resolve) => resolve({ data: mockReactions, error: null })),
      });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id);

      expect(result.counts.star).toBe(2);
      expect(result.counts.heart).toBe(1);
      expect(result.counts.fire).toBe(1);
      expect(result.counts.total).toBe(4);
    });

    it('should include user reaction when user ID provided', async () => {
      // Mock: return reactions including one from our user
      const mockReactions = [
        { reaction_type: 'star', user_id: 'other-user' },
        { reaction_type: 'heart', user_id: mockUser.id },
      ];

      const query = createChainableMock();
      query.eq.mockReturnValue({
        ...query,
        then: jest.fn((resolve) => resolve({ data: mockReactions, error: null })),
      });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id, mockUser.id);

      expect(result.userReaction).toBe('heart');
    });

    it('should return null userReaction when user has not reacted', async () => {
      const mockReactions = [{ reaction_type: 'star', user_id: 'other-user' }];

      const query = createChainableMock();
      query.eq.mockReturnValue({
        ...query,
        then: jest.fn((resolve) => resolve({ data: mockReactions, error: null })),
      });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id, mockUser.id);

      expect(result.userReaction).toBeNull();
    });

    it('should handle empty reactions', async () => {
      const query = createChainableMock();
      query.eq.mockReturnValue({
        ...query,
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id);

      expect(result.counts.total).toBe(0);
      expect(result.userReaction).toBeNull();
    });
  });
});
