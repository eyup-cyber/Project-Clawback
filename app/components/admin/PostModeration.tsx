'use client';

/**
 * Post Moderation Component
 * Phase 2.4: Table, moderate actions, feature toggle, archive
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'archived';

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: PostStatus;
  featured_image_url: string | null;
  is_featured: boolean;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  reading_time: number;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
  tags: string[];
  created_at: string;
  published_at: string | null;
  updated_at: string;
}

interface PostFilters {
  status: PostStatus | 'all';
  search: string;
  category: string;
  author: string;
  featured: 'all' | 'featured' | 'not_featured';
  sort: 'created_at' | 'published_at' | 'view_count' | 'title';
  order: 'asc' | 'desc';
}

interface ModerationAction {
  type: 'publish' | 'unpublish' | 'reject' | 'archive' | 'restore' | 'delete' | 'feature' | 'unfeature';
  postId: string;
  reason?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostModeration() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<ModerationAction | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [filters, setFilters] = useState<PostFilters>({
    status: 'all',
    search: '',
    category: '',
    author: '',
    featured: 'all',
    sort: 'created_at',
    order: 'desc',
  });
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    drafts: 0,
    archived: 0,
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sort: filters.sort,
        order: filters.order,
      });

      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.author) params.set('author', filters.author);
      if (filters.featured !== 'all') params.set('featured', filters.featured);

      const response = await fetch(`/api/admin/posts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        setPagination((p) => ({ ...p, total: data.total || 0 }));
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleAction = async (action: ModerationAction) => {
    try {
      const response = await fetch(`/api/admin/posts/${action.postId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.type, reason: action.reason }),
      });

      if (response.ok) {
        void fetchPosts();
        setShowActionModal(null);
        setSelectedPost(null);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const handleBulkAction = async (actionType: ModerationAction['type']) => {
    if (selectedPosts.size === 0) return;

    try {
      const response = await fetch('/api/admin/posts/bulk-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          postIds: Array.from(selectedPosts),
        }),
      });

      if (response.ok) {
        void fetchPosts();
        setSelectedPosts(new Set());
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map((p) => p.id)));
    }
  };

  const toggleSelect = (postId: string) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  };

  return (
    <div className="post-moderation">
      {/* Header */}
      <div className="header">
        <h1>Post Moderation</h1>
        <Link href="/admin/posts/new" className="create-btn">
          + Create Post
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <button
          className={`stat-btn ${filters.status === 'all' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'all' }))}
        >
          All ({stats.total})
        </button>
        <button
          className={`stat-btn ${filters.status === 'published' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'published' }))}
        >
          Published ({stats.published})
        </button>
        <button
          className={`stat-btn ${filters.status === 'pending' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'pending' }))}
        >
          Pending ({stats.pending})
        </button>
        <button
          className={`stat-btn ${filters.status === 'draft' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'draft' }))}
        >
          Drafts ({stats.drafts})
        </button>
        <button
          className={`stat-btn ${filters.status === 'archived' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'archived' }))}
        >
          Archived ({stats.archived})
        </button>
      </div>

      {/* Filters */}
      <PostFiltersBar filters={filters} onChange={setFilters} />

      {/* Bulk Actions */}
      {selectedPosts.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedPosts.size} selected</span>
          <button onClick={() => void handleBulkAction('publish')}>Publish</button>
          <button onClick={() => void handleBulkAction('unpublish')}>Unpublish</button>
          <button onClick={() => void handleBulkAction('archive')}>Archive</button>
          <button onClick={() => void handleBulkAction('feature')}>Feature</button>
          <button onClick={() => setSelectedPosts(new Set())}>Clear</button>
        </div>
      )}

      {/* Posts Table */}
      <div className="table-container">
        <table className="posts-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={selectedPosts.size === posts.length && posts.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Post</th>
              <th>Author</th>
              <th>Category</th>
              <th>Status</th>
              <th>Views</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="loading-cell">
                  Loading...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No posts found
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  isSelected={selectedPosts.has(post.id)}
                  onSelect={() => toggleSelect(post.id)}
                  onPreview={() => {
                    setSelectedPost(post);
                    setShowPreviewModal(true);
                  }}
                  onAction={(type) => setShowActionModal({ type, postId: post.id })}
                />
              ))
            )}
          </tbody>
        </table>
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

      {/* Preview Modal */}
      {showPreviewModal && selectedPost && (
        <PostPreviewModal
          post={selectedPost}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedPost(null);
          }}
          onAction={(type) => setShowActionModal({ type, postId: selectedPost.id })}
        />
      )}

      {/* Action Confirmation Modal */}
      {showActionModal && (
        <ActionModal
          action={showActionModal}
          onConfirm={(reason) => void handleAction({ ...showActionModal, reason })}
          onCancel={() => setShowActionModal(null)}
        />
      )}

      <style jsx>{`
        .post-moderation {
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

        .create-btn {
          padding: 0.5rem 1rem;
          background: var(--primary-color, #3b82f6);
          color: white;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
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

        .table-container {
          overflow-x: auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .posts-table {
          width: 100%;
          border-collapse: collapse;
        }

        .posts-table th,
        .posts-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .posts-table th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted, #6b7280);
          background: var(--header-bg, #f9fafb);
        }

        .checkbox-col {
          width: 40px;
        }

        .loading-cell,
        .empty-cell {
          text-align: center;
          padding: 3rem !important;
          color: var(--text-muted, #6b7280);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PostFiltersBar({
  filters,
  onChange,
}: {
  filters: PostFilters;
  onChange: (filters: PostFilters) => void;
}) {
  return (
    <div className="filters-bar">
      <input
        type="search"
        placeholder="Search posts..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="search-input"
      />

      <select
        value={filters.featured}
        onChange={(e) =>
          onChange({ ...filters, featured: e.target.value as PostFilters['featured'] })
        }
      >
        <option value="all">All Posts</option>
        <option value="featured">Featured Only</option>
        <option value="not_featured">Not Featured</option>
      </select>

      <select
        value={`${filters.sort}-${filters.order}`}
        onChange={(e) => {
          const [sort, order] = e.target.value.split('-') as [PostFilters['sort'], PostFilters['order']];
          onChange({ ...filters, sort, order });
        }}
      >
        <option value="created_at-desc">Newest First</option>
        <option value="created_at-asc">Oldest First</option>
        <option value="published_at-desc">Recently Published</option>
        <option value="view_count-desc">Most Views</option>
        <option value="title-asc">Title A-Z</option>
      </select>

      <style jsx>{`
        .filters-bar {
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
      `}</style>
    </div>
  );
}

function PostRow({
  post,
  isSelected,
  onSelect,
  onPreview,
  onAction,
}: {
  post: Post;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onAction: (type: ModerationAction['type']) => void;
}) {
  const statusColors: Record<PostStatus, { bg: string; text: string }> = {
    draft: { bg: '#f3f4f6', text: '#6b7280' },
    pending: { bg: '#fef3c7', text: '#92400e' },
    published: { bg: '#d1fae5', text: '#065f46' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
    archived: { bg: '#e5e7eb', text: '#6b7280' },
  };

  const colors = statusColors[post.status];

  return (
    <tr className={isSelected ? 'selected' : ''}>
      <td>
        <input type="checkbox" checked={isSelected} onChange={onSelect} />
      </td>
      <td>
        <div className="post-cell">
          {post.featured_image_url && (
            <img src={post.featured_image_url} alt="" className="post-thumbnail" />
          )}
          <div className="post-info">
            <div className="post-title">
              {post.is_featured && <span className="featured-badge">⭐</span>}
              {post.title}
            </div>
            <div className="post-meta">
              {post.reading_time} min read · {post.reaction_count} reactions · {post.comment_count}{' '}
              comments
            </div>
          </div>
        </div>
      </td>
      <td>
        <div className="author-cell">
          <div className="author-avatar">
            {post.author.avatar_url ? (
              <img src={post.author.avatar_url} alt="" />
            ) : (
              <span>{post.author.display_name.charAt(0)}</span>
            )}
          </div>
          <span>{post.author.display_name}</span>
        </div>
      </td>
      <td>
        {post.category ? (
          <span
            className="category-badge"
            style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
          >
            {post.category.name}
          </span>
        ) : (
          <span className="no-category">—</span>
        )}
      </td>
      <td>
        <span className="status-badge" style={{ backgroundColor: colors.bg, color: colors.text }}>
          {post.status}
        </span>
      </td>
      <td>{post.view_count.toLocaleString()}</td>
      <td>
        <div className="date-cell">
          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          {post.published_at && (
            <span className="published-date">
              Published {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </td>
      <td>
        <div className="actions-cell">
          <button onClick={onPreview} title="Preview">
            👁️
          </button>
          <Link href={`/admin/posts/${post.id}/edit`} title="Edit">
            ✏️
          </Link>
          {post.status === 'pending' && (
            <button onClick={() => onAction('publish')} title="Publish" className="success">
              ✓
            </button>
          )}
          {post.status === 'published' && (
            <button onClick={() => onAction('unpublish')} title="Unpublish">
              ⏸️
            </button>
          )}
          {!post.is_featured ? (
            <button onClick={() => onAction('feature')} title="Feature">
              ⭐
            </button>
          ) : (
            <button onClick={() => onAction('unfeature')} title="Unfeature">
              ★
            </button>
          )}
          {post.status !== 'archived' && (
            <button onClick={() => onAction('archive')} title="Archive">
              📦
            </button>
          )}
          <button onClick={() => onAction('delete')} title="Delete" className="danger">
            🗑️
          </button>
        </div>
      </td>

      <style jsx>{`
        tr.selected {
          background: #dbeafe;
        }

        .post-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .post-thumbnail {
          width: 48px;
          height: 32px;
          object-fit: cover;
          border-radius: 4px;
        }

        .post-title {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .featured-badge {
          font-size: 0.75rem;
        }

        .post-meta {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .author-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .author-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--avatar-bg, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-size: 0.75rem;
        }

        .author-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .category-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .no-category {
          color: var(--text-muted, #6b7280);
        }

        .status-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
          text-transform: capitalize;
        }

        .date-cell {
          display: flex;
          flex-direction: column;
          font-size: 0.875rem;
        }

        .published-date {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .actions-cell {
          display: flex;
          gap: 0.25rem;
        }

        .actions-cell button,
        .actions-cell :global(a) {
          padding: 0.25rem 0.5rem;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 1rem;
          opacity: 0.7;
          text-decoration: none;
        }

        .actions-cell button:hover,
        .actions-cell :global(a):hover {
          opacity: 1;
        }

        .actions-cell .success:hover {
          background: #d1fae5;
          border-radius: 4px;
        }

        .actions-cell .danger:hover {
          background: #fee2e2;
          border-radius: 4px;
        }
      `}</style>
    </tr>
  );
}

function PostPreviewModal({
  post,
  onClose,
  onAction,
}: {
  post: Post;
  onClose: () => void;
  onAction: (type: ModerationAction['type']) => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Post Preview</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="modal-body">
          {post.featured_image_url && (
            <img src={post.featured_image_url} alt="" className="featured-image" />
          )}

          <div className="post-header">
            <h1>{post.title}</h1>
            <div className="post-meta">
              <div className="author-info">
                <div className="author-avatar">
                  {post.author.avatar_url ? (
                    <img src={post.author.avatar_url} alt="" />
                  ) : (
                    <span>{post.author.display_name.charAt(0)}</span>
                  )}
                </div>
                <span>{post.author.display_name}</span>
              </div>
              <span>·</span>
              <span>{post.reading_time} min read</span>
              {post.category && (
                <>
                  <span>·</span>
                  <span style={{ color: post.category.color }}>{post.category.name}</span>
                </>
              )}
            </div>
          </div>

          {post.excerpt && <p className="excerpt">{post.excerpt}</p>}

          <div className="content-preview" dangerouslySetInnerHTML={{ __html: post.content }} />

          {post.tags.length > 0 && (
            <div className="tags">
              {post.tags.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <Link href={`/admin/posts/${post.id}/edit`} className="edit-btn">
            Edit Post
          </Link>
          {post.status === 'pending' && (
            <>
              <button onClick={() => onAction('reject')} className="reject-btn">
                Reject
              </button>
              <button onClick={() => onAction('publish')} className="approve-btn">
                Approve & Publish
              </button>
            </>
          )}
          {post.status === 'published' && (
            <button onClick={() => onAction('unpublish')}>Unpublish</button>
          )}
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
            padding: 1rem;
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
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
            overflow-y: auto;
            flex: 1;
          }

          .featured-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 12px;
            margin-bottom: 1.5rem;
          }

          .post-header h1 {
            margin: 0 0 0.75rem;
            font-size: 1.75rem;
          }

          .post-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-muted, #6b7280);
            font-size: 0.875rem;
          }

          .author-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .author-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--avatar-bg, #e5e7eb);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .author-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .excerpt {
            font-size: 1.1rem;
            color: var(--text-muted, #6b7280);
            margin: 1rem 0;
            line-height: 1.6;
          }

          .content-preview {
            line-height: 1.7;
            max-height: 300px;
            overflow-y: auto;
            padding: 1rem;
            background: #f9fafb;
            border-radius: 8px;
          }

          .tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 1rem;
          }

          .tag {
            padding: 0.25rem 0.75rem;
            background: #f3f4f6;
            border-radius: 999px;
            font-size: 0.875rem;
            color: var(--text-muted, #6b7280);
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-color, #e5e7eb);
          }

          .modal-actions button,
          .modal-actions :global(a) {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            border: 1px solid var(--border-color, #e5e7eb);
            background: white;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
          }

          .edit-btn {
            background: #f3f4f6 !important;
          }

          .reject-btn {
            border-color: #ef4444 !important;
            color: #991b1b;
          }

          .reject-btn:hover {
            background: #fee2e2;
          }

          .approve-btn {
            background: #10b981 !important;
            border-color: #10b981 !important;
            color: white;
          }
        `}</style>
      </div>
    </div>
  );
}

function ActionModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: ModerationAction;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  const titles: Record<ModerationAction['type'], string> = {
    publish: 'Publish Post',
    unpublish: 'Unpublish Post',
    reject: 'Reject Post',
    archive: 'Archive Post',
    restore: 'Restore Post',
    delete: 'Delete Post',
    feature: 'Feature Post',
    unfeature: 'Unfeature Post',
  };

  const needsReason = ['reject', 'delete'].includes(action.type);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{titles[action.type]}</h2>
        <p>Are you sure you want to {action.type} this post?</p>

        {needsReason && (
          <div className="form-group">
            <label>Reason (visible to author)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={() => {
              onConfirm(reason);
            }}
            className={action.type === 'delete' || action.type === 'reject' ? 'danger' : 'primary'}
          >
            Confirm
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
            z-index: 1001;
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 400px;
            width: 90%;
            padding: 1.5rem;
          }

          h2 {
            margin: 0 0 0.5rem;
          }

          p {
            color: var(--text-muted, #6b7280);
            margin-bottom: 1rem;
          }

          .form-group {
            margin-bottom: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 0.25rem;
            font-weight: 500;
          }

          .form-group textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            resize: vertical;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
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

          .modal-actions .danger {
            background: #ef4444;
            color: white;
            border-color: #ef4444;
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
