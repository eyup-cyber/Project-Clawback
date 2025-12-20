/**
 * Bookmark Folder Dialog Component
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/primitives';

interface BookmarksFolderDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BookmarksFolderDialog({ onClose, onSuccess }: BookmarksFolderDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/bookmarks/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });

      if (!res.ok) throw new Error('Failed to create folder');

      onSuccess();
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Create Folder</DialogTitle>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 mt-4">
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium mb-1">
              Folder Name
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              placeholder="e.g. Research, Favorites"
            />
          </div>

          <div>
            <label htmlFor="folder-color" className="block text-sm font-medium mb-1">
              Color
            </label>
            <input
              id="folder-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
