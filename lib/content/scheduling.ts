/**
 * Content Scheduling System
 * Phase 23: Scheduled publishing, content queue, calendar view
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledPost {
  id: string;
  title: string;
  slug: string;
  author_id: string;
  status: PostStatus;
  scheduled_for: string;
  publish_timezone: string;
  auto_social_share: boolean;
  social_share_text: string | null;
  priority: 'low' | 'normal' | 'high' | 'featured';
  created_at: string;
  updated_at: string;
  author?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  category?: {
    name: string;
    slug: string;
    color: string;
  };
}

export type PostStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';

export interface ContentQueueItem {
  id: string;
  post_id: string;
  position: number;
  added_at: string;
  added_by: string;
  notes: string | null;
  post: ScheduledPost;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'scheduled' | 'published' | 'draft';
  postId: string;
  slug: string;
  authorName: string;
  categoryName: string | null;
  priority: string;
}

export interface SchedulingSlot {
  date: string;
  time: string;
  available: boolean;
  reason?: string;
}

// ============================================================================
// SCHEDULING FUNCTIONS
// ============================================================================

/**
 * Schedule a post for future publication
 */
export async function schedulePost(
  postId: string,
  scheduledFor: Date,
  options: {
    timezone?: string;
    autoSocialShare?: boolean;
    socialShareText?: string;
    priority?: 'low' | 'normal' | 'high' | 'featured';
  } = {}
): Promise<ScheduledPost> {
  const {
    timezone = 'UTC',
    autoSocialShare = false,
    socialShareText = null,
    priority = 'normal',
  } = options;

  const supabase = await createClient();

  // Validate scheduled time is in the future
  if (scheduledFor <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  const { data, error } = await supabase
    .from('posts')
    .update({
      status: 'scheduled',
      scheduled_for: scheduledFor.toISOString(),
      publish_timezone: timezone,
      auto_social_share: autoSocialShare,
      social_share_text: socialShareText,
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
      category:categories(name, slug, color)
    `
    )
    .single();

  if (error) {
    logger.error('[Scheduling] Failed to schedule post', error);
    throw error;
  }

  logger.info('[Scheduling] Post scheduled', {
    postId,
    scheduledFor: scheduledFor.toISOString(),
  });

  return data as unknown as ScheduledPost;
}

/**
 * Reschedule a post
 */
export async function reschedulePost(
  postId: string,
  newScheduledFor: Date,
  reason?: string
): Promise<ScheduledPost> {
  const supabase = await createClient();

  // Validate scheduled time is in the future
  if (newScheduledFor <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  // Get current post
  const { data: currentPost } = await supabase
    .from('posts')
    .select('scheduled_for')
    .eq('id', postId)
    .single();

  const { data, error } = await supabase
    .from('posts')
    .update({
      scheduled_for: newScheduledFor.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('status', 'scheduled')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
      category:categories(name, slug, color)
    `
    )
    .single();

  if (error) {
    logger.error('[Scheduling] Failed to reschedule post', error);
    throw error;
  }

  // Log the reschedule
  await supabase.from('post_history').insert({
    post_id: postId,
    action: 'rescheduled',
    previous_value: currentPost?.scheduled_for,
    new_value: newScheduledFor.toISOString(),
    reason,
  });

  logger.info('[Scheduling] Post rescheduled', {
    postId,
    oldTime: currentPost?.scheduled_for,
    newTime: newScheduledFor.toISOString(),
  });

  return data as unknown as ScheduledPost;
}

/**
 * Cancel scheduled publication
 */
export async function unschedulePost(postId: string): Promise<ScheduledPost> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .update({
      status: 'draft',
      scheduled_for: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('status', 'scheduled')
    .select()
    .single();

  if (error) {
    logger.error('[Scheduling] Failed to unschedule post', error);
    throw error;
  }

  logger.info('[Scheduling] Post unscheduled', { postId });

  return data as ScheduledPost;
}

/**
 * Get all scheduled posts
 */
export async function getScheduledPosts(options: {
  authorId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ posts: ScheduledPost[]; total: number }> {
  const { authorId, fromDate, toDate, limit = 50, offset = 0 } = options;
  const supabase = await createClient();

  let query = supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
      category:categories(name, slug, color)
    `,
      { count: 'exact' }
    )
    .eq('status', 'scheduled')
    .order('scheduled_for', { ascending: true })
    .range(offset, offset + limit - 1);

  if (authorId) {
    query = query.eq('author_id', authorId);
  }
  if (fromDate) {
    query = query.gte('scheduled_for', fromDate.toISOString());
  }
  if (toDate) {
    query = query.lte('scheduled_for', toDate.toISOString());
  }

  const { data, count, error } = await query;

  if (error) {
    logger.error('[Scheduling] Failed to fetch scheduled posts', error);
    throw error;
  }

  return {
    posts: (data || []) as unknown as ScheduledPost[],
    total: count || 0,
  };
}

/**
 * Get posts for a specific date
 */
export async function getPostsForDate(date: Date): Promise<ScheduledPost[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { posts } = await getScheduledPosts({
    fromDate: startOfDay,
    toDate: endOfDay,
  });

  return posts;
}

// ============================================================================
// CONTENT QUEUE
// ============================================================================

/**
 * Get the content queue
 */
export async function getContentQueue(): Promise<ContentQueueItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_queue')
    .select(
      `
      *,
      post:posts(
        *,
        author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
        category:categories(name, slug, color)
      )
    `
    )
    .order('position', { ascending: true });

  if (error) {
    logger.error('[Queue] Failed to fetch content queue', error);
    throw error;
  }

  return (data || []) as unknown as ContentQueueItem[];
}

/**
 * Add a post to the content queue
 */
export async function addToQueue(
  postId: string,
  addedBy: string,
  options: { position?: number; notes?: string } = {}
): Promise<ContentQueueItem> {
  const supabase = await createClient();
  const { position, notes } = options;

  // Get max position if not specified
  let insertPosition = position;
  if (insertPosition === undefined) {
    const { data: maxPos } = await supabase
      .from('content_queue')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    insertPosition = (maxPos?.position || 0) + 1;
  }

  const { data, error } = await supabase
    .from('content_queue')
    .insert({
      post_id: postId,
      position: insertPosition,
      added_by: addedBy,
      notes,
    })
    .select(
      `
      *,
      post:posts(
        *,
        author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
        category:categories(name, slug, color)
      )
    `
    )
    .single();

  if (error) {
    logger.error('[Queue] Failed to add to queue', error);
    throw error;
  }

  logger.info('[Queue] Post added to queue', { postId, position: insertPosition });

  return data as unknown as ContentQueueItem;
}

/**
 * Remove a post from the content queue
 */
export async function removeFromQueue(queueItemId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('content_queue').delete().eq('id', queueItemId);

  if (error) {
    logger.error('[Queue] Failed to remove from queue', error);
    throw error;
  }

  logger.info('[Queue] Post removed from queue', { queueItemId });
}

/**
 * Reorder the content queue
 */
export async function reorderQueue(
  items: { id: string; position: number }[]
): Promise<void> {
  const supabase = await createClient();

  // Update positions
  for (const item of items) {
    const { error } = await supabase
      .from('content_queue')
      .update({ position: item.position })
      .eq('id', item.id);

    if (error) {
      logger.error('[Queue] Failed to reorder queue item', error);
      throw error;
    }
  }

  logger.info('[Queue] Queue reordered', { count: items.length });
}

/**
 * Schedule next item in queue
 */
export async function scheduleNextInQueue(
  scheduledFor: Date,
  options: {
    timezone?: string;
    autoSocialShare?: boolean;
  } = {}
): Promise<ScheduledPost | null> {
  const queue = await getContentQueue();

  if (queue.length === 0) return null;

  const nextItem = queue[0];

  // Schedule the post
  const scheduledPost = await schedulePost(nextItem.post_id, scheduledFor, options);

  // Remove from queue
  await removeFromQueue(nextItem.id);

  return scheduledPost;
}

// ============================================================================
// CALENDAR VIEW
// ============================================================================

/**
 * Get calendar events for a date range
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const supabase = await createClient();

  // Get scheduled posts
  const { data: scheduled } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      scheduled_for,
      priority,
      author:profiles!posts_author_id_fkey(display_name),
      category:categories(name)
    `
    )
    .eq('status', 'scheduled')
    .gte('scheduled_for', startDate.toISOString())
    .lte('scheduled_for', endDate.toISOString());

  // Get published posts
  const { data: published } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      published_at,
      priority,
      author:profiles!posts_author_id_fkey(display_name),
      category:categories(name)
    `
    )
    .eq('status', 'published')
    .gte('published_at', startDate.toISOString())
    .lte('published_at', endDate.toISOString());

  const events: CalendarEvent[] = [];

  // Map scheduled posts
  for (const post of scheduled || []) {
    const date = new Date(post.scheduled_for);
    events.push({
      id: `scheduled-${post.id}`,
      title: post.title,
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5),
      type: 'scheduled',
      postId: post.id,
      slug: post.slug,
      authorName: (post.author as { display_name: string })?.display_name || 'Unknown',
      categoryName: (post.category as { name: string })?.name || null,
      priority: post.priority,
    });
  }

  // Map published posts
  for (const post of published || []) {
    const date = new Date(post.published_at);
    events.push({
      id: `published-${post.id}`,
      title: post.title,
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5),
      type: 'published',
      postId: post.id,
      slug: post.slug,
      authorName: (post.author as { display_name: string })?.display_name || 'Unknown',
      categoryName: (post.category as { name: string })?.name || null,
      priority: post.priority,
    });
  }

  return events.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Get available scheduling slots
 */
export async function getAvailableSlots(
  date: Date,
  options: { interval?: number; startHour?: number; endHour?: number } = {}
): Promise<SchedulingSlot[]> {
  const { interval = 60, startHour = 6, endHour = 22 } = options;
  const supabase = await createClient();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get already scheduled times
  const { data: scheduled } = await supabase
    .from('posts')
    .select('scheduled_for')
    .eq('status', 'scheduled')
    .gte('scheduled_for', startOfDay.toISOString())
    .lte('scheduled_for', endOfDay.toISOString());

  const scheduledTimes = new Set(
    (scheduled || []).map((p) => {
      const d = new Date(p.scheduled_for);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    })
  );

  // Generate slots
  const slots: SchedulingSlot[] = [];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotTime = new Date(date);
      slotTime.setHours(hour, minute, 0, 0);

      let available = true;
      let reason: string | undefined;

      // Check if slot is in the past
      if (isToday && slotTime <= now) {
        available = false;
        reason = 'Time has passed';
      }
      // Check if slot is already taken
      else if (scheduledTimes.has(time)) {
        available = false;
        reason = 'Already scheduled';
      }

      slots.push({
        date: date.toISOString().split('T')[0],
        time,
        available,
        reason,
      });
    }
  }

  return slots;
}

// ============================================================================
// AUTO-PUBLISHING JOB
// ============================================================================

/**
 * Process scheduled posts for publishing
 * This should be called by a cron job
 */
export async function processScheduledPosts(): Promise<number> {
  const supabase = await createServiceClient();
  const now = new Date();

  // Get posts that should be published
  const { data: postsToPublish, error } = await supabase
    .from('posts')
    .select('id, title, scheduled_for, auto_social_share, social_share_text')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now.toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (error) {
    logger.error('[Scheduling] Failed to fetch posts for publishing', error);
    return 0;
  }

  let published = 0;

  for (const post of postsToPublish || []) {
    try {
      // Publish the post
      const { error: publishError } = await supabase
        .from('posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          scheduled_for: null,
        })
        .eq('id', post.id);

      if (publishError) {
        logger.error('[Scheduling] Failed to publish post', { postId: post.id, error: publishError });
        continue;
      }

      // TODO: Trigger social share if enabled
      // if (post.auto_social_share) {
      //   await triggerSocialShare(post.id, post.social_share_text);
      // }

      published++;
      logger.info('[Scheduling] Post published', { postId: post.id, title: post.title });
    } catch (err) {
      logger.error('[Scheduling] Error publishing post', { postId: post.id, error: err });
    }
  }

  return published;
}

export default {
  schedulePost,
  reschedulePost,
  unschedulePost,
  getScheduledPosts,
  getPostsForDate,
  getContentQueue,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  scheduleNextInQueue,
  getCalendarEvents,
  getAvailableSlots,
  processScheduledPosts,
};
