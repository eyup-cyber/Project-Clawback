/**
 * Feed Card Component
 * Phase 1.1.1: Individual feed post card with actions, view modes
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { FeedPost } from '@/lib/hooks/useFeed';
import { formatRelativeTime } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface FeedCardProps {
  post: FeedPost;
  viewMode?: 'list' | 'grid';
  onBookmark?: (postId: string) => void;
  onNotInterested?: () => void;
  isBookmarked?: boolean;
}

// ============================================================================
// ICONS
// ============================================================================

const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const MoreIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// ============================================================================
// SHARE MENU
// ============================================================================

function ShareMenu({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const postUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/articles/${post.slug}`;

  const shareOptions = [
    {
      label: 'Copy link',
      icon: '🔗',
      action: () => {
        void navigator.clipboard.writeText(postUrl);
        onClose();
      },
    },
    {
      label: 'Twitter/X',
      icon: '𝕏',
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postUrl)}`,
          '_blank'
        );
        onClose();
      },
    },
    {
      label: 'Facebook',
      icon: '📘',
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
          '_blank'
        );
        onClose();
      },
    },
    {
      label: 'LinkedIn',
      icon: '💼',
      action: () => {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
          '_blank'
        );
        onClose();
      },
    },
  ];

  return (
    <div
      className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                    border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[160px]"
    >
      {shareOptions.map((option) => (
        <button
          key={option.label}
          onClick={option.action}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <span>{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MORE MENU
// ============================================================================

function MoreMenu({
  onNotInterested,
  onClose,
}: {
  onNotInterested?: () => void;
  onClose: () => void;
}) {
  const options = [
    ...(onNotInterested
      ? [
          {
            label: 'Not interested',
            icon: '🚫',
            action: () => {
              onNotInterested();
              onClose();
            },
          },
        ]
      : []),
    {
      label: 'Report',
      icon: '⚠️',
      action: () => {
        // Would open report modal
        onClose();
      },
    },
  ];

  return (
    <div
      className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                    border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[160px]"
    >
      {options.map((option) => (
        <button
          key={option.label}
          onClick={option.action}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <span>{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// GRID CARD
// ============================================================================

function GridCard({ post, onBookmark, onNotInterested, isBookmarked }: FeedCardProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleBookmark = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onBookmark?.(post.id);
    },
    [onBookmark, post.id]
  );

  return (
    <article
      className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden
                         shadow-sm hover:shadow-lg transition-all duration-200 transform
                         hover:-translate-y-1"
    >
      <Link href={`/articles/${post.slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden">
          {post.featured_image_url ? (
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div
              className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200
                            dark:from-gray-700 dark:to-gray-800 flex items-center justify-center"
            >
              <span className="text-4xl">📄</span>
            </div>
          )}

          {/* Category badge on image */}
          {post.category && (
            <span
              className="absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-full
                         bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
              style={{ color: post.category.color || undefined }}
            >
              {post.category.name}
            </span>
          )}

          {/* Reading time */}
          {post.reading_time && (
            <span
              className="absolute bottom-3 right-3 text-xs font-medium px-2 py-1
                             rounded-full bg-black/60 text-white"
            >
              {post.reading_time} min
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h2
            className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600
                         dark:group-hover:text-blue-400 transition-colors"
          >
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
              {post.excerpt}
            </p>
          )}

          {/* Author */}
          <div className="flex items-center gap-2 mb-3">
            {post.author.avatar_url ? (
              <Image
                src={post.author.avatar_url}
                alt={post.author.display_name}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex
                              items-center justify-center text-xs font-medium"
              >
                {post.author.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{post.author.display_name}</p>
              <p className="text-xs text-gray-500">{formatRelativeTime(post.published_at)}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>❤️ {formatCount(post.reaction_count)}</span>
            <span>💬 {formatCount(post.comment_count)}</span>
            <span>👁 {formatCount(post.view_count)}</span>
          </div>
        </div>
      </Link>

      {/* Action buttons - visible on hover */}
      <div
        className="absolute top-3 right-3 flex items-center gap-1 opacity-0
                      group-hover:opacity-100 transition-opacity"
      >
        <button
          onClick={handleBookmark}
          className="p-2 bg-white/90 dark:bg-gray-900/90 rounded-full shadow-sm
                     hover:bg-white dark:hover:bg-gray-900 transition-colors"
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <BookmarkIcon filled={isBookmarked} />
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowShareMenu(!showShareMenu);
              setShowMoreMenu(false);
            }}
            className="p-2 bg-white/90 dark:bg-gray-900/90 rounded-full shadow-sm
                       hover:bg-white dark:hover:bg-gray-900 transition-colors"
            aria-label="Share"
          >
            <ShareIcon />
          </button>
          {showShareMenu && <ShareMenu post={post} onClose={() => setShowShareMenu(false)} />}
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMoreMenu(!showMoreMenu);
              setShowShareMenu(false);
            }}
            className="p-2 bg-white/90 dark:bg-gray-900/90 rounded-full shadow-sm
                       hover:bg-white dark:hover:bg-gray-900 transition-colors"
            aria-label="More options"
          >
            <MoreIcon />
          </button>
          {showMoreMenu && (
            <MoreMenu onNotInterested={onNotInterested} onClose={() => setShowMoreMenu(false)} />
          )}
        </div>
      </div>
    </article>
  );
}

// ============================================================================
// LIST CARD
// ============================================================================

function ListCard({ post, onBookmark, onNotInterested, isBookmarked }: FeedCardProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleBookmark = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onBookmark?.(post.id);
    },
    [onBookmark, post.id]
  );

  return (
    <article
      className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden
                         shadow-sm hover:shadow-md transition-all duration-200"
    >
      <Link href={`/articles/${post.slug}`} className="block">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          {post.featured_image_url && (
            <div className="relative w-full sm:w-56 h-40 sm:h-auto flex-shrink-0 overflow-hidden">
              <Image
                src={post.featured_image_url}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 224px"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col min-w-0">
            {/* Category */}
            {post.category && (
              <Link
                href={`/categories/${post.category.slug}`}
                className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded
                           mb-2 w-fit hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: post.category.color ? `${post.category.color}15` : '#f3f4f6',
                  color: post.category.color || '#4b5563',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {post.category.name}
              </Link>
            )}

            {/* Title */}
            <h2
              className="font-bold text-lg sm:text-xl mb-2 line-clamp-2
                           group-hover:text-blue-600 dark:group-hover:text-blue-400
                           transition-colors"
            >
              {post.title}
            </h2>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2 sm:line-clamp-3">
                {post.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
              {/* Author */}
              <Link
                href={`/contributors/${post.author.username}`}
                className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-300"
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
                  <div
                    className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex
                                  items-center justify-center text-xs font-medium"
                  >
                    {post.author.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{post.author.display_name}</span>
              </Link>

              <span className="hidden sm:inline">•</span>
              <time dateTime={post.published_at}>{formatRelativeTime(post.published_at)}</time>

              {post.reading_time && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span>{post.reading_time} min read</span>
                </>
              )}
            </div>

            {/* Stats & Actions */}
            <div
              className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700
                            flex items-center justify-between"
            >
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <span>❤️</span>
                  {formatCount(post.reaction_count)}
                </span>
                <span className="flex items-center gap-1">
                  <span>💬</span>
                  {formatCount(post.comment_count)}
                </span>
                <span className="flex items-center gap-1 hidden sm:flex">
                  <span>👁</span>
                  {formatCount(post.view_count)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBookmark}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                             transition-colors text-gray-500 hover:text-gray-700
                             dark:hover:text-gray-300"
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  <BookmarkIcon filled={isBookmarked} />
                </button>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowShareMenu(!showShareMenu);
                      setShowMoreMenu(false);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                               transition-colors text-gray-500 hover:text-gray-700
                               dark:hover:text-gray-300"
                    aria-label="Share"
                  >
                    <ShareIcon />
                  </button>
                  {showShareMenu && (
                    <ShareMenu post={post} onClose={() => setShowShareMenu(false)} />
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMoreMenu(!showMoreMenu);
                      setShowShareMenu(false);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                               transition-colors text-gray-500 hover:text-gray-700
                               dark:hover:text-gray-300"
                    aria-label="More options"
                  >
                    <MoreIcon />
                  </button>
                  {showMoreMenu && (
                    <MoreMenu
                      onNotInterested={onNotInterested}
                      onClose={() => setShowMoreMenu(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function FeedCard({
  post,
  viewMode = 'list',
  onBookmark,
  onNotInterested,
  isBookmarked = false,
}: FeedCardProps) {
  if (viewMode === 'grid') {
    return (
      <GridCard
        post={post}
        onBookmark={onBookmark}
        onNotInterested={onNotInterested}
        isBookmarked={isBookmarked}
      />
    );
  }

  return (
    <ListCard
      post={post}
      onBookmark={onBookmark}
      onNotInterested={onNotInterested}
      isBookmarked={isBookmarked}
    />
  );
}
