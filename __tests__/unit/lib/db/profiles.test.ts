/**
 * Unit tests for profiles database operations
 */

import { createMockSupabaseClient } from '@/lib/test/mocks';
import { mockUser } from '@/lib/test/fixtures';

// Create a persistent mock instance
const mockSupabaseClient = createMockSupabaseClient();

// Mock Supabase client to return our mock asynchronously
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}));

describe('Profiles Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfileById', () => {
    it('should fetch profile by ID', async () => {
      const mockProfile = {
        id: mockUser.id,
        username: mockUser.profile.username,
        display_name: mockUser.profile.display_name,
        role: mockUser.role,
        avatar_url: null,
        bio: 'Test bio',
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
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

      const { getProfileById } = await import('@/lib/db/profiles');
      await expect(getProfileById('non-existent')).rejects.toThrow();
    });
  });

  describe('getProfileByUsername', () => {
    it('should fetch profile by username', async () => {
      const mockProfile = {
        id: mockUser.id,
        username: mockUser.profile.username,
        display_name: mockUser.profile.display_name,
        role: mockUser.role,
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
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
      const updates = {
        display_name: 'New Name',
        bio: 'Updated bio',
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock refetch
      (mockSupabaseClient.from as jest.Mock).mockReturnValueOnce({
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
      const mockContributors = [
        { id: '1', username: 'contributor1', display_name: 'Contributor 1' },
        { id: '2', username: 'contributor2', display_name: 'Contributor 2' },
      ];

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
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

  describe('isUsernameAvailable', () => {
    it('should return true for available username', async () => {
      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const { isUsernameAvailable } = await import('@/lib/db/profiles');
      const result = await isUsernameAvailable('newusername');

      expect(result).toBe(true);
    });

    it('should return false for taken username', async () => {
      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-user' },
              error: null,
            }),
          }),
        }),
      });

      const { isUsernameAvailable } = await import('@/lib/db/profiles');
      const result = await isUsernameAvailable('existinguser');

      expect(result).toBe(false);
    });
  });
});
