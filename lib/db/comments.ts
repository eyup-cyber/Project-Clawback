import { ApiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export type CommentStatus = 'visible' | 'hidden' | 'flagged' | 'deleted';

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean;
  is_author_reply: boolean;
  status: CommentStatus;
  reaction_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: CommentWithAuthor[];
}

export interface CreateCommentInput {
  post_id: string;
  author_id: string;
  content: string;
  parent_id?: string | null;
}

// ============================================================================
// COMMENT OPERATIONS
// ============================================================================

/**
 * Create a new comment
 */
export async function createComment(input: CreateCommentInput): Promise<CommentWithAuthor> {
  const supabase = await createClient();

  // Verify the post exists and is published
  const { data: post } = await supabase
    .from('posts')
    .select('id, status')
    .eq('id', input.post_id)
    .single();

  if (!post) {
    throw ApiError.notFound('Post');
  }

  if (post.status !== 'published') {
    throw ApiError.forbidden('Cannot comment on unpublished posts');
  }

  // If replying, verify parent comment exists
  if (input.parent_id) {
    const { data: parent } = await supabase
      .from('comments')
      .select('id, post_id')
      .eq('id', input.parent_id)
      .single();

    if (!parent) {
      throw ApiError.notFound('Parent comment');
    }

    if (parent.post_id !== input.post_id) {
      throw ApiError.badRequest('Parent comment belongs to a different post');
    }
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: input.post_id,
      author_id: input.author_id,
      content: input.content,
      parent_id: input.parent_id || null,
    })
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .single();

  if (error) {
    logger.error('[createComment] Error', error, {
      postId: input.post_id,
      authorId: input.author_id,
    });
    throw ApiError.badRequest('Failed to create comment');
  }

  return data as CommentWithAuthor;
}

/**
 * Get a comment by ID
 */
export async function getCommentById(id: string): Promise<CommentWithAuthor> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    throw ApiError.notFound('Comment');
  }

  return data as CommentWithAuthor;
}

/**
 * List comments for a post
 */
export async function listComments(options: {
  post_id: string;
  parent_id?: string | null;
  page?: number;
  limit?: number;
  sort?: 'created_at' | 'likes';
  order?: 'asc' | 'desc';
}): Promise<{ comments: CommentWithAuthor[]; total: number }> {
  const supabase = await createClient();
  const {
    post_id,
    parent_id = null,
    page = 1,
    limit = 20,
    sort = 'created_at',
    order = 'desc',
  } = options;

  let query = supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `,
      { count: 'exact' }
    )
    .eq('post_id', post_id)
    .eq('status', 'visible'); // Don't show hidden/flagged comments

  // Filter by parent (null for top-level comments)
  if (parent_id === null) {
    query = query.is('parent_id', null);
  } else {
    query = query.eq('parent_id', parent_id);
  }

  // Sorting
  const sortField = sort === 'likes' ? 'like_count' : 'created_at';
  query = query.order(sortField, { ascending: order === 'asc' });

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error('[listComments] Error', error, {
      post_id,
      parent_id,
      page,
      limit,
    });
    throw ApiError.badRequest('Failed to fetch comments');
  }

  return {
    comments: (data || []) as CommentWithAuthor[],
    total: count || 0,
  };
}

/**
 * Get comments with nested replies (one level deep)
 */
export async function getCommentsWithReplies(options: {
  post_id: string;
  page?: number;
  limit?: number;
}): Promise<{ comments: CommentWithAuthor[]; total: number }> {
  const { post_id, page = 1, limit = 20 } = options;

  // Get top-level comments
  const { comments: topLevel, total } = await listComments({
    post_id,
    parent_id: null,
    page,
    limit,
  });

  // Get replies for each top-level comment
  const commentsWithReplies = await Promise.all(
    topLevel.map(async (comment) => {
      if (comment.reply_count > 0) {
        const { comments: replies } = await listComments({
          post_id,
          parent_id: comment.id,
          limit: 5, // Show first 5 replies
          sort: 'created_at',
          order: 'asc',
        });
        return { ...comment, replies };
      }
      return { ...comment, replies: [] };
    })
  );

  return {
    comments: commentsWithReplies,
    total,
  };
}

/**
 * Update a comment
 */
export async function updateComment(id: string, content: string): Promise<CommentWithAuthor> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .update({
      content,
    })
    .eq('id', id);

  if (error) {
    logger.error('[updateComment] Error', error, { commentId: id });
    throw ApiError.badRequest('Failed to update comment');
  }

  return getCommentById(id);
}

/**
 * Delete a comment (soft delete by replacing content)
 */
export async function deleteComment(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .update({
      content: '[Comment deleted]',
      status: 'deleted' as const,
    })
    .eq('id', id);

  if (error) {
    logger.error('[deleteComment] Error', error, { commentId: id });
    throw ApiError.badRequest('Failed to delete comment');
  }
}

/**
 * Hard delete a comment (admin only)
 */
export async function hardDeleteComment(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('comments').delete().eq('id', id);

  if (error) {
    logger.error('[hardDeleteComment] Error', error, { commentId: id });
    throw ApiError.badRequest('Failed to delete comment');
  }
}

/**
 * Flag a comment for moderation
 */
export async function flagComment(
  commentId: string,
  reporterId: string,
  reason: string,
  details?: string
): Promise<void> {
  const supabase = await createClient();

  // Mark comment as flagged
  const { error: updateError } = await supabase
    .from('comments')
    .update({ status: 'flagged' as const })
    .eq('id', commentId);

  if (updateError) {
    logger.error('[flagComment] Update error', updateError, {
      commentId,
      reporterId,
      reason,
    });
    throw ApiError.badRequest('Failed to flag comment');
  }

  // Log the flag (you might want a separate table for this)
  logger.info('[flagComment] Flagged comment', {
    commentId,
    reporterId,
    reason,
    details: details || 'No details',
  });
}

/**
 * Unflag a comment (admin only)
 */
export async function unflagComment(id: string): Promise<CommentWithAuthor> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .update({ status: 'visible' as const })
    .eq('id', id);

  if (error) {
    logger.error('[unflagComment] Error', error, { commentId: id });
    throw ApiError.badRequest('Failed to unflag comment');
  }

  return getCommentById(id);
}

/**
 * Get flagged comments (admin only)
 */
export async function getFlaggedComments(options: {
  page?: number;
  limit?: number;
}): Promise<{ comments: CommentWithAuthor[]; total: number }> {
  const supabase = await createClient();
  const { page = 1, limit = 20 } = options;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'flagged')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    logger.error('[getFlaggedComments] Error', error, { page, limit });
    throw ApiError.badRequest('Failed to fetch flagged comments');
  }

  return {
    comments: (data || []) as CommentWithAuthor[],
    total: count || 0,
  };
}

/**
 * Get comment count for a post
 */
export async function getCommentCount(postId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('status', 'visible');

  if (error) {
    logger.error('[getCommentCount] Error', error, { postId });
    return 0;
  }

  return count || 0;
}
