/**
 * Test data fixtures
 * Provides reusable test data for tests
 */

export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  role: 'contributor' as const,
  profile: {
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
  },
};

export const mockPost = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  title: 'Test Post',
  slug: 'test-post',
  content: 'Test content',
  content_type: 'written' as const,
  status: 'published' as const,
  author_id: mockUser.id,
  category_id: '323e4567-e89b-12d3-a456-426614174000',
  view_count: 0,
  reaction_count: 0,
  comment_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockComment = {
  id: '423e4567-e89b-12d3-a456-426614174000',
  post_id: mockPost.id,
  author_id: mockUser.id,
  content: 'Test comment',
  parent_id: null,
  is_pinned: false,
  is_author_reply: false,
  status: 'visible' as const,
  reaction_count: 0,
  reply_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockCategory = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  name: 'Test Category',
  slug: 'test-category',
  color: '#32CD32',
  icon: '📝',
  is_featured: true,
  post_count: 1,
  created_at: new Date().toISOString(),
};




