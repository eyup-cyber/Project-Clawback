import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

// Database uses: 'star', 'fire', 'heart', 'clap', 'think'
export type ReactionType = 'star' | 'fire' | 'heart' | 'clap' | 'think';

// Comment reactions use: 'like', 'dislike'
export type CommentReactionType = 'like' | 'dislike';

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: CommentReactionType;
  created_at: string;
}

export interface ReactionCounts {
  star: number;
  fire: number;
  heart: number;
  clap: number;
  think: number;
  total: number;
}

export interface ReactionSummary {
  counts: ReactionCounts;
  userReaction: ReactionType | null;
}

// ============================================================================
// POST REACTION OPERATIONS
// ============================================================================

/**
 * Toggle a reaction on a post (add if not exists, remove if exists, change if different type)
 */
export async function togglePostReaction(
  postId: string,
  userId: string,
  reactionType: ReactionType
): Promise<{ action: 'added' | 'removed' | 'changed'; type: ReactionType | null }> {
  const supabase = await createClient();

  // Check if user already has a reaction of this type on this post
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, reaction_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('reaction_type', reactionType)
    .single();

  if (existing) {
    // Same type - remove the reaction
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);

    if (error) {
      logger.error('[togglePostReaction] Delete error', error, { postId, userId });
      throw ApiError.badRequest('Failed to remove reaction');
    }

    return { action: 'removed', type: null };
  } else {
    // No existing reaction of this type - add new one
    const { error } = await supabase.from('reactions').insert({
      post_id: postId,
      user_id: userId,
      reaction_type: reactionType,
    });

    if (error) {
      logger.error('[togglePostReaction] Insert error', error, { postId, userId, reactionType });
      throw ApiError.badRequest('Failed to add reaction');
    }

    return { action: 'added', type: reactionType };
  }
}

/**
 * Get reaction summary for a post
 */
export async function getPostReactionSummary(
  postId: string,
  userId?: string
): Promise<ReactionSummary> {
  const supabase = await createClient();

  // Get all reactions for the post
  const { data: reactions } = await supabase
    .from('reactions')
    .select('reaction_type, user_id')
    .eq('post_id', postId);

  const counts: ReactionCounts = {
    star: 0,
    fire: 0,
    heart: 0,
    clap: 0,
    think: 0,
    total: 0,
  };

  let userReaction: ReactionType | null = null;

  (reactions || []).forEach((r) => {
    const rt = r.reaction_type as ReactionType;
    if (counts[rt] !== undefined) {
      counts[rt]++;
      counts.total++;
    }
    if (userId && r.user_id === userId) {
      userReaction = rt;
    }
  });

  return { counts, userReaction };
}

/**
 * Get users who reacted to a post
 */
export async function getPostReactors(
  postId: string,
  reactionType?: ReactionType,
  limit: number = 10
): Promise<Array<{ user: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }; reaction_type: ReactionType }>> {
  const supabase = await createClient();

  let query = supabase
    .from('reactions')
    .select(`
      reaction_type,
      user:profiles!reactions_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (reactionType) {
    query = query.eq('reaction_type', reactionType);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[getPostReactors] Error', error, { postId, reactionType });
    return [];
  }

  return (data || []) as Array<{ user: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }; reaction_type: ReactionType }>;
}

// ============================================================================
// COMMENT REACTION OPERATIONS
// ============================================================================

/**
 * Toggle a reaction on a comment
 */
export async function toggleCommentReaction(
  commentId: string,
  userId: string,
  reactionType: CommentReactionType
): Promise<{ action: 'added' | 'removed' | 'changed'; type: CommentReactionType | null }> {
  const supabase = await createClient();

  // Check if user already has a reaction on this comment (only one per user per comment)
  const { data: existing } = await supabase
    .from('comment_reactions')
    .select('id, reaction_type')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.reaction_type === reactionType) {
      // Same type - remove the reaction
      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('id', existing.id);

      if (error) {
        logger.error('[toggleCommentReaction] Delete error', error, { commentId, userId });
        throw ApiError.badRequest('Failed to remove reaction');
      }

      return { action: 'removed', type: null };
    } else {
      // Different type - update the reaction
      const { error } = await supabase
        .from('comment_reactions')
        .update({ reaction_type: reactionType })
        .eq('id', existing.id);

      if (error) {
        logger.error('[toggleCommentReaction] Update error', error, {
          commentId,
          userId,
          reactionType,
        });
        throw ApiError.badRequest('Failed to update reaction');
      }

      return { action: 'changed', type: reactionType };
    }
  } else {
    // No existing reaction - add new one
    const { error } = await supabase.from('comment_reactions').insert({
      comment_id: commentId,
      user_id: userId,
      reaction_type: reactionType,
    });

    if (error) {
      logger.error('[toggleCommentReaction] Insert error', error, {
        commentId,
        userId,
        reactionType,
      });
      throw ApiError.badRequest('Failed to add reaction');
    }

    return { action: 'added', type: reactionType };
  }
}

/**
 * Get reaction summary for a comment
 */
export interface CommentReactionCounts {
  like: number;
  dislike: number;
  total: number;
}

export interface CommentReactionSummary {
  counts: CommentReactionCounts;
  userReaction: CommentReactionType | null;
}

export async function getCommentReactionSummary(
  commentId: string,
  userId?: string
): Promise<CommentReactionSummary> {
  const supabase = await createClient();

  const { data: reactions } = await supabase
    .from('comment_reactions')
    .select('reaction_type, user_id')
    .eq('comment_id', commentId);

  const counts: CommentReactionCounts = {
    like: 0,
    dislike: 0,
    total: 0,
  };

  let userReaction: CommentReactionType | null = null;

  (reactions || []).forEach((r) => {
    const rt = r.reaction_type as CommentReactionType;
    if (rt === 'like' || rt === 'dislike') {
      counts[rt]++;
      counts.total++;
    }
    if (userId && r.user_id === userId) {
      userReaction = rt;
    }
  });

  return { counts, userReaction };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Get reaction summaries for multiple posts
 */
export async function getPostsReactionSummaries(
  postIds: string[],
  userId?: string
): Promise<Map<string, ReactionSummary>> {
  const supabase = await createClient();

  const { data: reactions } = await supabase
    .from('reactions')
    .select('post_id, reaction_type, user_id')
    .in('post_id', postIds);

  const summaries = new Map<string, ReactionSummary>();

  // Initialize all posts with zero counts
  postIds.forEach((id) => {
    summaries.set(id, {
      counts: { star: 0, fire: 0, heart: 0, clap: 0, think: 0, total: 0 },
      userReaction: null,
    });
  });

  // Count reactions
  (reactions || []).forEach((r) => {
    const summary = summaries.get(r.post_id);
    if (summary) {
      const rt = r.reaction_type as ReactionType;
      if (summary.counts[rt] !== undefined) {
        summary.counts[rt]++;
        summary.counts.total++;
      }
      if (userId && r.user_id === userId) {
        summary.userReaction = rt;
      }
    }
  });

  return summaries;
}

/**
 * Check if user has reacted to a post (returns first reaction type found)
 */
export async function hasUserReacted(
  postId: string,
  userId: string
): Promise<ReactionType | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('reactions')
    .select('reaction_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .limit(1)
    .single();

  return (data?.reaction_type as ReactionType) ?? null;
}

