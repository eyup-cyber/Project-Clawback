/**
 * Feed Empty State Component
 * Phase 3.2.3: Empty state for personalized feed
 */

'use client';

import Link from 'next/link';

export function FeedEmptyState() {
  return (
    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-6xl mb-4">📰</div>
      <h3 className="text-xl font-bold mb-2">Your feed is empty</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        Start following authors, categories, and tags to personalize your feed
      </p>
      <div className="flex justify-center space-x-4">
        <Link
          href="/dashboard/following"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Find people to follow
        </Link>
        <Link
          href="/articles"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          Browse all articles
        </Link>
      </div>
    </div>
  );
}
