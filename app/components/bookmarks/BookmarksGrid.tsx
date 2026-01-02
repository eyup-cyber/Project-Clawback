/**
 * Bookmarks Grid Component
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import EmptyState from '@/app/components/dashboard/shared/EmptyState';
import { formatRelativeTime } from '@/lib/utils';

interface Bookmark {
  id: string;
  post_id: string;
  folder_id: string | null;
  note: string | null;
  created_at: string;
  post: {
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

interface BookmarksResponse {
  bookmarks: Bookmark[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

const bookmarksFetcher = async (url: string): Promise<BookmarksResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch bookmarks');
  return res.json();
};

interface BookmarksGridProps {
  folderId?: string | null;
  search?: string;
}

export function BookmarksGrid({ folderId, search }: BookmarksGridProps) {
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    limit: '20',
    ...(folderId && { folder_id: folderId }),
    ...(search && { search }),
  });

  const { data, error, isLoading } = useSWR<BookmarksResponse>(
    `/api/bookmarks?${params.toString()}`,
    bookmarksFetcher
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState title="Failed to load bookmarks" description="Please try refreshing the page" />
    );
  }

  if (!data || data.bookmarks.length === 0) {
    return (
      <EmptyState
        title="No bookmarks yet"
        description="Start bookmarking articles to save them for later"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.bookmarks.map((bookmark) => (
          <Link
            key={bookmark.id}
            href={`/articles/${bookmark.post.slug}`}
            className="group block bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            {bookmark.post.featured_image_url && (
              <div className="relative w-full h-48">
                <Image
                  src={bookmark.post.featured_image_url}
                  alt={bookmark.post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            )}

            <div className="p-4">
              {bookmark.post.category && (
                <span
                  className="inline-block text-xs font-medium px-2 py-1 rounded mb-2"
                  style={{
                    backgroundColor: bookmark.post.category.color
                      ? `${bookmark.post.category.color}20`
                      : undefined,
                    color: bookmark.post.category.color || undefined,
                  }}
                >
                  {bookmark.post.category.name}
                </span>
              )}

              <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {bookmark.post.title}
              </h3>

              {bookmark.post.excerpt && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {bookmark.post.excerpt}
                </p>
              )}

              {bookmark.note && (
                <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
                  {bookmark.note}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  {bookmark.post.author?.avatar_url ? (
                    <Image
                      src={bookmark.post.author.avatar_url}
                      alt={bookmark.post.author.display_name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs">
                      {bookmark.post.author?.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{bookmark.post.author?.display_name}</span>
                </div>

                <time dateTime={bookmark.created_at}>
                  {formatRelativeTime(bookmark.created_at)}
                </time>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {data.hasMore && (
        <div className="text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
