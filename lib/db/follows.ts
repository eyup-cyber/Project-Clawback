/**
 * Follows Database Operations
 * Phase 1.3.7: Following users, categories, and tags
 */

import { createClient } from '@/lib/supabase/server';

export type FollowType = 'user' | 'category' | 'tag';

export interface Follow {
  id: string;
  follower_id: string;
  following_type: FollowType;
  following_id: string;
  notify_new_posts: boolean;
  created_at: string;
}

export interface UserFollow extends Follow {
  following_type: 'user';
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    follower_count: number;
    article_count: number;
  };
}

export interface CategoryFollow extends Follow {
  following_type: 'category';
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    image_url: string | null;
    post_count: number;
  };
}

export interface TagFollow extends Follow {
  following_type: 'tag';
  tag: {
    id: string;
    name: string;
    slug: string;
    post_count: number;
  };
}

// ============================================================================
// FOLLOW OPERATIONS
// ============================================================================

export async function followEntity(
  userId: string,
  followingType: FollowType,
  followingId: string,
  notifyNewPosts: boolean = true
): Promise<Follow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('follows')
    .insert({
      follower_id: userId,
      following_type: followingType,
      following_id: followingId,
      notify_new_posts: notifyNewPosts,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Already following');
    }
    throw error;
  }

  return data;
}

export async function unfollowEntity(
  userId: string,
  followingType: FollowType,
  followingId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_type', followingType)
    .eq('following_id', followingId);

  if (error) throw error;
}

export async function toggleFollow(
  userId: string,
  followingType: FollowType,
  followingId: string
): Promise<{ isFollowing: boolean; follow?: Follow }> {
  const supabase = await createClient();

  // Check if already following
  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_type', followingType)
    .eq('following_id', followingId)
    .single();

  if (existing) {
    await unfollowEntity(userId, followingType, followingId);
    return { isFollowing: false };
  } else {
    const follow = await followEntity(userId, followingType, followingId);
    return { isFollowing: true, follow };
  }
}

export async function isFollowing(
  userId: string,
  followingType: FollowType,
  followingId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_type', followingType)
    .eq('following_id', followingId)
    .single();

  return !!data;
}

// ============================================================================
// GET FOLLOWED ENTITIES
// ============================================================================

export async function getFollowedUsers(userId: string): Promise<UserFollow[]> {
  const supabase = await createClient();

  // Get all user follows
  const { data: follows, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', userId)
    .eq('following_type', 'user')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!follows || follows.length === 0) return [];

  // Get all followed user IDs
  const userIds = follows.map((f) => f.following_id);

  // Fetch user profiles
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, follower_count, article_count')
    .in('id', userIds);

  if (usersError) throw usersError;

  // Combine follows with user data
  const userMap = new Map((users || []).map((u) => [u.id, u]));

  return follows
    .map((follow) => ({
      ...follow,
      following_type: 'user' as const,
      user: userMap.get(follow.following_id)!,
    }))
    .filter((f) => f.user) as UserFollow[];
}

export async function getFollowedCategories(userId: string): Promise<CategoryFollow[]> {
  const supabase = await createClient();

  // Get all category follows
  const { data: follows, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', userId)
    .eq('following_type', 'category')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!follows || follows.length === 0) return [];

  // Get all followed category IDs
  const categoryIds = follows.map((f) => f.following_id);

  // Fetch categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, slug, color, image_url, post_count')
    .in('id', categoryIds);

  if (categoriesError) throw categoriesError;

  // Combine follows with category data
  const categoryMap = new Map((categories || []).map((c) => [c.id, c]));

  return follows
    .map((follow) => ({
      ...follow,
      following_type: 'category' as const,
      category: categoryMap.get(follow.following_id)!,
    }))
    .filter((f) => f.category) as CategoryFollow[];
}

export async function getFollowedTags(userId: string): Promise<TagFollow[]> {
  const supabase = await createClient();

  // Get all tag follows
  const { data: follows, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', userId)
    .eq('following_type', 'tag')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!follows || follows.length === 0) return [];

  // Get all followed tag IDs
  const tagIds = follows.map((f) => f.following_id);

  // Fetch tags
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('id, name, slug, post_count')
    .in('id', tagIds);

  if (tagsError) throw tagsError;

  // Combine follows with tag data
  const tagMap = new Map((tags || []).map((t) => [t.id, t]));

  return follows
    .map((follow) => ({
      ...follow,
      following_type: 'tag' as const,
      tag: tagMap.get(follow.following_id)!,
    }))
    .filter((f) => f.tag) as TagFollow[];
}

// ============================================================================
// GET FOLLOWERS/FOLLOWING
// ============================================================================

export interface Follower {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  article_count: number;
  followed_at: string;
}

export async function getUserFollowers(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Follower[]> {
  const supabase = await createClient();

  // Get follows where this user is being followed
  const { data: follows, error } = await supabase
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_type', 'user')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  if (!follows || follows.length === 0) return [];

  // Get follower user IDs
  const followerIds = follows.map((f) => f.follower_id);

  // Fetch follower profiles
  const { data: followers, error: followersError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, follower_count, article_count')
    .in('id', followerIds);

  if (followersError) throw followersError;

  // Combine with follow dates
  const followMap = new Map(follows.map((f) => [f.follower_id, f.created_at]));

  return (followers || []).map((follower) => ({
    ...follower,
    followed_at: followMap.get(follower.id)!,
  })) as Follower[];
}

export async function getUserFollowing(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Follower[]> {
  const supabase = await createClient();

  // Get follows where this user is following others
  const { data: follows, error } = await supabase
    .from('follows')
    .select('following_id, created_at')
    .eq('follower_id', userId)
    .eq('following_type', 'user')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  if (!follows || follows.length === 0) return [];

  // Get following user IDs
  const followingIds = follows.map((f) => f.following_id);

  // Fetch following profiles
  const { data: following, error: followingError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, follower_count, article_count')
    .in('id', followingIds);

  if (followingError) throw followingError;

  // Combine with follow dates
  const followMap = new Map(follows.map((f) => [f.following_id, f.created_at]));

  return (following || []).map((user) => ({
    ...user,
    followed_at: followMap.get(user.id)!,
  })) as Follower[];
}

export async function getFollowerCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_type', 'user')
    .eq('following_id', userId);

  if (error) throw error;
  return count || 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)
    .eq('following_type', 'user');

  if (error) throw error;
  return count || 0;
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

export interface SuggestedFollow {
  id: string;
  name: string;
  follower_count: number;
  type: FollowType;
}

export async function getSuggestedFollows(
  userId: string,
  type: FollowType,
  limit: number = 10
): Promise<SuggestedFollow[]> {
  const supabase = await createClient();

  // Get IDs already following
  const { data: existing } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('following_type', type);

  const existingIds = (existing || []).map((f) => f.following_id);

  if (existingIds.length > 0) {
    // Fetch all items and filter out existing follows
    if (type === 'user') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, follower_count')
        .in('role', ['contributor', 'editor', 'admin'])
        .eq('status', 'active')
        .neq('id', userId)
        .order('follower_count', { ascending: false })
        .limit(limit * 2); // Fetch more to account for filtering

      if (error) throw error;

      // Filter out already following
      const filtered = (data || [])
        .filter((item) => !existingIds.includes(item.id))
        .slice(0, limit);

      if (error) throw error;

      return filtered.map((item) => ({
        id: item.id,
        name: item.display_name,
        follower_count: item.follower_count || 0,
        type: 'user' as const,
      }));
    } else if (type === 'category') {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, post_count')
        .order('post_count', { ascending: false })
        .limit(limit * 2);

      if (error) throw error;

      const filtered = (data || [])
        .filter((item) => !existingIds.includes(item.id))
        .slice(0, limit);

      return filtered.map((item) => ({
        id: item.id,
        name: item.name,
        follower_count: item.post_count || 0,
        type: 'category' as const,
      }));
    } else {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, post_count')
        .order('post_count', { ascending: false })
        .limit(limit * 2);

      if (error) throw error;

      const filtered = (data || [])
        .filter((item) => !existingIds.includes(item.id))
        .slice(0, limit);

      return filtered.map((item) => ({
        id: item.id,
        name: item.name,
        follower_count: item.post_count || 0,
        type: 'tag' as const,
      }));
    }
  } else {
    // No existing follows, just get top items
    if (type === 'user') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, follower_count')
        .in('role', ['contributor', 'editor', 'admin'])
        .eq('status', 'active')
        .neq('id', userId)
        .order('follower_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        name: item.display_name,
        follower_count: item.follower_count || 0,
        type: 'user' as const,
      }));
    } else if (type === 'category') {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, post_count')
        .order('post_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        follower_count: item.post_count || 0,
        type: 'category' as const,
      }));
    } else {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, post_count')
        .order('post_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        follower_count: item.post_count || 0,
        type: 'tag' as const,
      }));
    }
  }
}
