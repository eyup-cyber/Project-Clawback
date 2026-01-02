// @ts-nocheck
/**
 * useFeed Hook
 * Phase 1.1.1: Feed state management with SWR
 */

'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import useSWRMutation from 'swr/mutation';

// ============================================================================
// TYPES
// ============================================================================

export interface FeedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  reading_time: number | null;
  published_at: string;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  } | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  relevance_score?: number;
}

export interface FeedResponse {
  posts: FeedPost[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface FeedFilters {
  category?: string;
  tag?: string;
  author?: string;
  excludeRead?: boolean;
}

export interface UseFeedOptions extends FeedFilters {
  limit?: number;
  enabled?: boolean;
}

export interface UseFeedReturn {
  posts: FeedPost[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isEmpty: boolean;
  isReachingEnd: boolean;
  error: Error | undefined;
  loadMore: () => void;
  refresh: () => Promise<void>;
  mutatePost: (postId: string, updates: Partial<FeedPost>) => void;
  markAsNotInterested: (postId: string) => Promise<void>;
  size: number;
  setSize: (size: number) => void;
}

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string): Promise<FeedResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('Failed to fetch feed');
    throw error;
  }
  return res.json();
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useFeed(options: UseFeedOptions = {}): UseFeedReturn {
  const { category, tag, author, excludeRead = false, limit = 20, enabled = true } = options;

  const scrollPositionRef = useRef<number>(0);

  // Build the key for SWR infinite
  const getKey = useCallback(
    (pageIndex: number, previousPageData: FeedResponse | null) => {
      // Return null if disabled
      if (!enabled) return null;

      // Return null if previous page has no more data
      if (previousPageData && !previousPageData.hasMore) return null;

      // Build query string
      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        limit: String(limit),
      });

      if (category) params.set('category', category);
      if (tag) params.set('tag', tag);
      if (author) params.set('author', author);
      if (excludeRead) params.set('exclude_read', 'true');

      return `/api/feed/personalized?${params.toString()}`;
    },
    [category, tag, author, excludeRead, limit, enabled]
  );

  // Use SWR Infinite for pagination
  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<FeedResponse>(getKey, fetcher, {
      revalidateFirstPage: false,
      revalidateAll: false,
      persistSize: true,
      parallel: false,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    });

  // Flatten posts from all pages
  const posts = useMemo(() => {
    if (!data) return [];
    return data.flatMap((page) => page.posts);
  }, [data]);

  // Loading states
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.posts?.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.hasMore === false);

  // Load more function
  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isReachingEnd) {
      void setSize(size + 1);
    }
  }, [isLoadingMore, isReachingEnd, setSize, size]);

  // Refresh function
  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Optimistic update for a single post
  const mutatePost = useCallback(
    (postId: string, updates: Partial<FeedPost>) => {
      void mutate(
        (currentData) => {
          if (!currentData) return currentData;

          return currentData.map((page) => ({
            ...page,
            posts: page.posts.map((post) => (post.id === postId ? { ...post, ...updates } : post)),
          }));
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  // Mark post as not interested
  const markAsNotInterested = useCallback(
    async (postId: string) => {
      // Optimistically remove from feed
      void mutate(
        (currentData) => {
          if (!currentData) return currentData;

          return currentData.map((page) => ({
            ...page,
            posts: page.posts.filter((post) => post.id !== postId),
          }));
        },
        { revalidate: false }
      );

      // Send to server
      try {
        await fetch('/api/feed/not-interested', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId }),
        });
      } catch (error) {
        // Revert on error
        await mutate();
      }
    },
    [mutate]
  );

  // Save scroll position on unmount
  useEffect(() => {
    const saveScrollPosition = () => {
      scrollPositionRef.current = window.scrollY;
      sessionStorage.setItem('feedScrollPosition', String(scrollPositionRef.current));
    };

    window.addEventListener('beforeunload', saveScrollPosition);

    // Restore scroll position on mount
    const savedPosition = sessionStorage.getItem('feedScrollPosition');
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition, 10));
      }, 100);
    }

    return () => {
      window.removeEventListener('beforeunload', saveScrollPosition);
      saveScrollPosition();
    };
  }, []);

  return {
    posts,
    isLoading: isLoading && !data,
    isLoadingMore: isLoadingMore || isValidating,
    isEmpty,
    isReachingEnd,
    error,
    loadMore,
    refresh,
    mutatePost,
    markAsNotInterested,
    size,
    setSize,
  };
}

// ============================================================================
// TRENDING FEED HOOK
// ============================================================================

export function useTrendingFeed(limit: number = 10) {
  const { data, error, isLoading, mutate } = useSWR<FeedPost[]>(
    `/api/feed/trending?limit=${limit}`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch trending');
      return res.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    posts: data || [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

// ============================================================================
// BOOKMARK MUTATION HOOK
// ============================================================================

async function toggleBookmark(url: string, { arg }: { arg: { postId: string } }) {
  const res = await fetch('/api/bookmarks/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId: arg.postId }),
  });
  if (!res.ok) throw new Error('Failed to toggle bookmark');
  return res.json();
}

export function useBookmarkMutation() {
  const { trigger, isMutating } = useSWRMutation('/api/bookmarks', toggleBookmark);

  return {
    toggleBookmark: (postId: string) => trigger({ postId }),
    isLoading: isMutating,
  };
}

// ============================================================================
// REACTION MUTATION HOOK
// ============================================================================

async function toggleReaction(
  url: string,
  { arg }: { arg: { postId: string; reactionType: string } }
) {
  const res = await fetch(`/api/posts/${arg.postId}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reactionType: arg.reactionType }),
  });
  if (!res.ok) throw new Error('Failed to toggle reaction');
  return res.json();
}

export function useReactionMutation() {
  const { trigger, isMutating } = useSWRMutation('/api/reactions', toggleReaction);

  return {
    toggleReaction: (postId: string, reactionType: string) => trigger({ postId, reactionType }),
    isLoading: isMutating,
  };
}

// ============================================================================
// NEW POSTS INDICATOR HOOK
// ============================================================================

export function useNewPostsIndicator(lastCheckTime: Date) {
  const { data } = useSWR<{ hasNew: boolean; count: number }>(
    `/api/feed/check-new?since=${lastCheckTime.toISOString()}`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to check new posts');
      return res.json();
    },
    {
      refreshInterval: 60000, // Check every minute
      revalidateOnFocus: true,
    }
  );

  return {
    hasNewPosts: data?.hasNew || false,
    newPostsCount: data?.count || 0,
  };
}
