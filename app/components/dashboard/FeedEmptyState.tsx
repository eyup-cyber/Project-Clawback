/**
 * Feed Empty State Component
 * Phase 1.1.1: Empty state for personalized feed
 */

'use client';

import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface FeedEmptyStateProps {
  title?: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FeedEmptyState({
  title = 'Your feed is empty',
  description = 'Start following authors, categories, and tags to personalize your feed',
  icon = '📰',
  actionLabel = 'Find people to follow',
  actionHref = '/dashboard/following',
  secondaryActionLabel = 'Browse all articles',
  secondaryActionHref = '/articles',
}: FeedEmptyStateProps) {
  return (
    <div
      className="text-center py-16 px-4 bg-gradient-to-b from-gray-50 to-white
                    dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100
                    dark:border-gray-700"
    >
      {/* Illustration */}
      <div className="mb-6">
        <div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full
                        bg-blue-50 dark:bg-blue-900/30 text-6xl animate-pulse"
        >
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600
                     text-white font-medium rounded-xl hover:bg-blue-700 transition-colors
                     shadow-sm hover:shadow-md"
        >
          {actionLabel}
        </Link>
        <Link
          href={secondaryActionHref}
          className="inline-flex items-center justify-center px-6 py-3 border
                     border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                     font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800
                     transition-colors"
        >
          {secondaryActionLabel}
        </Link>
      </div>

      {/* Decorative elements */}
      <div className="mt-12 flex justify-center gap-4 opacity-50">
        <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  );
}
