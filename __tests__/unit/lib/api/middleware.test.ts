/**
 * Unit tests for API middleware
 */

import { createChainableMock } from '@/lib/test/mocks';

// Use the global mock from setup.ts
const mockSupabaseClient = globalThis.__mockSupabaseClient;
const mockChainable = globalThis.__mockSupabaseQuery;

describe('API Middleware', () => {
  beforeEach(() => {
    jest.resetModules();

    // Reset auth mock
    (mockSupabaseClient.auth.getUser as jest.Mock).mockClear();
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Reset from mock
    (mockSupabaseClient.from as jest.Mock).mockClear();
    (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChainable);

    // Reset query chainable methods
    Object.keys(mockChainable).forEach((key) => {
      const mock = mockChainable[key];
      if (typeof mock === 'function' && 'mockClear' in mock) {
        mock.mockClear();
        if (key !== 'single' && key !== 'maybeSingle' && key !== 'then') {
          mock.mockReturnValue(mockChainable);
        }
      }
    });
    mockChainable.single.mockResolvedValue({ data: null, error: null });
  });

  describe('getAuthUser', () => {
    it('should return null when no user is authenticated', async () => {
      (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { getAuthUser } = await import('@/lib/api/middleware');
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

      const { getAuthUser } = await import('@/lib/api/middleware');
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

      const { requireAuth } = await import('@/lib/api/middleware');
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

      const { requireRole } = await import('@/lib/api/middleware');
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

      const { requireMinRole } = await import('@/lib/api/middleware');
      const result = await requireMinRole('contributor');
      expect(result.user.id).toBe('user-123');
    });
  });
});
