'use client';

/**
 * Comment Moderation Component
 * Phase 2.5: Table, hide/delete, bulk actions
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export type CommentStatus = 'visible' | 'hidden' | 'deleted' | 'spam';

export interface Comment {
  id: string;
  content: string;
  status: CommentStatus;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  post: {
    id: string;
    title: string;
    slug: string;
  };
  parent_id: string | null;
  reply_count: number;
  reaction_count: number;
  report_count: number;
  created_at: string;
  updated_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
}

interface CommentFilters {
  status: CommentStatus | 'all' | 'reported';
  search: string;
  author: string;
  post: string;
  sort: 'created_at' | 'report_count' | 'reaction_count';
  order: 'asc' | 'desc';
}

type ModerateAction = 'hide' | 'unhide' | 'delete' | 'spam' | 'approve';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommentModeration() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [showActionModal, setShowActionModal] = useState<{
    action: ModerateAction;
    commentId: string;
  } | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [filters, setFilters] = useState<CommentFilters>({
    status: 'all',
    search: '',
    author: '',
    post: '',
    sort: 'created_at',
    order: 'desc',
  });
  const [stats, setStats] = useState({
    total: 0,
    visible: 0,
    hidden: 0,
    spam: 0,
    reported: 0,
  });

  const fetchComments = useCallback(async () => {
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
      if (filters.author) params.set('author', filters.author);
      if (filters.post) params.set('post', filters.post);

      const response = await fetch(`/api/admin/comments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
        setPagination((p) => ({ ...p, total: data.total || 0 }));
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleAction = async (action: ModerateAction, commentId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      if (response.ok) {
        void fetchComments();
        setShowActionModal(null);
      }
    } catch (error) {
      console.error('Failed to moderate comment:', error);
    }
  };

  const handleBulkAction = async (action: ModerateAction) => {
    if (selectedComments.size === 0) return;

    try {
      const response = await fetch('/api/admin/comments/bulk-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          commentIds: Array.from(selectedComments),
        }),
      });

      if (response.ok) {
        void fetchComments();
        setSelectedComments(new Set());
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
  };

  const _toggleSelectAll = () => {
    if (selectedComments.size === comments.length) {
      setSelectedComments(new Set());
    } else {
      setSelectedComments(new Set(comments.map((c) => c.id)));
    }
  };

  const toggleSelect = (commentId: string) => {
    const newSelected = new Set(selectedComments);
    if (newSelected.has(commentId)) {
      newSelected.delete(commentId);
    } else {
      newSelected.add(commentId);
    }
    setSelectedComments(newSelected);
  };

  return (
    <div className="comment-moderation">
      {/* Header */}
      <div className="header">
        <h1>Comment Moderation</h1>
        <div className="header-stats">
          <span>{pagination.total.toLocaleString()} comments</span>
        </div>
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
          className={`stat-btn ${filters.status === 'visible' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'visible' }))}
        >
          Visible ({stats.visible})
        </button>
        <button
          className={`stat-btn ${filters.status === 'hidden' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'hidden' }))}
        >
          Hidden ({stats.hidden})
        </button>
        <button
          className={`stat-btn ${filters.status === 'spam' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'spam' }))}
        >
          Spam ({stats.spam})
        </button>
        <button
          className={`stat-btn warning ${filters.status === 'reported' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'reported' }))}
        >
          Reported ({stats.reported})
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="search"
          placeholder="Search comments..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="search-input"
        />

        <select
          value={`${filters.sort}-${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split('-') as [
              CommentFilters['sort'],
              CommentFilters['order']
            ];
            setFilters((f) => ({ ...f, sort, order }));
          }}
        >
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="report_count-desc">Most Reported</option>
          <option value="reaction_count-desc">Most Reactions</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedComments.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedComments.size} selected</span>
          <button onClick={() => void handleBulkAction('hide')}>Hide</button>
          <button onClick={() => void handleBulkAction('unhide')}>Unhide</button>
          <button onClick={() => void handleBulkAction('spam')}>Mark as Spam</button>
          <button onClick={() => void handleBulkAction('delete')} className="danger">
            Delete
          </button>
          <button onClick={() => setSelectedComments(new Set())}>Clear</button>
        </div>
      )}

      {/* Comments List */}
      <div className="comments-list">
        {loading ? (
          <div className="loading">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="empty-state">No comments found</div>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              isSelected={selectedComments.has(comment.id)}
              onSelect={() => toggleSelect(comment.id)}
              onAction={(action) => setShowActionModal({ action, commentId: comment.id })}
            />
          ))
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

      {/* Action Modal */}
      {showActionModal && (
        <ActionModal
          action={showActionModal.action}
          onConfirm={(reason) =>
            void handleAction(showActionModal.action, showActionModal.commentId, reason)
          }
          onCancel={() => setShowActionModal(null)}
        />
      )}

      <style jsx>{`
        .comment-moderation {
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

        .stat-btn.warning {
          border-color: #f59e0b;
          color: #92400e;
        }

        .stat-btn.warning.active {
          background: #f59e0b;
          color: white;
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

        .bulk-actions button.danger {
          border-color: #ef4444;
          color: #991b1b;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted, #6b7280);
          background: white;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CommentCard({
  comment,
  isSelected,
  onSelect,
  onAction,
}: {
  comment: Comment;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: ModerateAction) => void;
}) {
  const statusColors: Record<CommentStatus, { bg: string; text: string }> = {
    visible: { bg: '#d1fae5', text: '#065f46' },
    hidden: { bg: '#fef3c7', text: '#92400e' },
    deleted: { bg: '#fee2e2', text: '#991b1b' },
    spam: { bg: '#f3f4f6', text: '#6b7280' },
  };

  const colors = statusColors[comment.status];

  return (
    <div className={`comment-card ${isSelected ? 'selected' : ''}`}>
      <div className="card-header">
        <input type="checkbox" checked={isSelected} onChange={onSelect} />
        <div className="author-info">
          <div className="avatar">
            {comment.author.avatar_url ? (
              <img src={comment.author.avatar_url} alt="" />
            ) : (
              <span>{comment.author.display_name.charAt(0)}</span>
            )}
          </div>
          <div>
            <span className="author-name">{comment.author.display_name}</span>
            <span className="author-username">@{comment.author.username}</span>
          </div>
        </div>
        <div className="card-meta">
          <span className="status-badge" style={{ backgroundColor: colors.bg, color: colors.text }}>
            {comment.status}
          </span>
          <span className="date">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="comment-content">
        <p>{comment.content}</p>
        {comment.report_count > 0 && (
          <div className="report-badge">🚩 {comment.report_count} reports</div>
        )}
      </div>

      <div className="card-footer">
        <Link href={`/posts/${comment.post.slug}`} className="post-link" target="_blank">
          On: {comment.post.title}
        </Link>
        <div className="stats">
          <span>❤️ {comment.reaction_count}</span>
          <span>💬 {comment.reply_count}</span>
        </div>
        <div className="actions">
          {comment.status === 'visible' ? (
            <button onClick={() => onAction('hide')} title="Hide">
              🙈
            </button>
          ) : comment.status === 'hidden' ? (
            <button onClick={() => onAction('unhide')} title="Unhide">
              👁️
            </button>
          ) : null}
          {comment.status !== 'spam' && (
            <button onClick={() => onAction('spam')} title="Mark as Spam">
              🗑️
            </button>
          )}
          {comment.status === 'spam' && (
            <button onClick={() => onAction('approve')} title="Approve">
              ✓
            </button>
          )}
          <button onClick={() => onAction('delete')} title="Delete" className="danger">
            ✕
          </button>
        </div>
      </div>

      <style jsx>{`
        .comment-card {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: box-shadow 0.2s;
        }

        .comment-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .comment-card.selected {
          background: #dbeafe;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .author-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--avatar-bg, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .author-name {
          font-weight: 500;
          display: block;
        }

        .author-username {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .card-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
          text-transform: capitalize;
        }

        .date {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .comment-content {
          margin-bottom: 0.75rem;
        }

        .comment-content p {
          margin: 0;
          line-height: 1.5;
        }

        .report-badge {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .card-footer {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color, #e5e7eb);
        }

        .post-link {
          font-size: 0.75rem;
          color: var(--primary-color, #3b82f6);
          text-decoration: none;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stats {
          display: flex;
          gap: 0.75rem;
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
          transition: opacity 0.2s;
        }

        .actions button:hover {
          opacity: 1;
        }

        .actions button.danger:hover {
          background: #fee2e2;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

function ActionModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: ModerateAction;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  const titles: Record<ModerateAction, string> = {
    hide: 'Hide Comment',
    unhide: 'Unhide Comment',
    delete: 'Delete Comment',
    spam: 'Mark as Spam',
    approve: 'Approve Comment',
  };

  const needsReason = ['hide', 'delete'].includes(action);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{titles[action]}</h2>
        <p>Are you sure you want to {action} this comment?</p>

        {needsReason && (
          <div className="form-group">
            <label>Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              rows={2}
            />
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={() => onConfirm(reason || undefined)}
            className={action === 'delete' ? 'danger' : 'primary'}
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
            z-index: 1000;
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
          }

          .form-group textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
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
