/**
 * Continue Reading Component
 * Phase 3.3.3: Display unfinished articles
 */

'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { formatRelativeTime } from '@/lib/utils';

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

interface ContinueReadingItem {
  post_id: string;
  progress: number;
  last_read_at: string;
  time_spent_seconds: number;
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

const fetcher = async (url: string): Promise<ContinueReadingItem[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch continue reading');
  return res.json();
};

export function ContinueReading() {
  const { data, error, isLoading } = useSWR<ContinueReadingItem[]>(
    '/api/reading-history/continue?limit=5',
    fetcher
  );

  const items = useMemo(() => data || [], [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64" />
        ))}
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400 mb-2">No articles in progress</p>
        <Link href="/articles" className="text-blue-600 dark:text-blue-400 hover:underline">
          Browse articles →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Continue Reading</h2>
        <Link
          href="/dashboard/history"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {items.map((item) => {
          const progressPercent = Math.round(item.progress * 100);
          const minutesLeft = item.post.reading_time
            ? Math.ceil(item.post.reading_time * (1 - item.progress))
            : null;

          return (
            <Link
              key={item.post_id}
              href={`/articles/${item.post.slug}?continue=true`}
              className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {item.post.featured_image_url && (
                <div className="relative w-full h-32">
                  <Image
                    src={item.post.featured_image_url}
                    alt={item.post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 20vw"
                  />
                </div>
              )}

              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {item.post.title}
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{progressPercent}% read</span>
                    {minutesLeft !== null && <span>{minutesLeft} min left</span>}
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="text-xs text-gray-500">
                    {formatRelativeTime(item.last_read_at)}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {item.post.author && (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {item.post.author.display_name}
                    </span>
                  )}
                  <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
