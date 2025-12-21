'use client';

/**
 * Admin Media Library Component
 * Phase 2.9: Admin view, storage stats, cleanup tools, CDN purge
 */

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface MediaFile {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  url: string;
  thumbnail_url: string | null;
  blur_hash: string | null;
  alt_text: string | null;
  folder_id: string | null;
  folder?: MediaFolder;
  uploaded_by: string;
  uploader?: {
    id: string;
    display_name: string;
    username: string;
  };
  usage_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  file_count: number;
  total_size: number;
  created_at: string;
}

export interface StorageStats {
  total_files: number;
  total_size_bytes: number;
  storage_limit_bytes: number;
  usage_percentage: number;
  by_type: {
    images: { count: number; size: number };
    videos: { count: number; size: number };
    audio: { count: number; size: number };
    documents: { count: number; size: number };
    other: { count: number; size: number };
  };
  recent_uploads: number;
  orphaned_files: number;
  duplicate_files: number;
}

interface MediaFilters {
  search: string;
  type: 'all' | 'image' | 'video' | 'audio' | 'document';
  folder: string | null;
  sort: 'created_at' | 'size_bytes' | 'filename' | 'usage_count';
  order: 'asc' | 'desc';
  filter: 'all' | 'orphaned' | 'duplicates' | 'large';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [filters, setFilters] = useState<MediaFilters>({
    search: '',
    type: 'all',
    folder: null,
    sort: 'created_at',
    order: 'desc',
    filter: 'all',
  });

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sort: filters.sort,
        order: filters.order,
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.folder) params.set('folder', filters.folder);
      if (filters.filter !== 'all') params.set('filter', filters.filter);

      const [mediaRes, foldersRes, statsRes] = await Promise.all([
        fetch(`/api/admin/media?${params}`),
        fetch('/api/admin/media/folders'),
        fetch('/api/admin/media/stats'),
      ]);

      if (mediaRes.ok) {
        const data = await mediaRes.json();
        setFiles(data.files || []);
        setPagination((p) => ({ ...p, total: data.total || 0 }));
      }

      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.folders || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} file(s)?`)) return;

    try {
      await fetch('/api/admin/media/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      fetchMedia();
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to delete files:', error);
    }
  };

  const handleCleanup = async (type: 'orphaned' | 'duplicates') => {
    if (!confirm(`Delete all ${type} files?`)) return;

    try {
      await fetch(`/api/admin/media/cleanup/${type}`, { method: 'POST' });
      fetchMedia();
    } catch (error) {
      console.error('Failed to cleanup files:', error);
    }
  };

  const handlePurgeCDN = async () => {
    if (!confirm('Purge CDN cache for all files?')) return;

    try {
      await fetch('/api/admin/media/purge-cdn', { method: 'POST' });
      alert('CDN cache purged successfully');
    } catch (error) {
      console.error('Failed to purge CDN:', error);
    }
  };

  const toggleSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  return (
    <div className="media-library">
      {/* Header */}
      <div className="header">
        <h1>Media Library</h1>
        <div className="header-actions">
          <button onClick={handlePurgeCDN} className="secondary-btn">
            🔄 Purge CDN
          </button>
          <button onClick={() => setShowUploadModal(true)} className="primary-btn">
            ⬆️ Upload
          </button>
        </div>
      </div>

      {/* Storage Stats */}
      {stats && <StorageStatsCard stats={stats} onCleanup={handleCleanup} />}

      {/* Filters */}
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search files..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="search-input"
        />

        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as MediaFilters['type'] }))}
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="document">Documents</option>
        </select>

        <select
          value={filters.folder || ''}
          onChange={(e) => setFilters((f) => ({ ...f, folder: e.target.value || null }))}
        >
          <option value="">All Folders</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>

        <select
          value={filters.filter}
          onChange={(e) =>
            setFilters((f) => ({ ...f, filter: e.target.value as MediaFilters['filter'] }))
          }
        >
          <option value="all">All Files</option>
          <option value="orphaned">Orphaned ({stats?.orphaned_files || 0})</option>
          <option value="duplicates">Duplicates ({stats?.duplicate_files || 0})</option>
          <option value="large">Large Files (&gt;10MB)</option>
        </select>

        <select
          value={`${filters.sort}-${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split('-') as [MediaFilters['sort'], MediaFilters['order']];
            setFilters((f) => ({ ...f, sort, order }));
          }}
        >
          <option value="created_at-desc">Newest</option>
          <option value="created_at-asc">Oldest</option>
          <option value="size_bytes-desc">Largest</option>
          <option value="size_bytes-asc">Smallest</option>
          <option value="filename-asc">Name A-Z</option>
          <option value="usage_count-desc">Most Used</option>
        </select>

        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            ⊞
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            ≡
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedFiles.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedFiles.size} selected</span>
          <button onClick={() => handleDelete(Array.from(selectedFiles))} className="danger">
            Delete
          </button>
          <button onClick={() => setSelectedFiles(new Set())}>Clear</button>
        </div>
      )}

      {/* Files Grid/List */}
      <div className="files-container">
        {loading ? (
          <div className="loading">Loading media...</div>
        ) : files.length === 0 ? (
          <div className="empty-state">No files found</div>
        ) : viewMode === 'grid' ? (
          <div className="files-grid">
            <div className="select-all-grid">
              <label>
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onChange={toggleSelectAll}
                />
                Select All
              </label>
            </div>
            {files.map((file) => (
              <MediaGridItem
                key={file.id}
                file={file}
                isSelected={selectedFiles.has(file.id)}
                onSelect={() => toggleSelect(file.id)}
                onView={() => {
                  setSelectedFile(file);
                  setShowDetailModal(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="files-list">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedFiles.size === files.length && files.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Preview</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded By</th>
                  <th>Usage</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <MediaListItem
                    key={file.id}
                    file={file}
                    isSelected={selectedFiles.has(file.id)}
                    onSelect={() => toggleSelect(file.id)}
                    onView={() => {
                      setSelectedFile(file);
                      setShowDetailModal(true);
                    }}
                    onDelete={() => handleDelete([file.id])}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          onChange={(page) => setPagination((p) => ({ ...p, page }))}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedFile && (
        <MediaDetailModal
          file={selectedFile}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedFile(null);
          }}
          onDelete={() => {
            handleDelete([selectedFile.id]);
            setShowDetailModal(false);
            setSelectedFile(null);
          }}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => {
            setShowUploadModal(false);
            fetchMedia();
          }}
        />
      )}

      <style jsx>{`
        .media-library {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .primary-btn,
        .secondary-btn {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .primary-btn {
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
        }

        .secondary-btn {
          background: white;
          border: 1px solid var(--border-color, #e5e7eb);
        }

        .toolbar {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
        }

        select {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
        }

        .view-toggle {
          display: flex;
          border: 1px solid var(--border-color, #e5e7eb);
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
          background: var(--primary-color, #3b82f6);
          color: white;
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: #dbeafe;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .bulk-actions button {
          padding: 0.375rem 0.75rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 6px;
          background: white;
          cursor: pointer;
        }

        .bulk-actions button.danger {
          border-color: #ef4444;
          color: #991b1b;
        }

        .files-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          min-height: 400px;
        }

        .loading,
        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: var(--text-muted, #6b7280);
        }

        .files-grid {
          padding: 1rem;
        }

        .select-all-grid {
          margin-bottom: 1rem;
        }

        .select-all-grid label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }

        .files-list table {
          width: 100%;
          border-collapse: collapse;
        }

        .files-list th,
        .files-list :global(td) {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .files-list th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted, #6b7280);
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StorageStatsCard({
  stats,
  onCleanup,
}: {
  stats: StorageStats;
  onCleanup: (type: 'orphaned' | 'duplicates') => void;
}) {
  return (
    <div className="storage-stats">
      <div className="stats-main">
        <div className="storage-bar">
          <div className="storage-used" style={{ width: `${stats.usage_percentage}%` }} />
        </div>
        <div className="storage-info">
          <span>{formatBytes(stats.total_size_bytes)} used</span>
          <span>of {formatBytes(stats.storage_limit_bytes)}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{stats.total_files}</span>
          <span className="stat-label">Total Files</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.by_type.images.count}</span>
          <span className="stat-label">Images</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.by_type.videos.count}</span>
          <span className="stat-label">Videos</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.by_type.audio.count}</span>
          <span className="stat-label">Audio</span>
        </div>
      </div>

      <div className="cleanup-section">
        {stats.orphaned_files > 0 && (
          <button onClick={() => onCleanup('orphaned')} className="cleanup-btn">
            🗑️ {stats.orphaned_files} orphaned ({formatBytes(0)})
          </button>
        )}
        {stats.duplicate_files > 0 && (
          <button onClick={() => onCleanup('duplicates')} className="cleanup-btn">
            📑 {stats.duplicate_files} duplicates
          </button>
        )}
      </div>

      <style jsx>{`
        .storage-stats {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .stats-main {
          margin-bottom: 1rem;
        }

        .storage-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .storage-used {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 4px;
          transition: width 0.3s;
        }

        .storage-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .cleanup-section {
          display: flex;
          gap: 0.75rem;
        }

        .cleanup-btn {
          padding: 0.5rem 1rem;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .cleanup-btn:hover {
          background: #fde68a;
        }
      `}</style>
    </div>
  );
}

function MediaGridItem({
  file,
  isSelected,
  onSelect,
  onView,
}: {
  file: MediaFile;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
}) {
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');

  return (
    <div className={`media-item ${isSelected ? 'selected' : ''}`}>
      <div className="media-preview" onClick={onView}>
        {isImage ? (
          <img src={file.thumbnail_url || file.url} alt={file.alt_text || file.filename} />
        ) : isVideo ? (
          <div className="video-preview">
            <span className="type-icon">🎬</span>
          </div>
        ) : (
          <div className="file-preview">
            <span className="type-icon">{getFileIcon(file.mime_type)}</span>
          </div>
        )}
        <div className="media-overlay">
          <span>{formatBytes(file.size_bytes)}</span>
          {file.width && file.height && (
            <span>{file.width}×{file.height}</span>
          )}
        </div>
      </div>
      <div className="media-info">
        <input type="checkbox" checked={isSelected} onChange={onSelect} />
        <span className="media-name" title={file.original_filename}>
          {file.original_filename}
        </span>
      </div>

      <style jsx>{`
        .media-item {
          background: #f9fafb;
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .media-item:hover {
          border-color: var(--border-color, #e5e7eb);
        }

        .media-item.selected {
          border-color: var(--primary-color, #3b82f6);
          background: #dbeafe;
        }

        .media-preview {
          position: relative;
          aspect-ratio: 1;
          cursor: pointer;
          overflow: hidden;
        }

        .media-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-preview,
        .file-preview {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e5e7eb;
        }

        .type-icon {
          font-size: 2rem;
        }

        .media-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0.5rem;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
          color: white;
          font-size: 0.75rem;
          display: flex;
          justify-content: space-between;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .media-item:hover .media-overlay {
          opacity: 1;
        }

        .media-info {
          padding: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .media-name {
          flex: 1;
          font-size: 0.75rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

function MediaListItem({
  file,
  isSelected,
  onSelect,
  onView,
  onDelete,
}: {
  file: MediaFile;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className={isSelected ? 'selected' : ''}>
      <td>
        <input type="checkbox" checked={isSelected} onChange={onSelect} />
      </td>
      <td>
        <div className="preview-cell" onClick={onView}>
          {file.mime_type.startsWith('image/') ? (
            <img src={file.thumbnail_url || file.url} alt="" />
          ) : (
            <span className="type-icon">{getFileIcon(file.mime_type)}</span>
          )}
        </div>
      </td>
      <td className="name-cell">{file.original_filename}</td>
      <td>{file.mime_type.split('/')[1]}</td>
      <td>{formatBytes(file.size_bytes)}</td>
      <td>{file.uploader?.display_name || 'Unknown'}</td>
      <td>{file.usage_count}</td>
      <td>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</td>
      <td>
        <div className="actions">
          <button onClick={onView}>👁️</button>
          <a href={file.url} target="_blank" rel="noopener noreferrer">↗️</a>
          <button onClick={onDelete} className="danger">🗑️</button>
        </div>
      </td>

      <style jsx>{`
        tr.selected {
          background: #dbeafe;
        }

        .preview-cell {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
        }

        .preview-cell img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .type-icon {
          font-size: 1.25rem;
        }

        .name-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .actions {
          display: flex;
          gap: 0.25rem;
        }

        .actions button,
        .actions a {
          padding: 0.25rem 0.5rem;
          border: none;
          background: none;
          cursor: pointer;
          text-decoration: none;
          opacity: 0.7;
        }

        .actions button:hover,
        .actions a:hover {
          opacity: 1;
        }

        .actions .danger:hover {
          background: #fee2e2;
          border-radius: 4px;
        }
      `}</style>
    </tr>
  );
}

function MediaDetailModal({
  file,
  onClose,
  onDelete,
}: {
  file: MediaFile;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [altText, setAltText] = useState(file.alt_text || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/media/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt_text: altText }),
      });
    } catch (error) {
      console.error('Failed to save:', error);
    }
    setSaving(false);
  };

  const isImage = file.mime_type.startsWith('image/');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>File Details</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          <div className="preview-section">
            {isImage ? (
              <img src={file.url} alt={file.alt_text || file.filename} />
            ) : (
              <div className="file-icon">{getFileIcon(file.mime_type)}</div>
            )}
          </div>

          <div className="details-section">
            <dl>
              <div>
                <dt>Filename</dt>
                <dd>{file.original_filename}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{file.mime_type}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{formatBytes(file.size_bytes)}</dd>
              </div>
              {file.width && file.height && (
                <div>
                  <dt>Dimensions</dt>
                  <dd>{file.width} × {file.height}</dd>
                </div>
              )}
              <div>
                <dt>Uploaded</dt>
                <dd>{new Date(file.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Uploaded By</dt>
                <dd>{file.uploader?.display_name || 'Unknown'}</dd>
              </div>
              <div>
                <dt>Usage Count</dt>
                <dd>{file.usage_count} references</dd>
              </div>
            </dl>

            {isImage && (
              <div className="alt-text-section">
                <label>Alt Text</label>
                <textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe this image..."
                  rows={2}
                />
                <button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            <div className="url-section">
              <label>URL</label>
              <input type="text" value={file.url} readOnly />
              <button onClick={() => navigator.clipboard.writeText(file.url)}>Copy</button>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <a href={file.url} download className="download-btn">
            Download
          </a>
          <button onClick={onDelete} className="delete-btn">
            Delete
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
          }

          .modal-header h2 {
            margin: 0;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
          }

          .modal-body {
            padding: 1.5rem;
          }

          .preview-section {
            margin-bottom: 1.5rem;
            text-align: center;
          }

          .preview-section img {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
          }

          .file-icon {
            font-size: 4rem;
          }

          dl {
            margin: 0 0 1.5rem;
          }

          dl div {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
          }

          dt {
            color: var(--text-muted, #6b7280);
          }

          dd {
            margin: 0;
            font-weight: 500;
          }

          .alt-text-section,
          .url-section {
            margin-bottom: 1rem;
          }

          .alt-text-section label,
          .url-section label {
            display: block;
            margin-bottom: 0.25rem;
            font-weight: 500;
          }

          .alt-text-section textarea,
          .url-section input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            margin-bottom: 0.5rem;
          }

          .alt-text-section button,
          .url-section button {
            padding: 0.25rem 0.75rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 6px;
            background: white;
            cursor: pointer;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-color, #e5e7eb);
          }

          .download-btn,
          .delete-btn {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            text-decoration: none;
            cursor: pointer;
          }

          .download-btn {
            background: var(--primary-color, #3b82f6);
            color: white;
            border: none;
          }

          .delete-btn {
            background: white;
            border: 1px solid #ef4444;
            color: #991b1b;
          }
        `}</style>
      </div>
    </div>
  );
}

function UploadModal({
  onClose,
  onUploadComplete,
}: {
  onClose: () => void;
  onUploadComplete: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);

      try {
        await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (error) {
        console.error('Failed to upload:', error);
      }

      setProgress(((i + 1) / files.length) * 100);
    }

    setUploading(false);
    onUploadComplete();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Files</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          <div className="dropzone">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              id="file-input"
            />
            <label htmlFor="file-input">
              <span>📁</span>
              <p>Drop files here or click to browse</p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="file-list">
              {files.map((file, i) => (
                <div key={i} className="file-item">
                  <span>{file.name}</span>
                  <span>{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} disabled={uploading}>Cancel</button>
          <button onClick={handleUpload} disabled={files.length === 0 || uploading} className="primary">
            {uploading ? `Uploading... ${Math.round(progress)}%` : `Upload ${files.length} file(s)`}
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
          }

          .modal-header h2 {
            margin: 0;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
          }

          .modal-body {
            padding: 1.5rem;
          }

          .dropzone {
            border: 2px dashed var(--border-color, #e5e7eb);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
          }

          .dropzone input {
            display: none;
          }

          .dropzone label {
            cursor: pointer;
          }

          .dropzone span {
            font-size: 2rem;
          }

          .dropzone p {
            margin: 0.5rem 0 0;
            color: var(--text-muted, #6b7280);
          }

          .file-list {
            margin-top: 1rem;
            max-height: 200px;
            overflow-y: auto;
          }

          .file-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
            font-size: 0.875rem;
          }

          .progress-bar {
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            margin-top: 1rem;
            overflow: hidden;
          }

          .progress {
            height: 100%;
            background: var(--primary-color, #3b82f6);
            transition: width 0.3s;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-color, #e5e7eb);
          }

          .modal-actions button {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            background: white;
            cursor: pointer;
          }

          .modal-actions button.primary {
            background: var(--primary-color, #3b82f6);
            color: white;
            border-color: var(--primary-color, #3b82f6);
          }

          .modal-actions button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

function Pagination({
  page,
  limit,
  total,
  onChange,
}: {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="pagination">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        Next →
      </button>

      <style jsx>{`
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        button {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        span {
          color: var(--text-muted, #6b7280);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  return '📁';
}
