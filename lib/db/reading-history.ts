// @ts-nocheck
/**
 * Reading History Database Operations
 * Phase 3.3: Reading progress tracking and history
 */

import { createClient } from '@/lib/supabase/server';

export interface ReadingHistoryItem {
  id: string;
  user_id: string;
  post_id: string;
  progress: number;
  scroll_position: number;
  time_spent_seconds: number;
  first_read_at: string;
  last_read_at: string;
  completed_at: string | null;
  created_at: string;
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featured_image_url: string | null;
    reading_time: number | null;
    published_at: string | null;
    author: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
    category: {
      id: string;
      name: string;
      slug: string;
      color: string | null;
    } | null;
  };
}

export interface ReadingStats {
  total_articles: number;
  completed_articles: number;
  total_time_seconds: number;
  current_streak: number;
  articles_this_week: number;
  articles_this_month: number;
  average_reading_time: number;
}

export interface ContinueReadingItem {
  post_id: string;
  progress: number;
  last_read_at: string;
  time_spent_seconds: number;
  scroll_position: number;
  post: {
    id: string;
    title: string;
    slug: string;
    featured_image_url: string | null;
    reading_time: number | null;
    author: {
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
}

// ============================================================================
// READING PROGRESS
// ============================================================================

export async function updateReadingProgress(
  userId: string,
  postId: string,
  data: {
    progress: number;
    scrollPosition?: number;
    timeSpent?: number;
  }
): Promise<ReadingHistoryItem> {
  const supabase = await createClient();

  // Use upsert with conflict handling
  const { data: history, error } = await supabase
    .from('reading_history')
    .upsert(
      {
        user_id: userId,
        post_id: postId,
        progress: data.progress,
        scroll_position: data.scrollPosition || 0,
        time_spent_seconds: data.timeSpent || 0,
        last_read_at: new Date().toISOString(),
        completed_at: data.progress >= 0.9 ? new Date().toISOString() : null,
      },
      {
        onConflict: 'user_id,post_id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) throw error;
  return history;
}

export async function getReadingProgress(
  userId: string,
  postId: string
): Promise<ReadingHistoryItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reading_history')
    .select('*')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================================================
// CONTINUE READING
// ============================================================================

export async function getContinueReading(
  userId: string,
  limit: number = 5
): Promise<ContinueReadingItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reading_history')
    .select(
      `
      post_id,
      progress,
      last_read_at,
      time_spent_seconds,
      scroll_position,
      post:posts!inner(
        id,
        title,
        slug,
        featured_image_url,
        reading_time,
        status,
        author:profiles!posts_author_id_fkey(
          display_name,
          avatar_url
        )
      )
    `
    )
    .eq('user_id', userId)
    .is('completed_at', null)
    .lt('progress', 0.9)
    .eq('post.status', 'published')
    .order('last_read_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ContinueReadingItem[];
}

// ============================================================================
// READING HISTORY
// ============================================================================

export interface GetReadingHistoryOptions {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  completedOnly?: boolean;
}

export interface ReadingHistoryResult {
  items: ReadingHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export async function getReadingHistory(
  userId: string,
  options: GetReadingHistoryOptions = {}
): Promise<ReadingHistoryResult> {
  const { page = 1, limit = 20, dateFrom, dateTo, completedOnly } = options;

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('reading_history')
    .select(
      `
      *,
      post:posts!inner(
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        reading_time,
        published_at,
        author:profiles!posts_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        category:categories(
          id,
          name,
          slug,
          color
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId);

  if (dateFrom) {
    query = query.gte('last_read_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('last_read_at', dateTo);
  }

  if (completedOnly) {
    query = query.not('completed_at', 'is', null);
  }

  query = query.order('last_read_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    items: (data || []) as ReadingHistoryItem[],
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

export async function clearReadingHistory(userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('reading_history').delete().eq('user_id', userId);

  if (error) throw error;
}

export async function removeFromHistory(userId: string, historyId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reading_history')
    .delete()
    .eq('id', historyId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function markAsCompleted(userId: string, postId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reading_history')
    .update({
      progress: 1,
      completed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) throw error;
}

// ============================================================================
// READING STATS
// ============================================================================

export async function getReadingStats(userId: string): Promise<ReadingStats> {
  const supabase = await createClient();

  // Get basic stats
  const { data: historyData, error: historyError } = await supabase
    .from('reading_history')
    .select('time_spent_seconds, completed_at, last_read_at')
    .eq('user_id', userId);

  if (historyError) throw historyError;

  const items = historyData || [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalArticles = items.length;
  const completedArticles = items.filter((i) => i.completed_at).length;
  const totalTimeSeconds = items.reduce((sum, i) => sum + (i.time_spent_seconds || 0), 0);

  const articlesThisWeek = items.filter((i) => new Date(i.last_read_at) >= weekAgo).length;

  const articlesThisMonth = items.filter((i) => new Date(i.last_read_at) >= monthAgo).length;

  const averageReadingTime = totalArticles > 0 ? Math.round(totalTimeSeconds / totalArticles) : 0;

  // Calculate streak (consecutive days with reading)
  const readDates = [...new Set(items.map((i) => new Date(i.last_read_at).toDateString()))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  let currentStreak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

  if (readDates[0] === today || readDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < readDates.length; i++) {
      const current = new Date(readDates[i - 1]);
      const prev = new Date(readDates[i]);
      const diffDays = Math.round((current.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    total_articles: totalArticles,
    completed_articles: completedArticles,
    total_time_seconds: totalTimeSeconds,
    current_streak: currentStreak,
    articles_this_week: articlesThisWeek,
    articles_this_month: articlesThisMonth,
    average_reading_time: averageReadingTime,
  };
}

export async function exportReadingHistory(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reading_history')
    .select(
      `
      *,
      post:posts(title, slug)
    `
    )
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false });

  if (error) throw error;

  // Generate CSV
  const headers = ['Title', 'URL', 'Progress', 'Time Spent (minutes)', 'Last Read', 'Completed'];
  const rows = (data || []).map((item) => [
    item.post?.title || '',
    `/articles/${item.post?.slug || ''}`,
    `${Math.round((item.progress || 0) * 100)}%`,
    Math.round((item.time_spent_seconds || 0) / 60).toString(),
    new Date(item.last_read_at).toLocaleDateString(),
    item.completed_at ? 'Yes' : 'No',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}
