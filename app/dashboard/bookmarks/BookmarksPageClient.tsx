/**
 * Bookmarks Page Client Component
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { BookmarksGrid } from '@/app/components/bookmarks/BookmarksGrid';
import { BookmarksSidebar } from '@/app/components/bookmarks/BookmarksSidebar';

interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  bookmark_count: number;
}

const foldersFetcher = async (url: string): Promise<BookmarkFolder[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch folders');
  const data = await res.json();
  return data;
};

export function BookmarksPageClient() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: folders, mutate: mutateFolders } = useSWR<BookmarkFolder[]>(
    '/api/bookmarks/folders',
    foldersFetcher
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <BookmarksSidebar
          folders={folders || []}
          selectedFolderId={selectedFolderId}
          onFolderSelect={setSelectedFolderId}
          onFoldersChange={mutateFolders}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Bookmarks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {folders?.reduce((sum, f) => sum + f.bookmark_count, 0) || 0} saved articles
          </p>
        </div>

        <div className="mb-4">
          <input
            type="search"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <BookmarksGrid folderId={selectedFolderId} search={searchQuery} />
      </main>
    </div>
  );
}
