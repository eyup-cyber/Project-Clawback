/**
 * Feed Card Component
 * Phase 3.2.3: Individual feed post card
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatRelativeTime } from '@/lib/utils';

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
}

interface FeedCardProps {
  post: FeedPost;
  onBookmark?: (postId: string) => void;
  isBookmarked?: boolean;
}

const BookmarkIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export function FeedCard({ post, onBookmark, isBookmarked = false }: FeedCardProps) {
  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.(post.id);
  };

  return (
    <article className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <Link href={`/articles/${post.slug}`} className="block">
        <div className="flex flex-col md:flex-row">
          {post.featured_image_url && (
            <div className="relative w-full md:w-64 h-48 md:h-auto flex-shrink-0">
              <Image
                src={post.featured_image_url}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 256px"
              />
            </div>
          )}

          <div className="flex-1 p-6 flex flex-col">
            {post.category && (
              <Link
                href={`/categories/${post.category.slug}`}
                className="inline-flex items-center text-xs font-medium px-2 py-1 rounded mb-3 w-fit"
                style={{
                  backgroundColor: post.category.color ? `${post.category.color}20` : undefined,
                  color: post.category.color || undefined,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {post.category.name}
              </Link>
            )}

            <h2 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {post.title}
            </h2>

            {post.excerpt && (
              <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{post.excerpt}</p>
            )}

            <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <Link
                  href={`/contributors/${post.author.username}`}
                  className="flex items-center space-x-2 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.author.avatar_url ? (
                    <Image
                      src={post.author.avatar_url}
                      alt={post.author.display_name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs">
                      {post.author.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{post.author.display_name}</span>
                </Link>

                <span>•</span>
                <time dateTime={post.published_at}>{formatRelativeTime(post.published_at)}</time>

                {post.reading_time && (
                  <>
                    <span>•</span>
                    <span>{post.reading_time} min read</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <span>{post.view_count} views</span>
                <span>{post.reaction_count} reactions</span>
                <span>{post.comment_count} comments</span>

                <button
                  onClick={handleBookmark}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  <BookmarkIcon className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
