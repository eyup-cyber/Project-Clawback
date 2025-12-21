'use client';

/**
 * Media Library UI Component
 * Phase 43: Visual media browser with folders, grid/list views, search
 */

import { useCallback, useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { MediaItem, MediaFolder, MediaType } from '@/lib/media/library';

// ============================================================================
// TYPES
// ============================================================================

export interface MediaLibraryProps {
  onSelect?: (items: MediaItem[]) => void;
  onClose?: () => void;
  allowMultiple?: boolean;
  allowedTypes?: MediaType[];
  maxSize?: number;
  initialFolder?: string | null;
  showUpload?: boolean;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'created_at' | 'filename' | 'size';

// ============================================================================
// ICONS
// ============================================================================

const FolderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
  </svg>
);

const GridIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z" />
  </svg>
);

const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const ImageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
  </svg>
);

const VideoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
  </svg>
);

const AudioIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);

const DocumentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getMediaIcon(type: MediaType) {
  switch (type) {
    case 'image':
      return <ImageIcon />;
    case 'video':
      return <VideoIcon />;
    case 'audio':
      return <AudioIcon />;
    case 'document':
      return <DocumentIcon />;
    default:
      return <DocumentIcon />;
  }
}

// ============================================================================
// FOLDER ITEM
// ============================================================================

interface FolderItemProps {
  folder: MediaFolder;
  onClick: () => void;
  isSelected?: boolean;
}

function FolderItem({ folder, onClick, isSelected }: FolderItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div
        className="w-10 h-10 rounded flex items-center justify-center text-white"
        style={{ backgroundColor: folder.color || '#3b82f6' }}
      >
        <FolderIcon />
      </div>
      <div className="ml-3 text-left">
        <p className="font-medium text-gray-900 dark:text-white">{folder.name}</p>
        <p className="text-sm text-gray-500">{folder.item_count} items</p>
      </div>
    </button>
  );
}

// ============================================================================
// MEDIA ITEM GRID
// ============================================================================

interface MediaGridItemProps {
  item: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

function MediaGridItem({ item, isSelected, onSelect, onDoubleClick }: MediaGridItemProps) {
  return (
    <button
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`relative aspect-square rounded-lg border overflow-hidden transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {item.type === 'image' && item.thumbnail_url ? (
        <img
          src={item.thumbnail_url}
          alt={item.alt_text || item.filename}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
          {getMediaIcon(item.type)}
          <span className="text-xs mt-2 px-2 truncate max-w-full">{item.filename}</span>
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">
          <CheckIcon />
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{item.filename}</p>
        <p className="text-white/70 text-xs">{formatFileSize(item.size)}</p>
      </div>
    </button>
  );
}

// ============================================================================
// MEDIA ITEM LIST
// ============================================================================

interface MediaListItemProps {
  item: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

function MediaListItem({ item, isSelected, onSelect, onDoubleClick }: MediaListItemProps) {
  return (
    <button
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`w-full flex items-center p-3 border-b transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
          isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {isSelected && <CheckIcon />}
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
        {item.type === 'image' && item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.alt_text || item.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {getMediaIcon(item.type)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="ml-3 flex-1 min-w-0 text-left">
        <p className="font-medium text-gray-900 dark:text-white truncate">{item.filename}</p>
        <p className="text-sm text-gray-500">
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {formatFileSize(item.size)}
          {item.width && item.height && ` • ${item.width}×${item.height}`}
        </p>
      </div>

      {/* Date */}
      <div className="ml-4 text-sm text-gray-500">
        {new Date(item.created_at).toLocaleDateString()}
      </div>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MediaLibrary({
  onSelect,
  onClose,
  allowMultiple = false,
  allowedTypes,
  maxSize,
  initialFolder = null,
  showUpload = true,
  className = '',
}: MediaLibraryProps) {
  // State
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentFolder, setCurrentFolder] = useState<string | null>(initialFolder);
  const [folderPath, setFolderPath] = useState<MediaFolder[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be API calls
      const params = new URLSearchParams();
      if (currentFolder !== null) {
        params.set('folder_id', currentFolder);
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (allowedTypes) {
        params.set('types', allowedTypes.join(','));
      }
      params.set('sort_by', sortBy);

      const [itemsRes, foldersRes] = await Promise.all([
        fetch(`/api/media/items?${params}`),
        fetch(`/api/media/folders${currentFolder ? `?parent_id=${currentFolder}` : ''}`),
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.items || []);
        setTotalItems(data.total || 0);
      }

      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, searchQuery, sortBy, allowedTypes]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Selection handlers
  const handleSelectItem = useCallback(
    (itemId: string) => {
      setSelectedItems((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          if (!allowMultiple) {
            next.clear();
          }
          next.add(itemId);
        }
        return next;
      });
    },
    [allowMultiple]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.id)));
    }
  }, [items, selectedItems.size]);

  // Navigation
  const navigateToFolder = useCallback((folder: MediaFolder | null) => {
    if (folder) {
      setCurrentFolder(folder.id);
      setFolderPath((prev) => [...prev, folder]);
    } else {
      setCurrentFolder(null);
      setFolderPath([]);
    }
    setSelectedItems(new Set());
  }, []);

  const _navigateUp = useCallback(() => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
      setSelectedItems(new Set());
    }
  }, [folderPath]);

  // Confirm selection
  const handleConfirm = useCallback(() => {
    const selected = items.filter((item) => selectedItems.has(item.id));

    // Validate max size
    if (maxSize) {
      const oversized = selected.filter((item) => item.size > maxSize);
      if (oversized.length > 0) {
        alert(`Some files exceed the maximum size of ${formatFileSize(maxSize)}`);
        return;
      }
    }

    onSelect?.(selected);
    onClose?.();
  }, [items, selectedItems, maxSize, onSelect, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'Enter' && selectedItems.size > 0) {
        handleConfirm();
      } else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSelectAll();
      }
    },
    [onClose, selectedItems.size, handleConfirm, handleSelectAll]
  );

  return (
    <div
      className={`flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Media Library</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => navigateToFolder(null)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            All Files
          </button>
          {folderPath.map((folder, index) => (
            <span key={folder.id} className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              <button
                onClick={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  setFolderPath(newPath);
                  setCurrentFolder(folder.id);
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {folder.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="created_at">Date</option>
            <option value="filename">Name</option>
            <option value="size">Size</option>
          </select>

          {/* View toggle */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            {/* Folders */}
            {folders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Folders</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {folders.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      onClick={() => navigateToFolder(folder)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Media Items */}
            {items.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">
                    Files ({totalItems})
                  </h3>
                  {allowMultiple && (
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {items.map((item) => (
                      <MediaGridItem
                        key={item.id}
                        item={item}
                        isSelected={selectedItems.has(item.id)}
                        onSelect={() => handleSelectItem(item.id)}
                        onDoubleClick={() => {
                          setSelectedItems(new Set([item.id]));
                          handleConfirm();
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {items.map((item) => (
                      <MediaListItem
                        key={item.id}
                        item={item}
                        isSelected={selectedItems.has(item.id)}
                        onSelect={() => handleSelectItem(item.id)}
                        onDoubleClick={() => {
                          setSelectedItems(new Set([item.id]));
                          handleConfirm();
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ImageIcon />
                <p className="mt-2">No files found</p>
                {showUpload && (
                  <button className="mt-4 flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <UploadIcon />
                    <span className="ml-2">Upload Files</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="text-sm text-gray-500">
          {selectedItems.size > 0
            ? `${selectedItems.size} item${selectedItems.size !== 1 ? 's' : ''} selected`
            : 'No items selected'}
        </div>
        <div className="flex items-center space-x-3">
          {showUpload && (
            <button className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <UploadIcon />
              <span className="ml-2">Upload</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedItems.size === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select {selectedItems.size > 0 && `(${selectedItems.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
