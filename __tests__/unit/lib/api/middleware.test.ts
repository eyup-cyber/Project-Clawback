/**
 * Unit tests for API middleware
 */

import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}));

import { getAuthUser, requireAuth, requireRole, requireMinRole } from '@/lib/api/middleware';
import { createClient } from '@/lib/supabase/server';

describe('API Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthUser', () => {
    it('should return null when no user is authenticated', async () => {
      const mockSupabase = await createClient();
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
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

      const mockSupabase = await createClient();
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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

      const result = await getAuthUser();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-123');
    });
  });

  describe('requireAuth', () => {
    it('should throw unauthorized error when not authenticated', async () => {
      const mockSupabase = await createClient();
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
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

      const mockSupabase = await createClient();
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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

      const result = await requireRole('admin');
      expect(result.user.id).toBe('user-123');
    });
  });

  describe('requireMinRole', () => {
    const roleHierarchy = ['reader', 'contributor', 'editor', 'admin'];

    it('should allow admin to access contributor routes', async () => {
      const mockUser = { id: 'user-123', email: 'admin@example.com' };
      const mockProfile = {
        id: 'user-123',
        role: 'admin',
        username: 'admin',
      };

      const mockSupabase = await createClient();
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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

      const result = await requireMinRole('contributor');
      expect(result.user.role).toBe('admin');
    });
  });
});
