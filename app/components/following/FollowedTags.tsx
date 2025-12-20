/**
 * Followed Tags Component
 */

'use client';

import Link from 'next/link';
import { FollowButton } from '@/app/components/dashboard/FollowButton';
import EmptyState from '@/app/components/dashboard/shared/EmptyState';

interface Tag {
  id: string;
  name: string;
  slug: string;
  post_count: number;
}

interface FollowedTagsProps {
  tags: Tag[];
}

export function FollowedTags({ tags }: FollowedTagsProps) {
  if (tags.length === 0) {
    return (
      <EmptyState
        title="Not following any tags yet"
        description="Follow tags to discover related content"
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="flex items-center space-x-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm px-4 py-3"
        >
          <Link
            href={`/tags/${tag.slug}`}
            className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            #{tag.name}
          </Link>

          <span className="text-sm text-gray-500">{tag.post_count} posts</span>

          <FollowButton type="tag" id={tag.id} initialFollowing={true} className="ml-2" />
        </div>
      ))}
    </div>
  );
}
