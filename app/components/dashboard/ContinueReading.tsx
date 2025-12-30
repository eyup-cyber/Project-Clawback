/**
 * Continue Reading Component
 * Phase 1.1.2: Display unfinished articles with progress tracking
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { formatRelativeTime } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ContinueReadingItem {
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

interface ContinueReadingProps {
  limit?: number;
  showTitle?: boolean;
}

// ============================================================================
// ICONS
// ============================================================================

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// CIRCULAR PROGRESS
// ============================================================================

function CircularProgress({ progress, size = 48 }: { progress: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-blue-600 transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON LOADING
// ============================================================================

function ContinueReadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px] snap-start md:w-auto bg-white dark:bg-gray-800
                       rounded-xl overflow-hidden shadow-sm animate-pulse"
          >
            <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function ContinueReadingEmpty() {
  return (
    <div
      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800
                    dark:to-gray-900 rounded-2xl p-8 text-center"
    >
      <div className="text-5xl mb-4">📚</div>
      <h3 className="text-lg font-semibold mb-2">No articles in progress</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        Start reading an article and your progress will be saved automatically
      </p>
      <Link
        href="/articles"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                   rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
      >
        Browse articles
        <span>→</span>
      </Link>
    </div>
  );
}

// ============================================================================
// CONTINUE CARD
// ============================================================================

function ContinueCard({
  item,
  onMarkFinished,
  onRemove,
}: {
  item: ContinueReadingItem;
  onMarkFinished: () => void;
  onRemove: () => void;
}) {
  const _progressPercent = Math.round(item.progress * 100);
  const minutesLeft = item.post.reading_time
    ? Math.ceil(item.post.reading_time * (1 - item.progress))
    : null;

  return (
    <div
      className="flex-shrink-0 w-[280px] snap-start md:w-auto group relative bg-white
                     dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg
                     transition-all duration-200"
    >
      {/* Image with progress overlay */}
      <Link
        href={`/articles/${item.post.slug}?resume=${item.scroll_position || 0}`}
        className="block relative"
      >
        <div className="aspect-video relative overflow-hidden">
          {item.post.featured_image_url ? (
            <Image
              src={item.post.featured_image_url}
              alt={item.post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 280px, 20vw"
            />
          ) : (
            <div
              className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200
                            dark:from-gray-700 dark:to-gray-800 flex items-center justify-center"
            >
              <span className="text-4xl">📖</span>
            </div>
          )}

          {/* Play overlay */}
          <div
            className="absolute inset-0 bg-black/40 flex items-center justify-center
                          opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div
              className="w-12 h-12 rounded-full bg-white/90 flex items-center
                            justify-center text-blue-600"
            >
              <PlayIcon />
            </div>
          </div>

          {/* Time remaining badge */}
          {minutesLeft !== null && (
            <span
              className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium
                             bg-black/60 text-white rounded-full"
            >
              {minutesLeft} min left
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <Link href={`/articles/${item.post.slug}?resume=${item.scroll_position || 0}`}>
          <h3
            className="font-semibold mb-2 line-clamp-2 group-hover:text-blue-600
                         dark:group-hover:text-blue-400 transition-colors text-sm"
          >
            {item.post.title}
          </h3>
        </Link>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-3">
          <CircularProgress progress={item.progress} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-1">
              {formatRelativeTime(item.last_read_at)}
            </div>
            {item.post.author && (
              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {item.post.author.display_name}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/articles/${item.post.slug}?resume=${item.scroll_position || 0}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                       bg-blue-600 text-white rounded-lg hover:bg-blue-700
                       transition-colors text-xs font-medium"
          >
            <PlayIcon />
            Resume
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              onMarkFinished();
            }}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50
                       dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="Mark as finished"
          >
            <CheckIcon />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50
                       dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Remove from list"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const fetcher = async (url: string): Promise<ContinueReadingItem[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch continue reading');
  return res.json();
};

export function ContinueReading({ limit = 5, showTitle = true }: ContinueReadingProps) {
  const { data, error, isLoading, mutate } = useSWR<ContinueReadingItem[]>(
    `/api/reading-history/continue?limit=${limit}`,
    fetcher
  );

  const items = useMemo(() => data || [], [data]);

  const handleMarkFinished = useCallback(
    async (postId: string) => {
      try {
        await fetch(`/api/reading-history/${postId}/complete`, {
          method: 'POST',
        });
        void mutate();
      } catch (error) {
        console.error('Failed to mark as finished:', error);
      }
    },
    [mutate]
  );

  const handleRemove = useCallback(
    async (postId: string) => {
      try {
        await fetch(`/api/reading-history/${postId}`, {
          method: 'DELETE',
        });
        void mutate();
      } catch (error) {
        console.error('Failed to remove item:', error);
      }
    },
    [mutate]
  );

  if (isLoading) {
    return <ContinueReadingSkeleton />;
  }

  if (error || items.length === 0) {
    return <ContinueReadingEmpty />;
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Continue Reading</h2>
          <Link
            href="/dashboard/history"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            View all →
          </Link>
        </div>
      )}

      {/* Cards - horizontal scroll on mobile, grid on desktop */}
      <div
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4
                      md:grid md:grid-cols-5 md:overflow-visible md:pb-0 md:mx-0 md:px-0"
      >
        {items.map((item) => (
          <ContinueCard
            key={item.post_id}
            item={item}
            onMarkFinished={() => void handleMarkFinished(item.post_id)}
            onRemove={() => void handleRemove(item.post_id)}
          />
        ))}
      </div>
    </section>
  );
}
