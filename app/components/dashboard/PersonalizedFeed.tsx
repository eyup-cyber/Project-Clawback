/**
 * Personalized Feed Component
 * Phase 1.1.1: Feed UI with infinite scroll, new posts indicator, view modes
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type FeedPost, useFeed, useNewPostsIndicator } from '@/lib/hooks/useFeed';
import { FeedCard } from './FeedCard';
import { FeedControls } from './FeedControls';
import { FeedEmptyState } from './FeedEmptyState';

// ============================================================================
// TYPES
// ============================================================================

interface PersonalizedFeedProps {
  category?: string;
  tag?: string;
  author?: string;
  excludeRead?: boolean;
  initialViewMode?: 'list' | 'grid';
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function FeedSkeleton({ viewMode }: { viewMode: 'list' | 'grid' }) {
  const items = Array.from({ length: 3 });

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((_, i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
            <div className="aspect-video bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="flex items-center gap-2 pt-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
          <div className="flex gap-4">
            <div className="w-48 h-32 bg-gray-200 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// NEW POSTS BANNER
// ============================================================================

function NewPostsBanner({
  count,
  onRefresh,
  isRefreshing,
}: {
  count: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="w-full py-3 px-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-600
                 font-medium text-sm hover:bg-blue-100 transition-colors flex items-center
                 justify-center gap-2 disabled:opacity-50"
    >
      {isRefreshing ? (
        <>
          <span className="animate-spin">↻</span>
          Loading...
        </>
      ) : (
        <>
          <span>↑</span>
          {count} new {count === 1 ? 'post' : 'posts'} available
        </>
      )}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PersonalizedFeed({
  category,
  tag,
  author,
  excludeRead: initialExcludeRead = false,
  initialViewMode = 'list',
}: PersonalizedFeedProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [excludeRead, setExcludeRead] = useState(initialExcludeRead);
  const [lastRefreshTime] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize view mode from localStorage (avoid setState in effect)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list';
    const savedMode = localStorage.getItem('feedViewMode');
    return savedMode === 'list' || savedMode === 'grid' ? savedMode : 'list';
  });

  // Save view mode to localStorage
  const handleViewModeChange = useCallback((mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('feedViewMode', mode);
  }, []);

  // Use the feed hook
  const {
    posts,
    isLoading,
    isLoadingMore,
    isEmpty,
    isReachingEnd,
    error,
    loadMore,
    refresh,
    markAsNotInterested,
  } = useFeed({
    category,
    tag,
    author,
    excludeRead,
    limit: 20,
  });

  // Check for new posts
  const { hasNewPosts, newPostsCount } = useNewPostsIndicator(lastRefreshTime);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
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
  }, [loadMore]);

  // Handle not interested
  const handleNotInterested = useCallback(
    async (postId: string) => {
      await markAsNotInterested(postId);
    },
    [markAsNotInterested]
  );

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <p className="text-red-600 font-medium mb-2">Failed to load your feed</p>
        <p className="text-gray-500 text-sm mb-4 text-center">
          There was a problem loading your personalized content.
        </p>
        <button
          onClick={() => void handleRefresh()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <FeedControls
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          excludeRead={excludeRead}
          onExcludeReadChange={setExcludeRead}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <FeedSkeleton viewMode={viewMode} />
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="space-y-6">
        <FeedControls
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          excludeRead={excludeRead}
          onExcludeReadChange={setExcludeRead}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <FeedEmptyState
          title="No posts in your feed"
          description="Start following authors, categories, or tags to see personalized content here."
          actionLabel="Discover Content"
          actionHref="/discover"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <FeedControls
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        excludeRead={excludeRead}
        onExcludeReadChange={setExcludeRead}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* New posts banner */}
      {hasNewPosts && (
        <NewPostsBanner
          count={newPostsCount}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Feed content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              viewMode="grid"
              onNotInterested={() => void handleNotInterested(post.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              viewMode="list"
              onNotInterested={() => void handleNotInterested(post.id)}
            />
          ))}
        </div>
      )}

      {/* Load more trigger */}
      <div ref={observerTarget} className="h-4" />

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm">Loading more posts...</span>
          </div>
        </div>
      )}

      {/* End of feed */}
      {isReachingEnd && posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm mb-2">You&apos;ve reached the end!</p>
          <button
            onClick={() => void handleRefresh()}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Refresh feed
          </button>
        </div>
      )}
    </div>
  );
}
