/**
 * Unit tests for API middleware
 */

import { createMockSupabaseClient, createChainableMock } from '@/lib/test/mocks';

// Create a persistent mock instance
const mockSupabaseClient = createMockSupabaseClient();

// Mock Supabase client to return our mock asynchronously
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}));

import { getAuthUser, requireAuth, requireRole, requireMinRole } from '@/lib/api/middleware';

describe('API Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthUser', () => {
    it('should return null when no user is authenticated', async () => {
      (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getAuthUser();
      expect(result.user).toBeNull();
    });

    it('should return user with profile when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockProfile = {
        id: 'user-123',
        role: 'contributor',
        username: 'testuser',
        display_name: 'Test User',
      };

      (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: mockProfile, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const result = await getAuthUser();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-123');
    });
  });

  describe('requireAuth', () => {
    it('should throw unauthorized error when not authenticated', async () => {
      (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(requireAuth()).rejects.toThrow();
    });
  });

  describe('requireRole', () => {
    it('should allow user with matching role', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockProfile = {
        id: 'user-123',
        role: 'admin',
        username: 'admin',
      };

      (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: mockProfile, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const result = await requireRole('admin');
      expect(result.user.id).toBe('user-123');
    });
  });

  describe('requireMinRole', () => {
    it('should allow admin to access contributor routes', async () => {
      const mockUser = { id: 'user-123', email: 'admin@example.com' };
      const mockProfile = {
        id: 'user-123',
        role: 'admin',
        username: 'admin',
      };

      (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: mockProfile, error: null });
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);

      const result = await requireMinRole('contributor');
      expect(result.user.role).toBe('admin');
    });
  });
});
