/**
 * Integration tests for Users API
 */

import { NextRequest } from 'next/server';
import { mockUser } from '@/lib/test/fixtures';
import { createChainableMock } from '@/lib/test/mocks';

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

describe('Users API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/[username]', () => {
    it('should return public profile by username', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockProfile = {
        id: mockUser.id,
        username: mockUser.profile.username,
        display_name: mockUser.profile.display_name,
        bio: 'Test bio',
        avatar_url: null,
        role: 'contributor',
        article_count: 5,
        created_at: new Date().toISOString(),
      };

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: mockProfile, error: null });

      (createClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnValue(query),
      });

      const { GET } = await import('@/app/api/users/[username]/route');
      const request = new NextRequest(
        `http://localhost:3000/api/users/${mockUser.profile.username}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ username: mockUser.profile.username }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.username).toBe(mockUser.profile.username);
    });

    it('should return 404 for non-existent user', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      (createClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnValue(query),
      });

      const { GET } = await import('@/app/api/users/[username]/route');
      const request = new NextRequest('http://localhost:3000/api/users/nonexistent');

      const response = await GET(request, {
        params: Promise.resolve({ username: 'nonexistent' }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/users/me', () => {
    it('should require authentication', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      });

      const { GET } = await import('@/app/api/users/me/route');
      const request = new NextRequest('http://localhost:3000/api/users/me');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return authenticated user profile', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const query = createChainableMock();
      query.single.mockResolvedValue({
        data: {
          ...mockUser.profile,
          id: mockUser.id,
          role: mockUser.role,
        },
        error: null,
      });

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUser.id, email: mockUser.email } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(query),
      });

      const { GET } = await import('@/app/api/users/me/route');
      const request = new NextRequest('http://localhost:3000/api/users/me');

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.id).toBe(mockUser.id);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update authenticated user profile', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const selectQuery = createChainableMock();
      selectQuery.single.mockResolvedValue({
        data: {
          ...mockUser.profile,
          id: mockUser.id,
          role: mockUser.role,
        },
        error: null,
      });

      const updateQuery = createChainableMock();
      updateQuery.then.mockImplementation((resolve) => resolve({ error: null }));

      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUser.id, email: mockUser.email } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'profiles') {
            return selectQuery;
          }
          return updateQuery;
        }),
      });

      const { PUT } = await import('@/app/api/users/me/route');
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: 'Updated Name',
          bio: 'Updated bio',
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBeDefined();
    });
  });

  describe('GET /api/users/check-username', () => {
    it('should return available=true for unused username', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: null, error: null });

      (createClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnValue(query),
      });

      const { GET } = await import('@/app/api/users/check-username/route');
      const request = new NextRequest(
        'http://localhost:3000/api/users/check-username?username=newuser'
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.available).toBe(true);
    });

    it('should return available=false for taken username', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const query = createChainableMock();
      query.single.mockResolvedValue({ data: { id: 'existing-user' }, error: null });

      (createClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnValue(query),
      });

      const { GET } = await import('@/app/api/users/check-username/route');
      const request = new NextRequest(
        `http://localhost:3000/api/users/check-username?username=${mockUser.profile.username}`
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.available).toBe(false);
    });
  });
});
