/**
 * @mentions System
 * Phase 37: Parse, store, and notify mentions in posts and comments
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Mention {
  id: string;
  mentioned_user_id: string;
  mentioner_id: string;
  context_type: MentionContextType;
  context_id: string;
  position_start: number;
  position_end: number;
  is_read: boolean;
  created_at: string;
}

export type MentionContextType = 'post' | 'comment' | 'message' | 'bio';

export interface MentionWithDetails extends Mention {
  mentioned_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  mentioner: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  context: {
    title?: string;
    content_preview?: string;
    url?: string;
  };
}

export interface ParsedMention {
  username: string;
  startIndex: number;
  endIndex: number;
}

export interface UserSuggestion {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_following?: boolean;
}

// ============================================================================
// MENTION PARSING
// ============================================================================

/**
 * Parse @mentions from text
 */
export function parseMentions(text: string): ParsedMention[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: ParsedMention[] = [];
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Extract unique usernames from mentions
 */
export function extractMentionedUsernames(text: string): string[] {
  const mentions = parseMentions(text);
  return [...new Set(mentions.map((m) => m.username.toLowerCase()))];
}

/**
 * Convert text with @mentions to HTML with links
 */
export function renderMentions(text: string, linkTemplate: string = '/u/{username}'): string {
  return text.replace(/@(\w+)/g, (match, username) => {
    const link = linkTemplate.replace('{username}', username);
    return `<a href="${link}" class="mention" data-username="${username}">@${username}</a>`;
  });
}

/**
 * Convert text with @mentions to plain text (for excerpts)
 */
export function stripMentions(text: string): string {
  return text.replace(/@(\w+)/g, '$1');
}

// ============================================================================
// MENTION STORAGE
// ============================================================================

/**
 * Process and store mentions from content
 */
export async function processMentions(
  mentionerId: string,
  contextType: MentionContextType,
  contextId: string,
  content: string
): Promise<Mention[]> {
  const supabase = await createServiceClient();

  // Parse mentions
  const parsedMentions = parseMentions(content);
  if (parsedMentions.length === 0) {
    return [];
  }

  // Get unique usernames
  const usernames = [...new Set(parsedMentions.map((m) => m.username.toLowerCase()))];

  // Look up user IDs
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', usernames);

  if (!users?.length) {
    return [];
  }

  const usernameToId = new Map(users.map((u) => [u.username.toLowerCase(), u.id]));

  // Create mention records
  const mentions: Array<Omit<Mention, 'id' | 'created_at'>> = [];

  for (const parsed of parsedMentions) {
    const userId = usernameToId.get(parsed.username.toLowerCase());
    if (!userId || userId === mentionerId) continue; // Don't mention yourself

    mentions.push({
      mentioned_user_id: userId,
      mentioner_id: mentionerId,
      context_type: contextType,
      context_id: contextId,
      position_start: parsed.startIndex,
      position_end: parsed.endIndex,
      is_read: false,
    });
  }

  if (mentions.length === 0) {
    return [];
  }

  // Remove duplicates (same user mentioned multiple times)
  const uniqueMentions = mentions.filter((m, i, arr) =>
    arr.findIndex((x) => x.mentioned_user_id === m.mentioned_user_id) === i
  );

  // Insert mentions
  const { data, error } = await supabase
    .from('mentions')
    .insert(uniqueMentions)
    .select();

  if (error) {
    logger.error('[Mentions] Failed to store mentions', error);
    throw error;
  }

  // Create notifications for mentioned users
  await createMentionNotifications(data as Mention[], contextType, contextId);

  logger.info('[Mentions] Mentions processed', {
    contextType,
    contextId,
    count: data?.length || 0,
  });

  return (data || []) as Mention[];
}

/**
 * Delete mentions for a context (e.g., when editing content)
 */
export async function deleteMentions(
  contextType: MentionContextType,
  contextId: string
): Promise<void> {
  const supabase = await createServiceClient();

  await supabase
    .from('mentions')
    .delete()
    .eq('context_type', contextType)
    .eq('context_id', contextId);
}

/**
 * Update mentions when content is edited
 */
export async function updateMentions(
  mentionerId: string,
  contextType: MentionContextType,
  contextId: string,
  newContent: string
): Promise<Mention[]> {
  // Delete old mentions
  await deleteMentions(contextType, contextId);

  // Process new mentions
  return processMentions(mentionerId, contextType, contextId, newContent);
}

// ============================================================================
// MENTION NOTIFICATIONS
// ============================================================================

/**
 * Create notifications for mentions
 */
async function createMentionNotifications(
  mentions: Mention[],
  contextType: MentionContextType,
  contextId: string
): Promise<void> {
  const supabase = await createServiceClient();

  // Get context details for notification
  let contextDetails: { title?: string; url?: string } = {};

  switch (contextType) {
    case 'post':
      const { data: post } = await supabase
        .from('posts')
        .select('title, slug')
        .eq('id', contextId)
        .single();
      if (post) {
        contextDetails = {
          title: post.title,
          url: `/posts/${post.slug}`,
        };
      }
      break;

    case 'comment':
      const { data: comment } = await supabase
        .from('comments')
        .select('post:posts(title, slug)')
        .eq('id', contextId)
        .single();
      if (comment?.post) {
        contextDetails = {
          title: (comment.post as { title: string }).title,
          url: `/posts/${(comment.post as { slug: string }).slug}#comment-${contextId}`,
        };
      }
      break;
  }

  // Create notifications
  const notifications = mentions.map((mention) => ({
    user_id: mention.mentioned_user_id,
    type: 'mention',
    title: 'You were mentioned',
    message: `Someone mentioned you in ${contextType === 'post' ? 'a post' : 'a comment'}`,
    data: {
      mention_id: mention.id,
      context_type: contextType,
      context_id: contextId,
      mentioner_id: mention.mentioner_id,
      ...contextDetails,
    },
    is_read: false,
  }));

  if (notifications.length) {
    await supabase.from('notifications').insert(notifications);
  }
}

// ============================================================================
// MENTION QUERIES
// ============================================================================

/**
 * Get mentions for a user
 */
export async function getUserMentions(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
): Promise<{ mentions: MentionWithDetails[]; total: number }> {
  const { unreadOnly = false, limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  let query = supabase
    .from('mentions')
    .select(`
      *,
      mentioned_user:profiles!mentioned_user_id(id, username, display_name, avatar_url),
      mentioner:profiles!mentioner_id(id, username, display_name, avatar_url)
    `, { count: 'exact' })
    .eq('mentioned_user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, count, error } = await query;

  if (error) {
    logger.error('[Mentions] Failed to get mentions', error);
    throw error;
  }

  // Enrich with context details
  const mentionsWithContext = await Promise.all(
    (data || []).map(async (mention) => {
      const context = await getMentionContext(mention.context_type, mention.context_id);
      return {
        ...mention,
        context,
      };
    })
  );

  return {
    mentions: mentionsWithContext as MentionWithDetails[],
    total: count || 0,
  };
}

/**
 * Get context details for a mention
 */
async function getMentionContext(
  contextType: MentionContextType,
  contextId: string
): Promise<{ title?: string; content_preview?: string; url?: string }> {
  const supabase = await createServiceClient();

  switch (contextType) {
    case 'post':
      const { data: post } = await supabase
        .from('posts')
        .select('title, excerpt, slug')
        .eq('id', contextId)
        .single();
      if (post) {
        return {
          title: post.title,
          content_preview: post.excerpt,
          url: `/posts/${post.slug}`,
        };
      }
      break;

    case 'comment':
      const { data: comment } = await supabase
        .from('comments')
        .select('content, post:posts(title, slug)')
        .eq('id', contextId)
        .single();
      if (comment) {
        return {
          title: (comment.post as { title: string })?.title,
          content_preview: comment.content?.substring(0, 100),
          url: `/posts/${(comment.post as { slug: string })?.slug}#comment-${contextId}`,
        };
      }
      break;

    case 'message':
      return {
        title: 'Direct Message',
        url: `/messages`,
      };
  }

  return {};
}

/**
 * Mark mention as read
 */
export async function markMentionAsRead(mentionId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('mentions')
    .update({ is_read: true })
    .eq('id', mentionId)
    .eq('mentioned_user_id', userId);
}

/**
 * Mark all mentions as read
 */
export async function markAllMentionsAsRead(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('mentions')
    .update({ is_read: true })
    .eq('mentioned_user_id', userId)
    .eq('is_read', false);
}

/**
 * Get unread mention count
 */
export async function getUnreadMentionCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('mentions')
    .select('*', { count: 'exact', head: true })
    .eq('mentioned_user_id', userId)
    .eq('is_read', false);

  return count || 0;
}

// ============================================================================
// USER SUGGESTIONS
// ============================================================================

/**
 * Get user suggestions for autocomplete
 */
export async function getMentionSuggestions(
  query: string,
  currentUserId?: string,
  limit: number = 10
): Promise<UserSuggestion[]> {
  const supabase = await createClient();

  const searchQuery = query.toLowerCase().replace('@', '');

  let dbQuery = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
    .limit(limit);

  if (currentUserId) {
    dbQuery = dbQuery.neq('id', currentUserId);
  }

  const { data, error } = await dbQuery;

  if (error) {
    logger.error('[Mentions] Failed to get suggestions', error);
    return [];
  }

  // If user is logged in, mark which users they follow
  let suggestions: UserSuggestion[] = (data || []).map((user) => ({
    ...user,
    is_following: false,
  }));

  if (currentUserId) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .eq('following_type', 'user')
      .in('following_id', suggestions.map((s) => s.id));

    const followingIds = new Set((follows || []).map((f) => f.following_id));

    suggestions = suggestions.map((s) => ({
      ...s,
      is_following: followingIds.has(s.id),
    }));

    // Sort followed users first
    suggestions.sort((a, b) => {
      if (a.is_following && !b.is_following) return -1;
      if (!a.is_following && b.is_following) return 1;
      return 0;
    });
  }

  return suggestions;
}

/**
 * Get frequently mentioned users
 */
export async function getFrequentlyMentionedUsers(
  userId: string,
  limit: number = 5
): Promise<UserSuggestion[]> {
  const supabase = await createClient();

  // Get users this person has mentioned most
  const { data } = await supabase
    .from('mentions')
    .select('mentioned_user_id')
    .eq('mentioner_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!data?.length) {
    return [];
  }

  // Count mentions per user
  const mentionCounts = new Map<string, number>();
  data.forEach((m) => {
    const count = mentionCounts.get(m.mentioned_user_id) || 0;
    mentionCounts.set(m.mentioned_user_id, count + 1);
  });

  // Sort by count and get top users
  const topUserIds = [...mentionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  // Get user details
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', topUserIds);

  return (users || []) as UserSuggestion[];
}

export default {
  parseMentions,
  extractMentionedUsernames,
  renderMentions,
  stripMentions,
  processMentions,
  deleteMentions,
  updateMentions,
  getUserMentions,
  markMentionAsRead,
  markAllMentionsAsRead,
  getUnreadMentionCount,
  getMentionSuggestions,
  getFrequentlyMentionedUsers,
};
