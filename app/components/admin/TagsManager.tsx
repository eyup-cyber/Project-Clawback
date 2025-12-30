'use client';

/**
 * Tags Manager Component
 * Phase 2.8: CRUD, merge duplicates, cleanup unused, popular tracking
 */

import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  post_count: number;
  follower_count: number;
  is_featured: boolean;
  color: string | null;
  created_at: string;
  last_used_at: string | null;
}

interface TagFilters {
  search: string;
  sort: 'name' | 'post_count' | 'created_at' | 'last_used_at';
  order: 'asc' | 'desc';
  filter: 'all' | 'featured' | 'unused' | 'duplicates';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TagsManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Tag | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  });
  const [filters, setFilters] = useState<TagFilters>({
    search: '',
    sort: 'post_count',
    order: 'desc',
    filter: 'all',
  });
  const [stats, setStats] = useState({
    total: 0,
    featured: 0,
    unused: 0,
    duplicateCandidates: 0,
  });

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sort: filters.sort,
        order: filters.order,
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.filter !== 'all') params.set('filter', filters.filter);

      const response = await fetch(`/api/admin/tags?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
        setPagination((p) => ({ ...p, total: data.total || 0 }));
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  const handleCreate = async (data: {
    name: string;
    description: string;
    is_featured: boolean;
    color: string;
  }) => {
    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        void fetchTags();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Tag>) => {
    try {
      const response = await fetch(`/api/admin/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        fetchTags();
        setShowEditModal(null);
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' });
      void fetchTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const handleMerge = async (sourceIds: string[], targetId: string) => {
    try {
      const response = await fetch('/api/admin/tags/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_ids: sourceIds, target_id: targetId }),
      });

      if (response.ok) {
        fetchTags();
        setSelectedTags(new Set());
        setShowMergeModal(false);
      }
    } catch (error) {
      console.error('Failed to merge tags:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTags.size} tags?`)) return;

    try {
      await fetch('/api/admin/tags/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedTags) }),
      });
      void fetchTags();
      setSelectedTags(new Set());
    } catch (error) {
      console.error('Failed to delete tags:', error);
    }
  };

  const handleCleanupUnused = async () => {
    if (!confirm('Delete all unused tags?')) return;

    try {
      await fetch('/api/admin/tags/cleanup', { method: 'POST' });
      void fetchTags();
    } catch (error) {
      console.error('Failed to cleanup tags:', error);
    }
  };

  const toggleSelect = (tagId: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTags(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTags.size === tags.length) {
      setSelectedTags(new Set());
    } else {
      setSelectedTags(new Set(tags.map((t) => t.id)));
    }
  };

  return (
    <div className="tags-manager">
      {/* Header */}
      <div className="header">
        <h1>Tags</h1>
        <div className="header-actions">
          {stats.unused > 0 && (
            <button className="cleanup-btn" onClick={() => void handleCleanupUnused()}>
              🧹 Cleanup {stats.unused} unused
            </button>
          )}
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            + New Tag
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <button
          className={`stat-btn ${filters.filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, filter: 'all' }))}
        >
          All ({stats.total})
        </button>
        <button
          className={`stat-btn ${filters.filter === 'featured' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, filter: 'featured' }))}
        >
          Featured ({stats.featured})
        </button>
        <button
          className={`stat-btn ${filters.filter === 'unused' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, filter: 'unused' }))}
        >
          Unused ({stats.unused})
        </button>
        <button
          className={`stat-btn ${filters.filter === 'duplicates' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, filter: 'duplicates' }))}
        >
          Duplicates ({stats.duplicateCandidates})
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="search"
          placeholder="Search tags..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="search-input"
        />

        <select
          value={`${filters.sort}-${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split('-') as [
              TagFilters['sort'],
              TagFilters['order'],
            ];
            setFilters((f) => ({ ...f, sort, order }));
          }}
        >
          <option value="post_count-desc">Most Used</option>
          <option value="post_count-asc">Least Used</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="created_at-desc">Newest</option>
          <option value="last_used_at-desc">Recently Used</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedTags.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedTags.size} selected</span>
          <button onClick={() => setShowMergeModal(true)} disabled={selectedTags.size < 2}>
            Merge
          </button>
          <button onClick={handleBulkDelete} className="danger">
            Delete
          </button>
          <button onClick={() => setSelectedTags(new Set())}>Clear</button>
        </div>
      )}

      {/* Tags Grid */}
      <div className="tags-container">
        {loading ? (
          <div className="loading">Loading tags...</div>
        ) : tags.length === 0 ? (
          <div className="empty-state">No tags found</div>
        ) : (
          <>
            <div className="select-all">
              <label>
                <input
                  type="checkbox"
                  checked={selectedTags.size === tags.length && tags.length > 0}
                  onChange={toggleSelectAll}
                />
                Select All
              </label>
            </div>
            <div className="tags-grid">
              {tags.map((tag) => (
                <TagCard
                  key={tag.id}
                  tag={tag}
                  isSelected={selectedTags.has(tag.id)}
                  onSelect={() => toggleSelect(tag.id)}
                  onEdit={() => setShowEditModal(tag)}
                  onDelete={() => void handleDelete(tag.id)}
                  onToggleFeatured={() =>
                    void handleUpdate(tag.id, { is_featured: !tag.is_featured })
                  }
                />
              ))}
            </div>
          </>
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

      {/* Create Modal */}
      {showCreateModal && (
        <TagFormModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreate} />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <TagFormModal
          tag={showEditModal}
          onClose={() => setShowEditModal(null)}
          onSubmit={(data) => handleUpdate(showEditModal.id, data)}
        />
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <MergeTagsModal
          selectedTags={tags.filter((t) => selectedTags.has(t.id))}
          onClose={() => setShowMergeModal(false)}
          onMerge={handleMerge}
        />
      )}

      <style jsx>{`
        .tags-manager {
          padding: 1.5rem;
          max-width: 1200px;
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

        .cleanup-btn {
          padding: 0.5rem 1rem;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          cursor: pointer;
        }

        .create-btn {
          padding: 0.5rem 1rem;
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .stats-bar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .stat-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .stat-btn.active {
          background: var(--primary-color, #3b82f6);
          color: white;
          border-color: var(--primary-color, #3b82f6);
        }

        .filters-bar {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .search-input {
          flex: 1;
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
          font-size: 0.875rem;
        }

        .bulk-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bulk-actions button.danger {
          border-color: #ef4444;
          color: #991b1b;
        }

        .tags-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted, #6b7280);
        }

        .select-all {
          margin-bottom: 1rem;
        }

        .select-all label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }

        .tags-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TagCard({
  tag,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  tag: Tag;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  return (
    <div className={`tag-card ${isSelected ? 'selected' : ''}`}>
      <div className="card-header">
        <input type="checkbox" checked={isSelected} onChange={onSelect} />
        <div className="tag-color" style={{ backgroundColor: tag.color || '#6b7280' }} />
        <div className="tag-info">
          <div className="tag-name">
            #{tag.name}
            {tag.is_featured && <span className="featured-badge">⭐</span>}
          </div>
          <div className="tag-slug">/{tag.slug}</div>
        </div>
      </div>

      <div className="tag-stats">
        <span>{tag.post_count} posts</span>
        <span>{tag.follower_count} followers</span>
      </div>

      {tag.description && <p className="tag-description">{tag.description}</p>}

      <div className="card-footer">
        <span className="last-used">
          {tag.last_used_at
            ? `Used ${formatDistanceToNow(new Date(tag.last_used_at), { addSuffix: true })}`
            : 'Never used'}
        </span>
        <div className="actions">
          <button onClick={onToggleFeatured} title={tag.is_featured ? 'Unfeature' : 'Feature'}>
            {tag.is_featured ? '★' : '☆'}
          </button>
          <button onClick={onEdit} title="Edit">
            ✏️
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="danger"
            disabled={tag.post_count > 0}
          >
            🗑️
          </button>
        </div>
      </div>

      <style jsx>{`
        .tag-card {
          background: #f9fafb;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 1rem;
          transition: all 0.2s;
        }

        .tag-card:hover {
          border-color: var(--border-color, #e5e7eb);
        }

        .tag-card.selected {
          background: #dbeafe;
          border-color: var(--primary-color, #3b82f6);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .tag-color {
          width: 24px;
          height: 24px;
          border-radius: 6px;
        }

        .tag-info {
          flex: 1;
        }

        .tag-name {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .featured-badge {
          font-size: 0.875rem;
        }

        .tag-slug {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .tag-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          margin-bottom: 0.5rem;
        }

        .tag-description {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
          margin: 0 0 0.75rem;
          line-height: 1.4;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color, #e5e7eb);
        }

        .last-used {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .actions {
          display: flex;
          gap: 0.25rem;
        }

        .actions button {
          padding: 0.25rem 0.5rem;
          border: none;
          background: none;
          cursor: pointer;
          opacity: 0.7;
        }

        .actions button:hover {
          opacity: 1;
        }

        .actions button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .actions button.danger:hover:not(:disabled) {
          background: #fee2e2;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

function TagFormModal({
  tag,
  onClose,
  onSubmit,
}: {
  tag?: Tag;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    is_featured: boolean;
    color: string;
  }) => void;
}) {
  const [name, setName] = useState(tag?.name || '');
  const [description, setDescription] = useState(tag?.description || '');
  const [isFeatured, setIsFeatured] = useState(tag?.is_featured || false);
  const [color, setColor] = useState(tag?.color || '#6b7280');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ name, description, is_featured: isFeatured, color });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{tag ? 'Edit Tag' : 'New Tag'}</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tag name"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              Featured
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'Saving...' : tag ? 'Save Changes' : 'Create Tag'}
            </button>
          </div>
        </form>

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
            max-width: 400px;
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

          .form-group {
            margin-bottom: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 0.25rem;
            font-weight: 500;
          }

          .form-group input,
          .form-group textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
          }

          .form-row {
            display: flex;
            align-items: center;
            gap: 1.5rem;
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1.5rem;
          }

          .modal-actions button {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            background: white;
            cursor: pointer;
          }

          .modal-actions .primary {
            background: var(--primary-color, #3b82f6);
            color: white;
            border-color: var(--primary-color, #3b82f6);
          }
        `}</style>
      </div>
    </div>
  );
}

function MergeTagsModal({
  selectedTags,
  onClose,
  onMerge,
}: {
  selectedTags: Tag[];
  onClose: () => void;
  onMerge: (sourceIds: string[], targetId: string) => void;
}) {
  const [targetId, setTargetId] = useState(selectedTags[0]?.id || '');

  const handleMerge = () => {
    const sourceIds = selectedTags.filter((t) => t.id !== targetId).map((t) => t.id);
    onMerge(sourceIds, targetId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Merge Tags</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="modal-body">
          <p>Select which tag to keep. All other tags will be merged into it.</p>

          <div className="tags-list">
            {selectedTags.map((tag) => (
              <label key={tag.id} className={`tag-option ${targetId === tag.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="target"
                  value={tag.id}
                  checked={targetId === tag.id}
                  onChange={(e) => setTargetId(e.target.value)}
                />
                <span className="tag-name">#{tag.name}</span>
                <span className="tag-count">{tag.post_count} posts</span>
              </label>
            ))}
          </div>

          <div className="merge-preview">
            <p>
              Posts from{' '}
              {selectedTags
                .filter((t) => t.id !== targetId)
                .map((t) => `#${t.name}`)
                .join(', ')}
              will be moved to <strong>#{selectedTags.find((t) => t.id === targetId)?.name}</strong>
            </p>
          </div>

          <div className="modal-actions">
            <button onClick={onClose}>Cancel</button>
            <button onClick={handleMerge} className="primary">
              Merge Tags
            </button>
          </div>
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
            max-width: 400px;
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

          .tags-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin: 1rem 0;
          }

          .tag-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border: 2px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            cursor: pointer;
          }

          .tag-option.selected {
            border-color: var(--primary-color, #3b82f6);
            background: #dbeafe;
          }

          .tag-name {
            flex: 1;
            font-weight: 500;
          }

          .tag-count {
            font-size: 0.875rem;
            color: var(--text-muted, #6b7280);
          }

          .merge-preview {
            padding: 1rem;
            background: #f9fafb;
            border-radius: 8px;
            font-size: 0.875rem;
          }

          .merge-preview p {
            margin: 0;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1.5rem;
          }

          .modal-actions button {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            background: white;
            cursor: pointer;
          }

          .modal-actions .primary {
            background: var(--primary-color, #3b82f6);
            color: white;
            border-color: var(--primary-color, #3b82f6);
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
      <span>
        Page {page} of {totalPages}
      </span>
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
