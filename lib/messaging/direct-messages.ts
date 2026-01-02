/**
 * Direct Messaging System
 * Phase 36: Private conversations between users
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface Conversation {
  id: string;
  participant_ids: string[];
  type: ConversationType;
  title: string | null; // For group conversations
  last_message_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: ConversationMetadata;
}

export type ConversationType = 'direct' | 'group';

export interface ConversationMetadata {
  is_support?: boolean;
  topic?: string;
  pinned_by?: string[];
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  notifications_enabled: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: MessageContentType;
  attachments: MessageAttachment[];
  reply_to_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  read_by: string[];
  created_at: string;
}

export type MessageContentType = 'text' | 'image' | 'file' | 'link' | 'system';

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'link';
  url: string;
  filename?: string;
  size?: number;
  mime_type?: string;
  thumbnail_url?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationWithDetails extends Conversation {
  participants: (ConversationParticipant & {
    user: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_online?: boolean;
    };
  })[];
  unread_count: number;
  last_message?: Message & {
    sender: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  reply_to?: Message & {
    sender: {
      id: string;
      username: string;
      display_name: string;
    };
  };
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

/**
 * Create a direct conversation between two users
 */
export async function createDirectConversation(
  userId: string,
  otherUserId: string
): Promise<Conversation> {
  const supabase = await createClient();

  // Check if conversation already exists
  const existing = await getDirectConversation(userId, otherUserId);
  if (existing) {
    return existing;
  }

  const participantIds = [userId, otherUserId].sort();

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      type: 'direct',
      participant_ids: participantIds,
      metadata: {},
    })
    .select()
    .single();

  if (convError) {
    logger.error('[DM] Failed to create conversation', convError);
    throw convError;
  }

  // Add participants
  const participants = participantIds.map((id, index) => ({
    conversation_id: conversation.id,
    user_id: id,
    role: index === 0 ? 'owner' : 'member',
    notifications_enabled: true,
    is_muted: false,
  }));

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (partError) {
    logger.error('[DM] Failed to add participants', partError);
    throw partError;
  }

  logger.info('[DM] Direct conversation created', {
    conversationId: conversation.id,
    participants: participantIds,
  });

  return conversation as Conversation;
}

/**
 * Create a group conversation
 */
export async function createGroupConversation(
  creatorId: string,
  participantIds: string[],
  title?: string
): Promise<Conversation> {
  const supabase = await createClient();

  const allParticipants = [creatorId, ...participantIds.filter((id) => id !== creatorId)];

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      type: 'group',
      participant_ids: allParticipants,
      title: title || null,
      metadata: {},
    })
    .select()
    .single();

  if (convError) {
    logger.error('[DM] Failed to create group conversation', convError);
    throw convError;
  }

  // Add participants
  const participants = allParticipants.map((id) => ({
    conversation_id: conversation.id,
    user_id: id,
    role: id === creatorId ? 'owner' : 'member',
    notifications_enabled: true,
    is_muted: false,
  }));

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (partError) {
    logger.error('[DM] Failed to add participants', partError);
    throw partError;
  }

  // Send system message
  await sendSystemMessage(conversation.id, `${creatorId} created the group`);

  logger.info('[DM] Group conversation created', {
    conversationId: conversation.id,
    participants: allParticipants,
  });

  return conversation as Conversation;
}

/**
 * Get a direct conversation between two users
 */
export async function getDirectConversation(
  userId: string,
  otherUserId: string
): Promise<Conversation | null> {
  const supabase = await createClient();

  const participantIds = [userId, otherUserId].sort();

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('type', 'direct')
    .contains('participant_ids', participantIds)
    .single();

  return data as Conversation | null;
}

/**
 * Get conversation by ID with full details
 */
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<ConversationWithDetails | null> {
  const supabase = await createClient();

  // Get conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) return null;

  // Verify user is participant
  if (!conversation.participant_ids.includes(userId)) {
    return null;
  }

  // Get participants with user details
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select(
      `
      *,
      user:profiles(id, username, display_name, avatar_url)
    `
    )
    .eq('conversation_id', conversationId);

  // Get last message
  const { data: lastMessage } = await supabase
    .from('messages')
    .select(
      `
      *,
      sender:profiles!sender_id(id, username, display_name, avatar_url)
    `
    )
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get unread count for user
  const userParticipant = (participants || []).find((p) => p.user_id === userId);
  const lastReadAt = userParticipant?.last_read_at;

  let unreadCount = 0;
  if (lastReadAt) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .neq('sender_id', userId)
      .gt('created_at', lastReadAt);

    unreadCount = count || 0;
  }

  return {
    ...conversation,
    participants: participants || [],
    unread_count: unreadCount,
    last_message: lastMessage || undefined,
  } as ConversationWithDetails;
}

/**
 * Get user's conversations
 */
export async function getUserConversations(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ conversations: ConversationWithDetails[]; total: number }> {
  const { limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  // Get conversation IDs where user is participant
  const { data: participations, count } = await supabase
    .from('conversation_participants')
    .select('conversation_id', { count: 'exact' })
    .eq('user_id', userId)
    .range(offset, offset + limit - 1);

  if (!participations?.length) {
    return { conversations: [], total: 0 };
  }

  const conversationIds = participations.map((p) => p.conversation_id);

  // Get conversations with details
  const conversations = await Promise.all(conversationIds.map((id) => getConversation(id, userId)));

  // Filter nulls and sort by last message
  const validConversations = conversations
    .filter((c): c is ConversationWithDetails => c !== null)
    .sort((a, b) => {
      const aTime = a.last_message_at || a.created_at;
      const bTime = b.last_message_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  return {
    conversations: validConversations,
    total: count || 0,
  };
}

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  options?: {
    contentType?: MessageContentType;
    attachments?: MessageAttachment[];
    replyToId?: string;
  }
): Promise<Message> {
  const supabase = await createClient();

  // Verify sender is participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', senderId)
    .single();

  if (!participant) {
    throw new Error('Not a participant of this conversation');
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      content_type: options?.contentType || 'text',
      attachments: options?.attachments || [],
      reply_to_id: options?.replyToId || null,
      read_by: [senderId],
    })
    .select()
    .single();

  if (error) {
    logger.error('[DM] Failed to send message', error);
    throw error;
  }

  // Update conversation
  await supabase
    .from('conversations')
    .update({
      last_message_id: message.id,
      last_message_at: message.created_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  logger.debug('[DM] Message sent', {
    conversationId,
    messageId: message.id,
    senderId,
  });

  return message as Message;
}

/**
 * Send a system message
 */
async function sendSystemMessage(conversationId: string, content: string): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: null,
    content,
    content_type: 'system',
    attachments: [],
    read_by: [],
  });
}

/**
 * Get messages in a conversation
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  options: { limit?: number; before?: string; after?: string } = {}
): Promise<{ messages: MessageWithSender[]; hasMore: boolean }> {
  const { limit = 50, before, after } = options;
  const supabase = await createClient();

  // Verify user is participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  if (!participant) {
    throw new Error('Not a participant of this conversation');
  }

  let query = supabase
    .from('messages')
    .select(
      `
      *,
      sender:profiles!sender_id(id, username, display_name, avatar_url)
    `
    )
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (before) {
    query = query.lt('created_at', before);
  }

  if (after) {
    query = query.gt('created_at', after);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[DM] Failed to get messages', error);
    throw error;
  }

  const hasMore = (data?.length || 0) > limit;
  const messages = (data || []).slice(0, limit);

  // Get reply messages if needed
  const replyIds = messages.filter((m) => m.reply_to_id).map((m) => m.reply_to_id);
  let replyMessages: Record<
    string,
    Message & { sender: { id: string; username: string; display_name: string } }
  > = {};

  if (replyIds.length) {
    const { data: replies } = await supabase
      .from('messages')
      .select(
        `
        *,
        sender:profiles!sender_id(id, username, display_name)
      `
      )
      .in('id', replyIds);

    replyMessages = Object.fromEntries((replies || []).map((r) => [r.id, r]));
  }

  const messagesWithReplies = messages.map((m) => ({
    ...m,
    reply_to: m.reply_to_id ? replyMessages[m.reply_to_id] : undefined,
  }));

  return {
    messages: messagesWithReplies.reverse() as MessageWithSender[],
    hasMore,
  };
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string,
  userId: string,
  newContent: string
): Promise<Message> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('messages')
    .update({
      content: newContent,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[DM] Failed to edit message', error);
    throw error;
  }

  return data as Message;
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('messages')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      content: '[Message deleted]',
    })
    .eq('id', messageId)
    .eq('sender_id', userId);

  if (error) {
    logger.error('[DM] Failed to delete message', error);
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markAsRead(conversationId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Update participant's last_read_at
  await supabase
    .from('conversation_participants')
    .update({
      last_read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  // Update read_by on unread messages
  const { data: unread } = await supabase
    .from('messages')
    .select('id, read_by')
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .not('read_by', 'cs', `{${userId}}`);

  if (unread?.length) {
    for (const message of unread) {
      const readBy = [...(message.read_by || []), userId];
      await supabase.from('messages').update({ read_by: readBy }).eq('id', message.id);
    }
  }
}

// ============================================================================
// PARTICIPANT MANAGEMENT
// ============================================================================

/**
 * Add participant to group conversation
 */
export async function addParticipant(
  conversationId: string,
  addedBy: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Verify adder has permission
  const { data: adder } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', addedBy)
    .single();

  if (!adder || (adder.role !== 'owner' && adder.role !== 'admin')) {
    throw new Error('Not authorized to add participants');
  }

  // Add participant
  const { error } = await supabase.from('conversation_participants').insert({
    conversation_id: conversationId,
    user_id: userId,
    role: 'member',
    notifications_enabled: true,
    is_muted: false,
  });

  if (error) {
    logger.error('[DM] Failed to add participant', error);
    throw error;
  }

  // Update conversation participant_ids
  const { data: conv } = await supabase
    .from('conversations')
    .select('participant_ids')
    .eq('id', conversationId)
    .single();

  if (conv) {
    await supabase
      .from('conversations')
      .update({
        participant_ids: [...conv.participant_ids, userId],
      })
      .eq('id', conversationId);
  }

  await sendSystemMessage(conversationId, `${addedBy} added ${userId} to the conversation`);
}

/**
 * Remove participant from group conversation
 */
export async function removeParticipant(
  conversationId: string,
  removedBy: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Verify remover has permission
  const { data: remover } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', removedBy)
    .single();

  if (!remover || (remover.role !== 'owner' && remover.role !== 'admin')) {
    throw new Error('Not authorized to remove participants');
  }

  // Remove participant
  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    logger.error('[DM] Failed to remove participant', error);
    throw error;
  }

  // Update conversation participant_ids
  const { data: conv } = await supabase
    .from('conversations')
    .select('participant_ids')
    .eq('id', conversationId)
    .single();

  if (conv) {
    await supabase
      .from('conversations')
      .update({
        participant_ids: conv.participant_ids.filter((id: string) => id !== userId),
      })
      .eq('id', conversationId);
  }

  await sendSystemMessage(conversationId, `${removedBy} removed ${userId} from the conversation`);
}

/**
 * Leave a conversation
 */
export async function leaveConversation(conversationId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  // Update conversation participant_ids
  const { data: conv } = await supabase
    .from('conversations')
    .select('participant_ids')
    .eq('id', conversationId)
    .single();

  if (conv) {
    await supabase
      .from('conversations')
      .update({
        participant_ids: conv.participant_ids.filter((id: string) => id !== userId),
      })
      .eq('id', conversationId);
  }

  await sendSystemMessage(conversationId, `${userId} left the conversation`);
}

/**
 * Mute/unmute conversation
 */
export async function toggleMute(
  conversationId: string,
  userId: string,
  muted: boolean
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('conversation_participants')
    .update({ is_muted: muted })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

export default {
  createDirectConversation,
  createGroupConversation,
  getConversation,
  getUserConversations,
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  markAsRead,
  addParticipant,
  removeParticipant,
  leaveConversation,
  toggleMute,
};
