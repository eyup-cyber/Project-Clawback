/**
 * Integration tests for Auth API
 */

import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
  },
}));

describe('Auth API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/callback', () => {
    it('should handle valid auth callback with code', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({
            error: null,
            data: { session: { user: { id: 'user-123' } } },
          }),
        },
      });

      const { GET } = await import('@/app/api/auth/callback/route');
      const request = new Request(
        'http://localhost:3000/api/auth/callback?code=valid-code'
      );
      
      const response = await GET(request);
      
      // Should redirect to dashboard on success
      expect(response.status).toBe(307); // Redirect status
      expect(response.headers.get('Location')).toContain('/dashboard');
    });

    it('should redirect to error page on auth failure', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({
            error: { message: 'Invalid code' },
            data: null,
          }),
        },
      });

      const { GET } = await import('@/app/api/auth/callback/route');
      const request = new Request(
        'http://localhost:3000/api/auth/callback?code=invalid-code'
      );
      
      const response = await GET(request);
      
      // Should redirect to login with error
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('error');
    });

    it('should redirect to error page when no code provided', async () => {
      const { GET } = await import('@/app/api/auth/callback/route');
      const request = new Request('http://localhost:3000/api/auth/callback');
      
      const response = await GET(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('error');
    });

    it('should respect next parameter for redirect', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({
            error: null,
            data: { session: { user: { id: 'user-123' } } },
          }),
        },
      });

      const { GET } = await import('@/app/api/auth/callback/route');
      const request = new Request(
        'http://localhost:3000/api/auth/callback?code=valid-code&next=/profile'
      );
      
      const response = await GET(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/profile');
    });
  });

  describe('Authentication State', () => {
    it('getAuthUser should return null for unauthenticated requests', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      });

      const { getAuthUser } = await import('@/lib/api/middleware');
      const result = await getAuthUser();
      
      expect(result.user).toBeNull();
    });

    it('getAuthUser should return user with profile for authenticated requests', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        role: 'contributor',
      };

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        }),
      });

      const { getAuthUser } = await import('@/lib/api/middleware');
      const result = await getAuthUser();
      
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-123');
      expect(result.user?.role).toBe('contributor');
    });

    it('requireAuth should throw for unauthenticated requests', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      });

      const { requireAuth } = await import('@/lib/api/middleware');
      
      await expect(requireAuth()).rejects.toThrow();
    });

    it('requireRole should throw for insufficient permissions', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-123', role: 'reader' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { requireRole } = await import('@/lib/api/middleware');
      
      await expect(requireRole('admin')).rejects.toThrow();
    });
  });
});

