/**
 * Suggested Follows Component
 */

'use client';

import { FollowButton } from '@/app/components/dashboard/FollowButton';

interface SuggestedFollow {
  id: string;
  name: string;
  follower_count: number;
  type: 'user' | 'category' | 'tag';
}

interface SuggestedFollowsProps {
  suggestions: SuggestedFollow[];
}

export function SuggestedFollows({ suggestions }: SuggestedFollowsProps) {
  if (suggestions.length === 0) {
    return <div className="text-center py-12 text-gray-500">No suggestions available</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Suggested for You</h2>
        <p className="text-gray-600 dark:text-gray-400">Based on your reading activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
          >
            <div>
              <div className="font-medium">{suggestion.name}</div>
              <div className="text-sm text-gray-500">
                {suggestion.follower_count} {suggestion.type === 'user' ? 'followers' : 'posts'}
              </div>
            </div>

            <FollowButton type={suggestion.type} id={suggestion.id} initialFollowing={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
