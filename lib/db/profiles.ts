import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/api/response';
import type { UserRole } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  kofi_username: string | null;
  website_url: string | null;
  twitter_handle: string | null;
  location: string | null;
  role: UserRole;
  article_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  kofi_username: string | null;
  website_url: string | null;
  twitter_handle: string | null;
  location: string | null;
  article_count: number;
  is_featured: boolean;
}

export interface UpdateProfileInput {
  username?: string;
  display_name?: string;
  bio?: string | null;
  avatar_url?: string | null;
  kofi_username?: string | null;
  website_url?: string | null;
  twitter_handle?: string | null;
  location?: string | null;
}

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

/**
 * Get profile by user ID
 */
export async function getProfileById(id: string): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw ApiError.notFound('User');
  }

  return data as Profile;
}

/**
 * Get public profile by user ID
 */
export async function getPublicProfile(id: string): Promise<PublicProfile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      kofi_username,
      website_url,
      twitter_handle,
      location,
      article_count,
      is_featured
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw ApiError.notFound('User');
  }

  return data as PublicProfile;
}

/**
 * Get profile by username
 */
export async function getProfileByUsername(username: string): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();

  if (error || !data) {
    throw ApiError.notFound('User');
  }

  return data as Profile;
}

/**
 * Update user profile
 */
export async function updateProfile(
  id: string,
  input: UpdateProfileInput
): Promise<Profile> {
  const supabase = await createClient();

  // Check for username uniqueness if username is being updated
  if (input.username) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', input.username.toLowerCase())
      .neq('id', id)
      .single();

    if (existing) {
      throw ApiError.conflict('Username already taken');
    }

    input.username = input.username.toLowerCase();
  }

  const { error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', id);

  if (error) {
    logger.error('[updateProfile] Error', error, { userId: id });
    throw ApiError.badRequest('Failed to update profile');
  }

  return getProfileById(id);
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  id: string,
  role: UserRole
): Promise<Profile> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id);

  if (error) {
    logger.error('[updateUserRole] Error', error, { userId: id, role });
    throw ApiError.badRequest('Failed to update user role');
  }

  return getProfileById(id);
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .single();

  return !data;
}

/**
 * List featured contributors
 */
export async function getFeaturedContributors(limit: number = 10): Promise<PublicProfile[]> {
  const supabase = await createClient();

  // Query profiles directly instead of view (views need type regeneration)
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      kofi_username,
      website_url,
      twitter_handle,
      location,
      article_count,
      is_featured
    `)
    .eq('is_featured', true)
    .in('role', ['contributor', 'editor', 'admin', 'superadmin'])
    .order('article_count', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('[getFeaturedContributors] Error', error);
    return [];
  }

  return (data || []) as PublicProfile[];
}

/**
 * List all users with pagination
 */
export async function listUsers(options: {
  page?: number;
  limit?: number;
  role?: UserRole;
  search?: string;
}): Promise<{ users: Profile[]; total: number }> {
  const supabase = await createClient();
  const { page = 1, limit = 20, role, search } = options;

  let query = supabase.from('profiles').select('*', { count: 'exact' });

  if (role) {
    query = query.eq('role', role);
  }

  if (search) {
    query = query.or(
      `username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    logger.error('[listUsers] Error', error, { role, search, page, limit });
    throw ApiError.badRequest('Failed to fetch users');
  }

  return {
    users: (data || []) as Profile[],
    total: count || 0,
  };
}

/**
 * Get users by IDs
 */
export async function getUsersByIds(ids: string[]): Promise<PublicProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      kofi_username,
      website_url,
      twitter_handle,
      location,
      article_count,
      is_featured
    `)
    .in('id', ids);

  if (error) {
    logger.error('[getUsersByIds] Error', error, { ids });
    return [];
  }

  return (data || []) as PublicProfile[];
}

/**
 * Toggle featured status for a user
 */
export async function toggleFeaturedContributor(id: string): Promise<Profile> {
  const supabase = await createClient();

  // Get current featured status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_featured')
    .eq('id', id)
    .single();

  if (!profile) {
    throw ApiError.notFound('User');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_featured: !profile.is_featured })
    .eq('id', id);

  if (error) {
    logger.error('[toggleFeaturedContributor] Error', error, { userId: id });
    throw ApiError.badRequest('Failed to toggle featured status');
  }

  return getProfileById(id);
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<{
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  pendingPosts: number;
  totalViews: number;
  totalReactions: number;
  totalComments: number;
}> {
  const supabase = await createClient();

  // Get post counts by status
  const { data: postCounts } = await supabase
    .from('posts')
    .select('status')
    .eq('author_id', userId);

  const posts = postCounts || [];
  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.status === 'published').length;
  const draftPosts = posts.filter((p) => p.status === 'draft').length;
  const pendingPosts = posts.filter((p) => p.status === 'pending').length;

  // Get aggregated stats
  const { data: stats } = await supabase
    .from('posts')
    .select('view_count, reaction_count, comment_count')
    .eq('author_id', userId);

  const aggregatedStats = (stats || []).reduce(
    (acc, post) => ({
      totalViews: acc.totalViews + (post.view_count || 0),
      totalReactions: acc.totalReactions + (post.reaction_count || 0),
      totalComments: acc.totalComments + (post.comment_count || 0),
    }),
    { totalViews: 0, totalReactions: 0, totalComments: 0 }
  );

  return {
    totalPosts,
    publishedPosts,
    draftPosts,
    pendingPosts,
    ...aggregatedStats,
  };
}

