/**
 * Bookmarks Sidebar Component
 */

'use client';

import { useState } from 'react';
import { BookmarksFolderDialog } from './BookmarksFolderDialog';

interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  bookmark_count: number;
}

interface BookmarksSidebarProps {
  folders: BookmarkFolder[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFoldersChange: () => void;
}

export function BookmarksSidebar({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFoldersChange,
}: BookmarksSidebarProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Folders</h2>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          + New
        </button>
      </div>

      <nav className="space-y-1">
        <button
          onClick={() => onFolderSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedFolderId === null
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          All Bookmarks
        </button>

        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderSelect(folder.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
              selectedFolderId === folder.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <span>{folder.name}</span>
            <span className="text-xs text-gray-500">{folder.bookmark_count}</span>
          </button>
        ))}
      </nav>

      {isCreateDialogOpen && (
        <BookmarksFolderDialog
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={() => {
            setIsCreateDialogOpen(false);
            onFoldersChange();
          }}
        />
      )}
    </div>
  );
}
