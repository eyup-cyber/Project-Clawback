/**
 * Comment Reactions and Threading System
 * Phase 48: Reactions, threaded replies, comment management
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_edited: boolean;
  edited_at: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  is_pinned: boolean;
  reply_count: number;
  reaction_counts: Record<ReactionType, number>;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    is_verified: boolean;
  };
  user_reaction?: ReactionType | null;
}

export interface ThreadedComment extends CommentWithAuthor {
  replies: ThreadedComment[];
  depth: number;
}

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface CommentQuery {
  post_id: string;
  parent_id?: string | null;
  sort_by?: 'newest' | 'oldest' | 'popular' | 'controversial';
  include_hidden?: boolean;
  limit?: number;
  offset?: number;
}

export interface CommentCreateInput {
  post_id: string;
  parent_id?: string;
  content: string;
}

export interface CommentStats {
  total_comments: number;
  total_replies: number;
  unique_commenters: number;
  reaction_counts: Record<ReactionType, number>;
  comments_per_day: { date: string; count: number }[];
}

// ============================================================================
// REACTION CONFIGURATION
// ============================================================================

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
};

export const REACTION_LABELS: Record<ReactionType, string> = {
  like: 'Like',
  love: 'Love',
  laugh: 'Haha',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry',
};

// ============================================================================
// COMMENT OPERATIONS
// ============================================================================

/**
 * Create a new comment
 */
export async function createComment(input: CommentCreateInput): Promise<CommentWithAuthor> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate parent comment exists and is on same post
  if (input.parent_id) {
    const { data: parent, error: parentError } = await supabase
      .from('comments')
      .select('id, post_id')
      .eq('id', input.parent_id)
      .single();

    if (parentError || !parent) {
      throw new Error('Parent comment not found');
    }

    if (parent.post_id !== input.post_id) {
      throw new Error('Parent comment is not on the same post');
    }
  }

  // Create comment
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: input.post_id,
      parent_id: input.parent_id || null,
      author_id: user.id,
      content: input.content,
      is_edited: false,
      is_hidden: false,
      is_pinned: false,
      reply_count: 0,
      reaction_counts: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
    })
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey (
        id, username, display_name, avatar_url, role, is_verified
      )
    `
    )
    .single();

  if (error) {
    logger.error('[Comments] Failed to create comment', error);
    throw error;
  }

  // Increment parent reply count
  if (input.parent_id) {
    await supabase.rpc('increment_comment_reply_count', { comment_id: input.parent_id });
  }

  // Increment post comment count
  await supabase.rpc('increment_post_comment_count', { post_id: input.post_id });

  logger.info('[Comments] Comment created', {
    comment_id: comment.id,
    post_id: input.post_id,
    is_reply: !!input.parent_id,
  });

  return comment as CommentWithAuthor;
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<CommentWithAuthor> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .update({
      content,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('author_id', user.id)
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey (
        id, username, display_name, avatar_url, role, is_verified
      )
    `
    )
    .single();

  if (error) {
    logger.error('[Comments] Failed to update comment', error);
    throw error;
  }

  return comment as CommentWithAuthor;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get comment to check ownership and get post_id
  const { data: comment, error: fetchError } = await supabase
    .from('comments')
    .select('id, post_id, parent_id, author_id')
    .eq('id', commentId)
    .single();

  if (fetchError || !comment) {
    throw new Error('Comment not found');
  }

  // Check if user is author or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'editor';

  if (comment.author_id !== user.id && !isAdmin) {
    throw new Error('Not authorized to delete this comment');
  }

  // Delete the comment
  const { error } = await supabase.from('comments').delete().eq('id', commentId);

  if (error) {
    logger.error('[Comments] Failed to delete comment', error);
    throw error;
  }

  // Decrement parent reply count
  if (comment.parent_id) {
    await supabase.rpc('decrement_comment_reply_count', { comment_id: comment.parent_id });
  }

  // Decrement post comment count
  await supabase.rpc('decrement_post_comment_count', { post_id: comment.post_id });

  logger.info('[Comments] Comment deleted', { comment_id: commentId });
}

/**
 * Get comments for a post
 */
export async function getComments(query: CommentQuery): Promise<{
  comments: CommentWithAuthor[];
  total: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    post_id,
    parent_id,
    sort_by = 'newest',
    include_hidden = false,
    limit = 20,
    offset = 0,
  } = query;

  let queryBuilder = supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey (
        id, username, display_name, avatar_url, role, is_verified
      )
    `,
      { count: 'exact' }
    )
    .eq('post_id', post_id);

  // Filter by parent
  if (parent_id !== undefined) {
    if (parent_id === null) {
      queryBuilder = queryBuilder.is('parent_id', null);
    } else {
      queryBuilder = queryBuilder.eq('parent_id', parent_id);
    }
  }

  // Hidden filter
  if (!include_hidden) {
    queryBuilder = queryBuilder.eq('is_hidden', false);
  }

  // Sorting
  switch (sort_by) {
    case 'oldest':
      queryBuilder = queryBuilder.order('created_at', { ascending: true });
      break;
    case 'popular':
      queryBuilder = queryBuilder.order('reaction_counts->like', { ascending: false });
      break;
    case 'controversial':
      queryBuilder = queryBuilder.order('reply_count', { ascending: false });
      break;
    default:
      queryBuilder = queryBuilder.order('is_pinned', { ascending: false });
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
  }

  // Pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data: comments, count, error } = await queryBuilder;

  if (error) {
    logger.error('[Comments] Failed to get comments', error);
    throw error;
  }

  // Get user's reactions if logged in
  let userReactions: Map<string, ReactionType> = new Map();
  if (user && comments && comments.length > 0) {
    const commentIds = comments.map((c) => c.id);
    const { data: reactions } = await supabase
      .from('comment_reactions')
      .select('comment_id, reaction_type')
      .eq('user_id', user.id)
      .in('comment_id', commentIds);

    for (const reaction of reactions || []) {
      userReactions.set(reaction.comment_id, reaction.reaction_type as ReactionType);
    }
  }

  const enrichedComments = (comments || []).map((comment) => ({
    ...comment,
    user_reaction: userReactions.get(comment.id) || null,
  })) as CommentWithAuthor[];

  return {
    comments: enrichedComments,
    total: count || 0,
  };
}

/**
 * Get threaded comments
 */
export async function getThreadedComments(
  postId: string,
  maxDepth: number = 3
): Promise<ThreadedComment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all comments for the post
  const { data: allComments, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey (
        id, username, display_name, avatar_url, role, is_verified
      )
    `
    )
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('[Comments] Failed to get threaded comments', error);
    throw error;
  }

  // Get user's reactions
  let userReactions: Map<string, ReactionType> = new Map();
  if (user && allComments && allComments.length > 0) {
    const commentIds = allComments.map((c) => c.id);
    const { data: reactions } = await supabase
      .from('comment_reactions')
      .select('comment_id, reaction_type')
      .eq('user_id', user.id)
      .in('comment_id', commentIds);

    for (const reaction of reactions || []) {
      userReactions.set(reaction.comment_id, reaction.reaction_type as ReactionType);
    }
  }

  // Build tree structure
  const commentMap = new Map<string, ThreadedComment>();
  const roots: ThreadedComment[] = [];

  // First pass: create all nodes
  for (const comment of allComments || []) {
    commentMap.set(comment.id, {
      ...comment,
      user_reaction: userReactions.get(comment.id) || null,
      replies: [],
      depth: 0,
    } as ThreadedComment);
  }

  // Second pass: build tree
  for (const comment of allComments || []) {
    const node = commentMap.get(comment.id)!;

    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      const parent = commentMap.get(comment.parent_id)!;
      node.depth = parent.depth + 1;

      // Only nest up to maxDepth
      if (node.depth <= maxDepth) {
        parent.replies.push(node);
      } else {
        // Flatten deep replies to maxDepth level
        node.depth = maxDepth;
        let flattenTarget = parent;
        while (flattenTarget.depth > maxDepth - 1 && flattenTarget.replies.length > 0) {
          flattenTarget = flattenTarget.replies[flattenTarget.replies.length - 1];
        }
        flattenTarget.replies.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ============================================================================
// REACTION OPERATIONS
// ============================================================================

/**
 * Add or update a reaction
 */
export async function addReaction(
  commentId: string,
  reactionType: ReactionType
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check for existing reaction
  const { data: existing } = await supabase
    .from('comment_reactions')
    .select('id, reaction_type')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.reaction_type === reactionType) {
      // Remove reaction if same type
      await removeReaction(commentId);
      return;
    }

    // Update reaction type
    await supabase
      .from('comment_reactions')
      .update({ reaction_type: reactionType })
      .eq('id', existing.id);

    // Update counts
    await supabase.rpc('update_comment_reaction_count', {
      p_comment_id: commentId,
      p_old_type: existing.reaction_type,
      p_new_type: reactionType,
    });
  } else {
    // Create new reaction
    const { error } = await supabase.from('comment_reactions').insert({
      comment_id: commentId,
      user_id: user.id,
      reaction_type: reactionType,
    });

    if (error) {
      logger.error('[Comments] Failed to add reaction', error);
      throw error;
    }

    // Increment count
    await supabase.rpc('increment_comment_reaction', {
      p_comment_id: commentId,
      p_reaction_type: reactionType,
    });
  }

  logger.info('[Comments] Reaction added', { comment_id: commentId, reaction: reactionType });
}

/**
 * Remove a reaction
 */
export async function removeReaction(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get existing reaction
  const { data: existing } = await supabase
    .from('comment_reactions')
    .select('id, reaction_type')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return; // No reaction to remove
  }

  // Delete reaction
  await supabase.from('comment_reactions').delete().eq('id', existing.id);

  // Decrement count
  await supabase.rpc('decrement_comment_reaction', {
    p_comment_id: commentId,
    p_reaction_type: existing.reaction_type,
  });

  logger.info('[Comments] Reaction removed', { comment_id: commentId });
}

/**
 * Get users who reacted to a comment
 */
export async function getReactors(
  commentId: string,
  reactionType?: ReactionType
): Promise<{ user: { id: string; username: string; display_name: string; avatar_url: string | null }; reaction_type: ReactionType }[]> {
  const supabase = await createClient();

  let query = supabase
    .from('comment_reactions')
    .select(
      `
      reaction_type,
      user:profiles!comment_reactions_user_id_fkey (
        id, username, display_name, avatar_url
      )
    `
    )
    .eq('comment_id', commentId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (reactionType) {
    query = query.eq('reaction_type', reactionType);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[Comments] Failed to get reactors', error);
    throw error;
  }

  return (data || []).map((r) => ({
    user: r.user as { id: string; username: string; display_name: string; avatar_url: string | null },
    reaction_type: r.reaction_type as ReactionType,
  }));
}

// ============================================================================
// MODERATION
// ============================================================================

/**
 * Hide a comment (admin/moderator only)
 */
export async function hideComment(commentId: string, reason: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'editor') {
    throw new Error('Not authorized');
  }

  await supabase
    .from('comments')
    .update({
      is_hidden: true,
      hidden_reason: reason,
    })
    .eq('id', commentId);

  logger.info('[Comments] Comment hidden', { comment_id: commentId, reason });
}

/**
 * Unhide a comment
 */
export async function unhideComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'editor') {
    throw new Error('Not authorized');
  }

  await supabase
    .from('comments')
    .update({
      is_hidden: false,
      hidden_reason: null,
    })
    .eq('id', commentId);

  logger.info('[Comments] Comment unhidden', { comment_id: commentId });
}

/**
 * Pin a comment
 */
export async function pinComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get comment and check if user is post author
  const { data: comment } = await supabase
    .from('comments')
    .select('post_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    throw new Error('Comment not found');
  }

  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', comment.post_id)
    .single();

  // Check if user is post author or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'editor';
  const isAuthor = post?.author_id === user.id;

  if (!isAdmin && !isAuthor) {
    throw new Error('Not authorized');
  }

  await supabase.from('comments').update({ is_pinned: true }).eq('id', commentId);

  logger.info('[Comments] Comment pinned', { comment_id: commentId });
}

/**
 * Unpin a comment
 */
export async function unpinComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  await supabase.from('comments').update({ is_pinned: false }).eq('id', commentId);

  logger.info('[Comments] Comment unpinned', { comment_id: commentId });
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get comment statistics for a post
 */
export async function getCommentStats(postId: string): Promise<CommentStats> {
  const supabase = await createServiceClient();

  const { data: comments } = await supabase
    .from('comments')
    .select('id, parent_id, author_id, reaction_counts, created_at')
    .eq('post_id', postId)
    .eq('is_hidden', false);

  const allComments = comments || [];

  // Calculate stats
  const uniqueAuthors = new Set(allComments.map((c) => c.author_id));
  const _topLevelComments = allComments.filter((c) => !c.parent_id); // Reserved for future depth stats
  const replies = allComments.filter((c) => c.parent_id);

  // Aggregate reactions
  const reactionCounts: Record<ReactionType, number> = {
    like: 0,
    love: 0,
    laugh: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };

  for (const comment of allComments) {
    const counts = comment.reaction_counts as Record<ReactionType, number>;
    for (const [type, count] of Object.entries(counts)) {
      reactionCounts[type as ReactionType] += count;
    }
  }

  // Comments per day (last 30 days)
  const byDayMap = new Map<string, number>();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const comment of allComments) {
    const date = new Date(comment.created_at);
    if (date >= thirtyDaysAgo) {
      const dateStr = date.toISOString().split('T')[0];
      byDayMap.set(dateStr, (byDayMap.get(dateStr) || 0) + 1);
    }
  }

  const commentsPerDay = [...byDayMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total_comments: allComments.length,
    total_replies: replies.length,
    unique_commenters: uniqueAuthors.size,
    reaction_counts: reactionCounts,
    comments_per_day: commentsPerDay,
  };
}
