/**
 * Unit tests for reactions database operations
 *
 * Note: Post reactions use a multi-reaction model (multiple types per user),
 * while comment reactions use a single-reaction model (like/dislike).
 */

import { mockPost, mockUser } from '@/lib/test/fixtures';

// Create a chainable mock helper that supports data collection
function createChainableMock() {
  let resolveData: unknown = { data: null, error: null };

  const chainable: Record<string, jest.Mock> = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    match: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(() => Promise.resolve(resolveData)),
    // For queries that don't use single()
    then: jest.fn((resolve) => resolve(resolveData)),
  };

  // Make all methods return the chainable object for chaining
  Object.keys(chainable).forEach((key) => {
    if (key !== 'single' && key !== 'then') {
      chainable[key].mockReturnValue(chainable);
    }
  });

  // Helper to set the resolve value
  (chainable as Record<string, unknown>).setResolveData = (data: unknown) => {
    resolveData = data;
    chainable.single.mockResolvedValue(data);
  };

  return chainable;
}

// Mock Supabase client with chainable query builder
const mockChainable = createChainableMock();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => mockChainable),
  })),
}));

describe('Reactions Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chain methods
    Object.keys(mockChainable).forEach((key) => {
      if (typeof mockChainable[key] === 'function' && mockChainable[key].mockClear) {
        mockChainable[key].mockClear();
        if (key !== 'single' && key !== 'then') {
          mockChainable[key].mockReturnValue(mockChainable);
        }
      }
    });
    mockChainable.single.mockResolvedValue({ data: null, error: null });
  });

  describe('togglePostReaction', () => {
    it('should add reaction when user has no reaction of that type', async () => {
      // Mock: no existing reaction of this type found
      mockChainable.single.mockResolvedValueOnce({ data: null, error: null });

      const { togglePostReaction } = await import('@/lib/db/reactions');
      const result = await togglePostReaction(mockPost.id, mockUser.id, 'star');

      expect(result.action).toBe('added');
      expect(result.type).toBe('star');
      expect(mockChainable.insert).toHaveBeenCalled();
    });

    it('should remove reaction when same type already exists', async () => {
      // Mock: existing reaction found with same type
      mockChainable.single.mockResolvedValueOnce({
        data: {
          id: 'existing-reaction',
          reaction_type: 'star',
        },
        error: null,
      });

      const { togglePostReaction } = await import('@/lib/db/reactions');
      const result = await togglePostReaction(mockPost.id, mockUser.id, 'star');

      expect(result.action).toBe('removed');
      expect(result.type).toBeNull();
      expect(mockChainable.delete).toHaveBeenCalled();
    });

    it('should allow multiple reaction types from same user', async () => {
      // Post reactions allow multiple types - if user has 'heart' and clicks 'star',
      // the query for 'star' will not find existing (since it queries exact type)
      mockChainable.single.mockResolvedValueOnce({ data: null, error: null });

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

      // The function doesn't use .single() - it expects array data
      mockChainable.eq.mockReturnValue({
        ...mockChainable,
        then: jest.fn((resolve) => resolve({ data: mockReactions, error: null })),
      });

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

      mockChainable.eq.mockReturnValue({
        ...mockChainable,
        then: jest.fn((resolve) => resolve({ data: mockReactions, error: null })),
      });

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id, mockUser.id);

      expect(result.userReaction).toBe('heart');
    });

    it('should return null userReaction when user has not reacted', async () => {
      const mockReactions = [{ reaction_type: 'star', user_id: 'other-user' }];

      mockChainable.eq.mockReturnValue({
        ...mockChainable,
        then: jest.fn((resolve) => resolve({ data: mockReactions, error: null })),
      });

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id, mockUser.id);

      expect(result.userReaction).toBeNull();
    });

    it('should handle empty reactions', async () => {
      mockChainable.eq.mockReturnValue({
        ...mockChainable,
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      });

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id);

      expect(result.counts.total).toBe(0);
      expect(result.userReaction).toBeNull();
    });
  });
});
