/**
 * Following Page Client Component
 */

'use client';

import useSWR from 'swr';
import Tabs from '@/app/components/dashboard/shared/Tabs';
import { FollowedAuthors } from '@/app/components/following/FollowedAuthors';
import { FollowedCategories } from '@/app/components/following/FollowedCategories';
import { FollowedTags } from '@/app/components/following/FollowedTags';
import { SuggestedFollows } from '@/app/components/following/SuggestedFollows';

const authorsFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function FollowingPageClient() {
  const { data: authors } = useSWR('/api/follows/users', authorsFetcher);
  const { data: categories } = useSWR('/api/follows/categories', authorsFetcher);
  const { data: tags } = useSWR('/api/follows/tags', authorsFetcher);
  const { data: suggestions } = useSWR(
    '/api/follows/suggestions?type=user&limit=10',
    authorsFetcher
  );

  const tabs = [
    { id: 'authors', label: 'Authors' },
    { id: 'categories', label: 'Categories' },
    { id: 'tags', label: 'Tags' },
    { id: 'discover', label: 'Discover' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Following</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage who and what you follow</p>
      </div>

      <Tabs tabs={tabs} defaultTab="authors">
        {(activeTab) => (
          <>
            {activeTab === 'authors' && <FollowedAuthors authors={authors || []} />}
            {activeTab === 'categories' && <FollowedCategories categories={categories || []} />}
            {activeTab === 'tags' && <FollowedTags tags={tags || []} />}
            {activeTab === 'discover' && <SuggestedFollows suggestions={suggestions || []} />}
          </>
        )}
      </Tabs>
    </div>
  );
}
