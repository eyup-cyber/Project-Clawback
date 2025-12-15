/**
 * Unit tests for profiles database operations
 */

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
        in: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  })),
}));

import { createClient } from '@/lib/supabase/server';
import { mockUser } from '@/lib/test/fixtures';

describe('Profiles Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfileById', () => {
    it('should fetch profile by ID', async () => {
      const mockSupabase = await createClient();
      const mockProfile = {
        id: mockUser.id,
        username: mockUser.profile.username,
        display_name: mockUser.profile.display_name,
        role: mockUser.role,
        avatar_url: null,
        bio: 'Test bio',
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const { getProfileById } = await import('@/lib/db/profiles');
      const result = await getProfileById(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.profile.username);
    });

    it('should throw not found for non-existent profile', async () => {
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const { getProfileById } = await import('@/lib/db/profiles');
      await expect(getProfileById('non-existent')).rejects.toThrow();
    });
  });

  describe('getProfileByUsername', () => {
    it('should fetch profile by username', async () => {
      const mockSupabase = await createClient();
      const mockProfile = {
        id: mockUser.id,
        username: mockUser.profile.username,
        display_name: mockUser.profile.display_name,
        role: mockUser.role,
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const { getProfileByUsername } = await import('@/lib/db/profiles');
      const result = await getProfileByUsername(mockUser.profile.username);

      expect(result.username).toBe(mockUser.profile.username);
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      const mockSupabase = await createClient();
      const updates = {
        display_name: 'New Name',
        bio: 'Updated bio',
      };

      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock refetch
      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockUser.profile, ...updates },
              error: null,
            }),
          }),
        }),
      });

      const { updateProfile } = await import('@/lib/db/profiles');
      const result = await updateProfile(mockUser.id, updates);

      expect(result.display_name).toBe('New Name');
    });
  });

  describe('getFeaturedContributors', () => {
    it('should return featured contributors', async () => {
      const mockSupabase = await createClient();
      const mockContributors = [
        { id: '1', username: 'contributor1', display_name: 'Contributor 1' },
        { id: '2', username: 'contributor2', display_name: 'Contributor 2' },
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockContributors,
                error: null,
              }),
            }),
          }),
        }),
      });

      const { getFeaturedContributors } = await import('@/lib/db/profiles');
      const result = await getFeaturedContributors(5);

      expect(result).toHaveLength(2);
    });
  });

  describe('checkUsernameAvailable', () => {
    it('should return true for available username', async () => {
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const { checkUsernameAvailable } = await import('@/lib/db/profiles');
      const result = await checkUsernameAvailable('newusername');

      expect(result).toBe(true);
    });

    it('should return false for taken username', async () => {
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-user' },
              error: null,
            }),
          }),
        }),
      });

      const { checkUsernameAvailable } = await import('@/lib/db/profiles');
      const result = await checkUsernameAvailable('existinguser');

      expect(result).toBe(false);
    });
  });
});
