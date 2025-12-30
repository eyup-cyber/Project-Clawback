import { ApiError } from '@/lib/api/response';
import { calculateReadingTime, generateSlug } from '@/lib/api/validation';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { ContentType, PostStatus } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePostInput {
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  content?: string | null;
  content_type: ContentType;
  category_id: string;
  media_url?: string | null;
  featured_image_url?: string | null;
  kofi_username?: string | null;
  status?: PostStatus;
  author_id: string;
}

export interface UpdatePostInput {
  title?: string;
  subtitle?: string | null;
  excerpt?: string | null;
  content?: string | null;
  content_type?: ContentType;
  category_id?: string;
  media_url?: string | null;
  featured_image_url?: string | null;
  kofi_username?: string | null;
}

export interface PostFilters {
  status?: PostStatus;
  content_type?: ContentType;
  category_id?: string;
  author_id?: string;
  search?: string;
  featured?: boolean;
}

export interface PostSort {
  field: 'created_at' | 'published_at' | 'view_count' | 'title';
  order: 'asc' | 'desc';
}

export interface PostWithDetails {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  excerpt: string | null;
  content: Record<string, unknown> | null;
  content_type: ContentType;
  status: PostStatus;
  featured_image_url: string | null;
  media_url: string | null;
  reading_time: number | null;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    kofi_username: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  };
}

// ============================================================================
// POST OPERATIONS
// ============================================================================

/**
 * Create a new post
 */
export async function createPost(input: CreatePostInput): Promise<PostWithDetails> {
  const supabase = await createClient();

  // Generate unique slug
  let slug = generateSlug(input.title);
  let slugSuffix = 0;

  // Check for slug conflicts
  while (true) {
    const testSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', testSlug)
      .single();

    if (!existing) {
      slug = testSlug;
      break;
    }
    slugSuffix++;
  }

  // Calculate reading time for written content
  const reading_time =
    input.content_type === 'written' && input.content ? calculateReadingTime(input.content) : null;

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: input.title,
      subtitle: input.subtitle || null,
      slug,
      excerpt: input.excerpt || null,
      content: input.content ? { text: input.content } : null,
      content_type: input.content_type,
      status: input.status || 'draft',
      category_id: input.category_id,
      author_id: input.author_id,
      media_url: input.media_url || null,
      featured_image_url: input.featured_image_url || null,
      reading_time,
    })
    .select()
    .single();

  if (error) {
    logger.error('[createPost] Error', error, {
      authorId: input.author_id,
      title: input.title,
    });
    throw ApiError.badRequest('Failed to create post');
  }

  // Fetch the full post with relations
  return getPostById(data.id);
}

/**
 * Get a single post by ID with all details
 */
export async function getPostById(id: string): Promise<PostWithDetails> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        kofi_username
      ),
      category:categories!posts_category_id_fkey (
        id,
        name,
        slug,
        color
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    throw ApiError.notFound('Post');
  }

  return data as PostWithDetails;
}

/**
 * Get a single post by slug with all details
 */
export async function getPostBySlug(slug: string): Promise<PostWithDetails> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        kofi_username
      ),
      category:categories!posts_category_id_fkey (
        id,
        name,
        slug,
        color
      )
    `
    )
    .eq('slug', slug)
    .single();

  if (error || !data) {
    throw ApiError.notFound('Post');
  }

  return data as PostWithDetails;
}

/**
 * List posts with filtering, pagination, and sorting
 */
export async function listPosts(options: {
  filters?: PostFilters;
  sort?: PostSort;
  page?: number;
  limit?: number;
}): Promise<{ posts: PostWithDetails[]; total: number }> {
  const supabase = await createClient();
  const { filters, sort, page = 1, limit = 20 } = options;

  // Build query
  let query = supabase.from('posts').select(
    `
      *,
      author:profiles!posts_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        kofi_username
      ),
      category:categories!posts_category_id_fkey (
        id,
        name,
        slug,
        color
      )
    `,
    { count: 'exact' }
  );

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.content_type) {
    query = query.eq('content_type', filters.content_type);
  }
  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.author_id) {
    query = query.eq('author_id', filters.author_id);
  }
  if (filters?.featured !== undefined) {
    query = query.eq('is_featured', filters.featured);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
  }

  // Apply sorting
  const sortField = sort?.field || 'created_at';
  const sortOrder = sort?.order === 'asc' ? true : false;
  query = query.order(sortField, { ascending: sortOrder });

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error('[listPosts] Error', error, {
      filters,
      pagination: { page, limit },
      sort,
    });
    throw ApiError.badRequest('Failed to fetch posts');
  }

  return {
    posts: (data || []) as PostWithDetails[],
    total: count || 0,
  };
}

/**
 * Update a post
 */
export async function updatePost(id: string, input: UpdatePostInput): Promise<PostWithDetails> {
  const supabase = await createClient();

  // If title is being updated, update the slug too
  const updates: Record<string, unknown> = { ...input };

  if (input.title) {
    let slug = generateSlug(input.title);
    let slugSuffix = 0;

    // Check for slug conflicts (excluding this post)
    while (true) {
      const testSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
      const { data: existing } = await supabase
        .from('posts')
        .select('id')
        .eq('slug', testSlug)
        .neq('id', id)
        .single();

      if (!existing) {
        slug = testSlug;
        break;
      }
      slugSuffix++;
    }

    updates.slug = slug;
  }

  // Recalculate reading time if content changed
  if (input.content !== undefined && input.content_type === 'written') {
    updates.reading_time = input.content ? calculateReadingTime(input.content) : null;
  }

  const { error } = await supabase.from('posts').update(updates).eq('id', id);

  if (error) {
    logger.error('[updatePost] Error', error, { postId: id });
    throw ApiError.badRequest('Failed to update post');
  }

  return getPostById(id);
}

/**
 * Change post status
 */
export async function updatePostStatus(
  id: string,
  status: PostStatus,
  options?: { scheduled_for?: string; rejection_reason?: string }
): Promise<PostWithDetails> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };

  // Set published_at when publishing
  if (status === 'published') {
    updates.published_at = new Date().toISOString();
  }

  // Handle scheduling
  if (status === 'scheduled' && options?.scheduled_for) {
    updates.scheduled_for = options.scheduled_for;
  }

  const { error } = await supabase.from('posts').update(updates).eq('id', id);

  if (error) {
    logger.error('[updatePostStatus] Error', error, { postId: id, status });
    throw ApiError.badRequest('Failed to update post status');
  }

  return getPostById(id);
}

/**
 * Delete a post (soft delete by setting status to archived)
 */
export async function deletePost(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('posts').update({ status: 'archived' }).eq('id', id);

  if (error) {
    logger.error('[deletePost] Error', error, { postId: id });
    throw ApiError.badRequest('Failed to delete post');
  }
}

/**
 * Hard delete a post (admin only)
 */
export async function hardDeletePost(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) {
    logger.error('[hardDeletePost] Error', error, { postId: id });
    throw ApiError.badRequest('Failed to delete post');
  }
}

/**
 * Toggle featured status
 */
export async function toggleFeatured(id: string): Promise<PostWithDetails> {
  const supabase = await createClient();

  // Get current featured status
  const { data: post } = await supabase.from('posts').select('is_featured').eq('id', id).single();

  if (!post) {
    throw ApiError.notFound('Post');
  }

  const { error } = await supabase
    .from('posts')
    .update({ is_featured: !post.is_featured })
    .eq('id', id);

  if (error) {
    logger.error('[toggleFeatured] Error', error, { postId: id });
    throw ApiError.badRequest('Failed to toggle featured status');
  }

  return getPostById(id);
}

/**
 * Get trending posts
 */
export async function getTrendingPosts(limit: number = 10): Promise<PostWithDetails[]> {
  const supabase = await createClient();

  // Use posts table with ordering by engagement metrics instead of view
  // Views require type regeneration after migration
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        kofi_username
      ),
      category:categories!posts_category_id_fkey (
        id,
        name,
        slug,
        color
      )
    `
    )
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .order('reaction_count', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('[getTrendingPosts] Error', error);
    return [];
  }

  return (data || []) as PostWithDetails[];
}

/**
 * Get posts pending review
 */
export async function getPendingPosts(options: {
  page?: number;
  limit?: number;
}): Promise<{ posts: PostWithDetails[]; total: number }> {
  return listPosts({
    filters: { status: 'pending' },
    sort: { field: 'created_at', order: 'asc' },
    ...options,
  });
}

/**
 * Get featured posts
 */
export async function getFeaturedPosts(limit: number = 6): Promise<PostWithDetails[]> {
  const { posts } = await listPosts({
    filters: { status: 'published', featured: true },
    sort: { field: 'published_at', order: 'desc' },
    limit,
  });

  return posts;
}

/**
 * Get posts by author
 */
export async function getPostsByAuthor(
  authorId: string,
  options: { page?: number; limit?: number; status?: PostStatus }
): Promise<{ posts: PostWithDetails[]; total: number }> {
  return listPosts({
    filters: { author_id: authorId, status: options.status },
    sort: { field: 'created_at', order: 'desc' },
    ...options,
  });
}

/**
 * Increment view count for a post
 */
export async function incrementViewCount(
  postId: string,
  userId?: string,
  ipAddress?: string
): Promise<void> {
  const supabase = await createClient();

  // Insert into post_views table (let the trigger handle the count update)
  const { error } = await supabase.from('post_views').insert({
    post_id: postId,
    viewer_id: userId || null,
    ip_address: ipAddress || null,
  });

  // Ignore duplicate key errors (same user viewing multiple times)
  if (error && !error.message.includes('duplicate')) {
    logger.error('[incrementViewCount] Error', error, {
      postId,
      viewerId: userId,
      ip: ipAddress,
    });
  }
}
