/**
 * Unit tests for profiles database operations
 */

import { createChainableMock } from '@/lib/test/mocks';
import { mockUser } from '@/lib/test/fixtures';

// Use the global mock from setup.ts
const mockSupabaseClient = globalThis.__mockSupabaseClient;

describe('Profiles Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
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

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: mockProfile, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getProfileById } = await import('@/lib/db/profiles');
      const result = await getProfileById(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.profile.username);
    });

    it('should throw not found for non-existent profile', async () => {
      const query = createChainableMock();
      query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

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

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: mockProfile, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

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

      // Mock update query (returns the chainable with thenable for the update)
      const updateQuery = createChainableMock();
      updateQuery.then.mockImplementation((resolve) => resolve({ error: null }));

      // Mock select query for refetch
      const selectQuery = createChainableMock();
      selectQuery.single.mockResolvedValue({
        data: { ...mockUser.profile, ...updates },
        error: null,
      });

      (mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(updateQuery)
        .mockReturnValueOnce(selectQuery);

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

      const query = createChainableMock();
      query.limit.mockResolvedValue({ data: mockContributors, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { getFeaturedContributors } = await import('@/lib/db/profiles');
      const result = await getFeaturedContributors(5);

      expect(result).toHaveLength(2);
    });
  });

  describe('isUsernameAvailable', () => {
    it('should return true for available username', async () => {
      const query = createChainableMock();
      query.single.mockResolvedValue({ data: null, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { isUsernameAvailable } = await import('@/lib/db/profiles');
      const result = await isUsernameAvailable('newusername');

      expect(result).toBe(true);
    });

    it('should return false for taken username', async () => {
      const query = createChainableMock();
      query.single.mockResolvedValue({ data: { id: 'existing-user' }, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const { isUsernameAvailable } = await import('@/lib/db/profiles');
      const result = await isUsernameAvailable('existinguser');

      expect(result).toBe(false);
    });
  });
});
