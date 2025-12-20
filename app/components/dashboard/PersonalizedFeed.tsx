/**
 * Personalized Feed Component
 * Phase 3.2.3: Feed UI with infinite scroll
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';
import { FeedCard } from './FeedCard';

interface FeedPost {
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
  relevance_score?: number;
}

interface FeedResponse {
  posts: FeedPost[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

const fetcher = async (url: string): Promise<FeedResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch feed');
  return res.json();
};

interface PersonalizedFeedProps {
  category?: string;
  tag?: string;
  author?: string;
  excludeRead?: boolean;
}

export function PersonalizedFeed({
  category,
  tag,
  author,
  excludeRead = false,
}: PersonalizedFeedProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const getKey = useCallback(
    (pageIndex: number, previousPageData: FeedResponse | null) => {
      if (previousPageData && !previousPageData.hasMore) return null;

      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        limit: '20',
        ...(category && { category }),
        ...(tag && { tag }),
        ...(author && { author }),
        ...(excludeRead && { exclude_read: 'true' }),
      });

      return `/api/feed?${params.toString()}`;
    },
    [category, tag, author, excludeRead]
  );

  const { data, error, size, setSize, isLoading } = useSWRInfinite<FeedResponse>(getKey, fetcher, {
    revalidateFirstPage: false,
    revalidateAll: false,
  });

  const posts = data ? data.flatMap((page) => page.posts) : [];
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.posts?.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.hasMore === false);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isReachingEnd) {
          setSize((size) => size + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [isLoadingMore, isReachingEnd, setSize]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-600 mb-4">Failed to load feed</p>
        <button
          onClick={() => setSize(1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-600 mb-4">No posts found</p>
        <p className="text-sm text-gray-500">Try following more authors or categories</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}

      <div ref={observerTarget} className="h-4" />

      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {isReachingEnd && posts.length > 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">No more posts to load</div>
      )}
    </div>
  );
}
