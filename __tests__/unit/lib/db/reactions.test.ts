/**
 * Unit tests for reactions database operations
 */

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      delete: jest.fn(() => ({
        match: jest.fn(),
      })),
      upsert: jest.fn(),
    })),
    rpc: jest.fn(),
  })),
}));

import { createClient } from '@/lib/supabase/server';
import { mockPost, mockUser } from '@/lib/test/fixtures';

describe('Reactions Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('togglePostReaction', () => {
    it('should add reaction when none exists', async () => {
      const mockSupabase = await createClient();

      // Mock check for existing reaction
      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock insert
      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'reaction-id',
                post_id: mockPost.id,
                user_id: mockUser.id,
                type: 'star',
              },
              error: null,
            }),
          }),
        }),
      });

      const { togglePostReaction } = await import('@/lib/db/reactions');
      const result = await togglePostReaction(mockPost.id, mockUser.id, 'star');

      expect(result.action).toBe('added');
      expect(result.type).toBe('star');
    });

    it('should remove reaction when same type exists', async () => {
      const mockSupabase = await createClient();

      // Mock check for existing reaction
      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'existing-reaction',
                  type: 'star',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock delete
      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          match: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const { togglePostReaction } = await import('@/lib/db/reactions');
      const result = await togglePostReaction(mockPost.id, mockUser.id, 'star');

      expect(result.action).toBe('removed');
    });

    it('should change reaction when different type exists', async () => {
      const mockSupabase = await createClient();

      // Mock check for existing reaction
      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'existing-reaction',
                  type: 'heart',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock update (upsert)
      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const { togglePostReaction } = await import('@/lib/db/reactions');
      const result = await togglePostReaction(mockPost.id, mockUser.id, 'star');

      expect(result.action).toBe('changed');
      expect(result.type).toBe('star');
    });
  });

  describe('getPostReactionSummary', () => {
    it('should return reaction counts', async () => {
      const mockSupabase = await createClient();
      const mockCounts = {
        star: 10,
        heart: 5,
        fire: 3,
        clap: 7,
        think: 2,
      };

      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: mockCounts,
        error: null,
      });

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id);

      expect(result.counts).toEqual(mockCounts);
      expect(result.postId).toBe(mockPost.id);
    });

    it('should include user reaction when user ID provided', async () => {
      const mockSupabase = await createClient();

      // Mock counts
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: { star: 5, heart: 3 },
        error: null,
      });

      // Mock user reaction
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { type: 'star' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id, mockUser.id);

      expect(result.userReaction).toBe('star');
    });

    it('should return null userReaction when user has not reacted', async () => {
      const mockSupabase = await createClient();

      // Mock counts
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: { star: 5 },
        error: null,
      });

      // Mock no user reaction
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });

      const { getPostReactionSummary } = await import('@/lib/db/reactions');
      const result = await getPostReactionSummary(mockPost.id, mockUser.id);

      expect(result.userReaction).toBeNull();
    });
  });
});
