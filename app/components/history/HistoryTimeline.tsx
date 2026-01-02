/**
 * History Timeline Component
 * Phase 1.1.4: Timeline view grouped by date with actions
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface HistoryItem {
  id: string;
  post_id: string;
  progress: number;
  time_spent_seconds: number;
  last_read_at: string;
  completed_at: string | null;
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

interface HistoryTimelineProps {
  items: HistoryItem[];
  hasMore: boolean;
  onLoadMore: () => void;
  onRemoveItem?: (itemId: string) => void;
}

// ============================================================================
// ICONS
// ============================================================================

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
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

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
      clipRule="evenodd"
    />
  </svg>
);

// ============================================================================
// HELPERS
// ============================================================================

function groupByDate(items: HistoryItem[]): Map<string, HistoryItem[]> {
  const groups = new Map<string, HistoryItem[]>();

  items.forEach((item) => {
    const date = new Date(item.last_read_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(item);
  });

  return groups;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (itemDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// HISTORY ITEM CARD
// ============================================================================

function HistoryItemCard({ item, onRemove }: { item: HistoryItem; onRemove?: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const progressPercent = Math.round(item.progress * 100);

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm
                 hover:shadow-md transition-all overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/articles/${item.post.slug}`} className="flex items-center gap-4 p-4">
        {/* Thumbnail */}
        {item.post.featured_image_url ? (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden">
            <Image
              src={item.post.featured_image_url}
              alt={item.post.title}
              fill
              className="object-cover"
              sizes="96px"
            />
            {/* Progress overlay */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-200/80">
              <div className="h-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        ) : (
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg bg-gray-100
                          dark:bg-gray-700 flex items-center justify-center text-2xl"
          >
            📄
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2
                         group-hover:text-blue-600 dark:group-hover:text-blue-400
                         transition-colors"
          >
            {item.post.title}
          </h3>

          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm
                          text-gray-500 dark:text-gray-400"
          >
            {item.post.author && (
              <span className="font-medium">{item.post.author.display_name}</span>
            )}
            <span>{formatRelativeTime(item.last_read_at)}</span>
            <span>{formatTime(item.time_spent_seconds)} reading</span>
          </div>

          {/* Status */}
          <div className="mt-2 flex items-center gap-3">
            {item.completed_at ? (
              <span
                className="inline-flex items-center gap-1 text-sm text-green-600
                               dark:text-green-400 font-medium"
              >
                <CheckCircleIcon />
                Completed
              </span>
            ) : (
              <>
                <div
                  className="flex-1 max-w-[200px] bg-gray-200 dark:bg-gray-700
                                rounded-full h-1.5"
                >
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500">{progressPercent}%</span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Remove button */}
      {onRemove && isHovered && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-3 right-3 p-1.5 bg-gray-100 dark:bg-gray-700
                     rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50
                     dark:hover:bg-red-900/20 transition-colors"
          title="Remove from history"
          aria-label="Remove from history"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HistoryTimeline({
  items,
  hasMore,
  onLoadMore,
  onRemoveItem,
}: HistoryTimelineProps) {
  const grouped = groupByDate(items);
  const dates = Array.from(grouped.keys());

  return (
    <div className="space-y-8">
      {dates.map((date) => (
        <section key={date}>
          {/* Date header */}
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getRelativeDate(grouped.get(date)![0].last_read_at)}
            </h2>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-500">
              {grouped.get(date)!.length} {grouped.get(date)!.length === 1 ? 'article' : 'articles'}
            </span>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {grouped.get(date)?.map((item) => (
              <HistoryItemCard
                key={item.id}
                item={item}
                onRemove={onRemoveItem ? () => void onRemoveItem(item.id) : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Load more */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl
                       hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
