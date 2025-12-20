/**
 * Followed Authors Component
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FollowButton } from '@/app/components/dashboard/FollowButton';
import EmptyState from '@/app/components/dashboard/shared/EmptyState';

interface Author {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  article_count: number;
}

interface FollowedAuthorsProps {
  authors: Author[];
}

export function FollowedAuthors({ authors }: FollowedAuthorsProps) {
  if (authors.length === 0) {
    return (
      <EmptyState
        title="Not following any authors yet"
        description="Discover and follow authors whose work you enjoy"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {authors.map((author) => (
        <div key={author.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-start space-x-4">
            {author.avatar_url ? (
              <Image
                src={author.avatar_url}
                alt={author.display_name}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-2xl font-bold">
                {author.display_name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <Link
                href={`/contributors/${author.username}`}
                className="block font-semibold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {author.display_name}
              </Link>

              {author.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {author.bio}
                </p>
              )}

              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                <span>{author.article_count} articles</span>
                <span>{author.follower_count} followers</span>
              </div>

              <div className="mt-4">
                <FollowButton type="user" id={author.id} initialFollowing={true} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
