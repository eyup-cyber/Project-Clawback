/**
 * History Timeline Component
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatRelativeTime } from '@/lib/utils';

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
}

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

export function HistoryTimeline({ items, hasMore, onLoadMore }: HistoryTimelineProps) {
  const grouped = groupByDate(items);
  const dates = Array.from(grouped.keys());

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  return (
    <div className="space-y-8">
      {dates.map((date) => (
        <div key={date}>
          <h2 className="text-lg font-semibold mb-4">{date}</h2>

          <div className="space-y-4">
            {grouped.get(date)?.map((item) => (
              <Link
                key={item.id}
                href={`/articles/${item.post.slug}`}
                className="group flex items-center space-x-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
              >
                {item.post.featured_image_url && (
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image
                      src={item.post.featured_image_url}
                      alt={item.post.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.post.title}
                  </h3>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    {item.post.author && <span>{item.post.author.display_name}</span>}
                    <span>•</span>
                    <span>{formatRelativeTime(item.last_read_at)}</span>
                    <span>•</span>
                    <span>{formatTime(item.time_spent_seconds)}</span>
                    {item.completed_at && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400">Completed</span>
                      </>
                    )}
                  </div>

                  {!item.completed_at && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.round(item.progress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
