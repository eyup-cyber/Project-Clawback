'use client';

/**
 * Media Library Modal Component
 * Phase 4.4: Browse, search, select, insert
 */

import { useCallback, useEffect, useState } from 'react';
import type { MediaItem } from './MediaPreview';
import { UploadZone } from './UploadZone';

// ============================================================================
// TYPES
// ============================================================================

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem | MediaItem[]) => void;
  multiple?: boolean;
  accept?: string[];
  title?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'oldest' | 'name' | 'size' | 'type';

interface Filters {
  type: string | null;
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  accept,
  title = 'Media Library',
}: MediaLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filters, setFilters] = useState<Filters>({
    type: null,
    search: '',
    dateFrom: null,
    dateTo: null,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch media
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        sort: sortBy,
        ...(filters.type && { type: filters.type }),
        ...(filters.search && { search: filters.search }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      });

      const response = await fetch(`/api/media?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMedia(data.items);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, filters]);

  useEffect(() => {
    if (isOpen) {
      void fetchMedia();
    }
  }, [isOpen, fetchMedia]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelected(new Set());
      setActiveTab('library');
    }
  }, [isOpen]);

  // Selection handlers
  const handleSelect = (item: MediaItem) => {
    if (multiple) {
      setSelected((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    } else {
      setSelected(new Set([item.id]));
    }
  };

  const handleInsert = () => {
    const selectedMedia = media.filter((m) => selected.has(m.id));
    if (selectedMedia.length > 0) {
      onSelect(multiple ? selectedMedia : selectedMedia[0]);
      onClose();
    }
  };

  const handleUploadComplete = (file: { url?: string; thumbnailUrl?: string; name?: string }) => {
    if (file.url) {
      // Refresh the library
      void fetchMedia();
      // Switch to library tab
      setActiveTab('library');
    }
  };

  // Filter by type
  const typeOptions = [
    { value: null, label: 'All Types' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
    { value: 'document', label: 'Documents' },
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={activeTab === 'library' ? 'active' : ''}
            onClick={() => setActiveTab('library')}
          >
            📚 Media Library
          </button>
          <button
            className={activeTab === 'upload' ? 'active' : ''}
            onClick={() => setActiveTab('upload')}
          >
            📤 Upload New
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {activeTab === 'library' ? (
            <>
              {/* Toolbar */}
              <div className="toolbar">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search media..."
                    value={filters.search}
                    onChange={(e) => {
                      setFilters({ ...filters, search: e.target.value });
                      setPage(1);
                    }}
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters({ ...filters, search: '' })}
                      className="clear-search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={filters.type || ''}
                  onChange={(e) => {
                    setFilters({ ...filters, type: e.target.value || null });
                    setPage(1);
                  }}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value || ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="size">Size (Largest)</option>
                </select>

                <div className="view-toggle">
                  <button
                    className={viewMode === 'grid' ? 'active' : ''}
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                  >
                    ⊞
                  </button>
                  <button
                    className={viewMode === 'list' ? 'active' : ''}
                    onClick={() => setViewMode('list')}
                    title="List View"
                  >
                    ☰
                  </button>
                </div>
              </div>

              {/* Media Grid/List */}
              {loading ? (
                <div className="loading">Loading media...</div>
              ) : media.length === 0 ? (
                <div className="empty">
                  <p>No media found</p>
                  <button onClick={() => setActiveTab('upload')}>Upload your first file</button>
                </div>
              ) : (
                <div className={`media-container ${viewMode}`}>
                  {media.map((item) => (
                    <MediaItemCard
                      key={item.id}
                      item={item}
                      isSelected={selected.has(item.id)}
                      onClick={() => handleSelect(item)}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    ← Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="upload-tab">
              <UploadZone accept={accept} multiple={true} onUploadComplete={handleUploadComplete} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="selection-info">
            {selected.size > 0 && (
              <span>
                {selected.size} {selected.size === 1 ? 'item' : 'items'} selected
              </span>
            )}
          </div>
          <div className="footer-actions">
            <button onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button onClick={handleInsert} disabled={selected.size === 0} className="insert-btn">
              {multiple ? 'Insert Selected' : 'Insert'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 1000px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }

        .tabs button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tabs button:hover {
          color: #374151;
        }

        .tabs button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .modal-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .toolbar {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 200px;
          position: relative;
        }

        .search-box input {
          width: 100%;
          padding: 0.5rem 2rem 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .clear-search {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: none;
          cursor: pointer;
          color: #9ca3af;
        }

        select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
          background: white;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .view-toggle button {
          padding: 0.5rem 0.75rem;
          border: none;
          background: white;
          cursor: pointer;
        }

        .view-toggle button.active {
          background: #3b82f6;
          color: white;
        }

        .loading,
        .empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #6b7280;
        }

        .empty button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .media-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .media-container.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .media-container.list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .upload-tab {
          padding: 1.5rem;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .pagination button {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination span {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .selection-info {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .footer-actions {
          display: flex;
          gap: 0.75rem;
        }

        .cancel-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          cursor: pointer;
        }

        .insert-btn {
          padding: 0.5rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .insert-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// MEDIA ITEM CARD
// ============================================================================

function MediaItemCard({
  item,
  isSelected,
  onClick,
  viewMode,
}: {
  item: MediaItem;
  isSelected: boolean;
  onClick: () => void;
  viewMode: ViewMode;
}) {
  const getIcon = () => {
    switch (item.type) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      default:
        return null;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (viewMode === 'list') {
    return (
      <button className={`media-item-list ${isSelected ? 'selected' : ''}`} onClick={onClick}>
        <div className="item-preview">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" />
          ) : (
            <span className="item-icon">{getIcon()}</span>
          )}
        </div>
        <div className="item-info">
          <span className="item-name">{item.name}</span>
          <span className="item-meta">
            {item.type} • {formatSize(item.size)}
            {item.width && item.height && ` • ${item.width}×${item.height}`}
          </span>
        </div>
        {isSelected && <span className="check">✓</span>}

        <style jsx>{`
          .media-item-list {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem;
            border: 2px solid transparent;
            border-radius: 8px;
            background: #f9fafb;
            cursor: pointer;
            text-align: left;
            width: 100%;
          }

          .media-item-list:hover {
            background: #f3f4f6;
          }

          .media-item-list.selected {
            border-color: #3b82f6;
            background: #eff6ff;
          }

          .item-preview {
            width: 48px;
            height: 48px;
            border-radius: 6px;
            overflow: hidden;
            background: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .item-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .item-icon {
            font-size: 1.5rem;
          }

          .item-info {
            flex: 1;
            min-width: 0;
          }

          .item-name {
            display: block;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .item-meta {
            font-size: 0.75rem;
            color: #6b7280;
          }

          .check {
            width: 24px;
            height: 24px;
            background: #3b82f6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.875rem;
          }
        `}</style>
      </button>
    );
  }

  return (
    <button className={`media-item-grid ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <div className="item-thumbnail">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" />
        ) : (
          <span className="item-icon">{getIcon()}</span>
        )}
        {item.type === 'video' && item.duration && (
          <span className="duration">
            {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
          </span>
        )}
        {isSelected && (
          <span className="check-overlay">
            <span className="check">✓</span>
          </span>
        )}
      </div>
      <div className="item-name" title={item.name}>
        {item.name}
      </div>

      <style jsx>{`
        .media-item-grid {
          display: flex;
          flex-direction: column;
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          background: white;
          text-align: left;
        }

        .media-item-grid:hover {
          border-color: #e5e7eb;
        }

        .media-item-grid.selected {
          border-color: #3b82f6;
        }

        .item-thumbnail {
          aspect-ratio: 1;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .item-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .item-icon {
          font-size: 2.5rem;
        }

        .duration {
          position: absolute;
          bottom: 0.25rem;
          right: 0.25rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-size: 0.75rem;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
        }

        .check-overlay {
          position: absolute;
          inset: 0;
          background: rgba(59, 130, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .check {
          width: 32px;
          height: 32px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }

        .item-name {
          padding: 0.5rem;
          font-size: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </button>
  );
}
