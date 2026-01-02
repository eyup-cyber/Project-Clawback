'use client';

/**
 * Audit Log Component
 * Phase 2.11: All actions logged, filters, search, export
 */

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.suspended'
  | 'user.banned'
  | 'user.role_changed'
  | 'post.created'
  | 'post.updated'
  | 'post.published'
  | 'post.unpublished'
  | 'post.deleted'
  | 'comment.created'
  | 'comment.deleted'
  | 'comment.hidden'
  | 'settings.updated'
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  | 'media.uploaded'
  | 'media.deleted'
  | 'report.resolved'
  | 'application.approved'
  | 'application.rejected'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_reset'
  | 'api.key_created'
  | 'api.key_revoked'
  | 'webhook.triggered';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actor: {
    id: string;
    type: 'user' | 'system' | 'api';
    username?: string;
    display_name?: string;
    avatar_url?: string | null;
    ip_address?: string;
    user_agent?: string;
  };
  target?: {
    type: string;
    id: string;
    name?: string;
  };
  changes?: {
    field: string;
    old_value: unknown;
    new_value: unknown;
  }[];
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface AuditFilters {
  search: string;
  action: string;
  actor: string;
  target_type: string;
  date_from: string;
  date_to: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    action: '',
    actor: '',
    target_type: '',
    date_from: '',
    date_to: '',
  });

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.action) params.set('action', filters.action);
      if (filters.actor) params.set('actor', filters.actor);
      if (filters.target_type) params.set('target_type', filters.target_type);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);

      const response = await fetch(`/api/admin/audit?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
        setPagination((p) => ({ ...p, total: data.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({ format });
      if (filters.action) params.set('action', filters.action);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);

      const response = await fetch(`/api/admin/audit/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log.${format}`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const actionCategories = [
    { label: 'All Actions', value: '' },
    { label: '👤 User Actions', value: 'user' },
    { label: '📄 Post Actions', value: 'post' },
    { label: '💬 Comment Actions', value: 'comment' },
    { label: '⚙️ Settings', value: 'settings' },
    { label: '🗂️ Categories', value: 'category' },
    { label: '🖼️ Media', value: 'media' },
    { label: '🔐 Authentication', value: 'auth' },
    { label: '🔗 API & Webhooks', value: 'api' },
  ];

  return (
    <div className="audit-log">
      {/* Header */}
      <div className="header">
        <h1>Audit Log</h1>
        <div className="header-actions">
          <button
            onClick={() => {
              void handleExport('csv');
            }}
            className="export-btn"
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => {
              void handleExport('json');
            }}
            className="export-btn"
          >
            📥 Export JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="search"
          placeholder="Search actions..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="search-input"
        />

        <select
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
        >
          {actionCategories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        <select
          value={filters.target_type}
          onChange={(e) => setFilters((f) => ({ ...f, target_type: e.target.value }))}
        >
          <option value="">All Targets</option>
          <option value="user">Users</option>
          <option value="post">Posts</option>
          <option value="comment">Comments</option>
          <option value="category">Categories</option>
          <option value="media">Media</option>
          <option value="settings">Settings</option>
        </select>

        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
          placeholder="From"
        />

        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
          placeholder="To"
        />

        <button
          className="clear-btn"
          onClick={() =>
            setFilters({
              search: '',
              action: '',
              actor: '',
              target_type: '',
              date_from: '',
              date_to: '',
            })
          }
        >
          Clear
        </button>
      </div>

      {/* Log Table */}
      <div className="table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="loading-cell">
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No audit entries found
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <AuditRow
                  key={entry.id}
                  entry={entry}
                  onViewDetails={() => setSelectedEntry(entry)}
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

      {/* Detail Modal */}
      {selectedEntry && (
        <AuditDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}

      <style jsx>{`
        .audit-log {
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
          gap: 0.5rem;
        }

        .export-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
          cursor: pointer;
        }

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

        select,
        input[type='date'] {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
        }

        .clear-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
          cursor: pointer;
        }

        .table-container {
          overflow-x: auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
        }

        .audit-table th,
        .audit-table :global(td) {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .audit-table th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted, #6b7280);
          background: #f9fafb;
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

function AuditRow({ entry, onViewDetails }: { entry: AuditEntry; onViewDetails: () => void }) {
  const getActionIcon = (action: AuditAction): string => {
    if (action.startsWith('user')) return '👤';
    if (action.startsWith('post')) return '📄';
    if (action.startsWith('comment')) return '💬';
    if (action.startsWith('settings')) return '⚙️';
    if (action.startsWith('category')) return '🗂️';
    if (action.startsWith('media')) return '🖼️';
    if (action.startsWith('auth')) return '🔐';
    if (action.startsWith('api') || action.startsWith('webhook')) return '🔗';
    if (action.startsWith('report')) return '🚨';
    if (action.startsWith('application')) return '📝';
    return '📌';
  };

  const getActionColor = (action: AuditAction): string => {
    if (action.includes('deleted') || action.includes('banned')) return '#ef4444';
    if (action.includes('created') || action.includes('approved')) return '#10b981';
    if (action.includes('updated') || action.includes('published')) return '#3b82f6';
    if (action.includes('suspended') || action.includes('rejected')) return '#f59e0b';
    return '#6b7280';
  };

  const formatAction = (action: AuditAction): string => {
    return action
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, ' '))
      .join(' → ');
  };

  return (
    <tr onClick={onViewDetails} className="audit-row">
      <td className="time-cell">
        <span className="time-relative">
          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
        </span>
        <span className="time-absolute">{new Date(entry.created_at).toLocaleString()}</span>
      </td>
      <td className="actor-cell">
        <div className="actor-info">
          {entry.actor.type === 'user' ? (
            <>
              <div className="actor-avatar">
                {entry.actor.avatar_url ? (
                  <img src={entry.actor.avatar_url} alt="" />
                ) : (
                  <span>{entry.actor.display_name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className="actor-details">
                <span className="actor-name">{entry.actor.display_name}</span>
                <span className="actor-username">@{entry.actor.username}</span>
              </div>
            </>
          ) : entry.actor.type === 'system' ? (
            <div className="actor-system">🤖 System</div>
          ) : (
            <div className="actor-api">🔑 API</div>
          )}
        </div>
      </td>
      <td className="action-cell">
        <span className="action-badge" style={{ color: getActionColor(entry.action) }}>
          {getActionIcon(entry.action)} {formatAction(entry.action)}
        </span>
      </td>
      <td className="target-cell">
        {entry.target ? (
          <span className="target-info">
            {entry.target.type}: {entry.target.name || entry.target.id}
          </span>
        ) : (
          <span className="no-target">—</span>
        )}
      </td>
      <td className="details-cell">
        <button className="view-details">View →</button>
      </td>

      <style jsx>{`
        .audit-row {
          cursor: pointer;
          transition: background 0.2s;
        }

        .audit-row:hover {
          background: #f9fafb;
        }

        .time-cell {
          white-space: nowrap;
        }

        .time-relative {
          display: block;
          font-weight: 500;
        }

        .time-absolute {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .actor-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .actor-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .actor-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .actor-name {
          display: block;
          font-weight: 500;
        }

        .actor-username {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .actor-system,
        .actor-api {
          font-weight: 500;
          color: var(--text-muted, #6b7280);
        }

        .action-badge {
          font-weight: 500;
        }

        .target-info {
          font-size: 0.875rem;
        }

        .no-target {
          color: var(--text-muted, #6b7280);
        }

        .view-details {
          padding: 0.25rem 0.75rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .view-details:hover {
          background: var(--hover-bg, #f3f4f6);
        }
      `}</style>
    </tr>
  );
}

function AuditDetailModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Audit Entry Details</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Basic Info */}
          <div className="section">
            <h4>Event</h4>
            <dl>
              <div>
                <dt>Action</dt>
                <dd>{entry.action}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{new Date(entry.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Entry ID</dt>
                <dd className="monospace">{entry.id}</dd>
              </div>
            </dl>
          </div>

          {/* Actor */}
          <div className="section">
            <h4>Actor</h4>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{entry.actor.type}</dd>
              </div>
              {entry.actor.username && (
                <div>
                  <dt>User</dt>
                  <dd>
                    {entry.actor.display_name} (@{entry.actor.username})
                  </dd>
                </div>
              )}
              {entry.actor.ip_address && (
                <div>
                  <dt>IP Address</dt>
                  <dd className="monospace">{entry.actor.ip_address}</dd>
                </div>
              )}
              {entry.actor.user_agent && (
                <div>
                  <dt>User Agent</dt>
                  <dd className="user-agent">{entry.actor.user_agent}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Target */}
          {entry.target && (
            <div className="section">
              <h4>Target</h4>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{entry.target.type}</dd>
                </div>
                <div>
                  <dt>ID</dt>
                  <dd className="monospace">{entry.target.id}</dd>
                </div>
                {entry.target.name && (
                  <div>
                    <dt>Name</dt>
                    <dd>{entry.target.name}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Changes */}
          {entry.changes && entry.changes.length > 0 && (
            <div className="section">
              <h4>Changes</h4>
              <div className="changes-list">
                {entry.changes.map((change, i) => (
                  <div key={i} className="change-item">
                    <span className="change-field">{change.field}</span>
                    <div className="change-values">
                      <span className="old-value">
                        {JSON.stringify(change.old_value) || '(empty)'}
                      </span>
                      <span className="arrow">→</span>
                      <span className="new-value">
                        {JSON.stringify(change.new_value) || '(empty)'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div className="section">
              <h4>Additional Metadata</h4>
              <pre className="metadata-json">{JSON.stringify(entry.metadata, null, 2)}</pre>
            </div>
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
            max-width: 600px;
            width: 100%;
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

          .section {
            margin-bottom: 1.5rem;
          }

          .section h4 {
            margin: 0 0 0.75rem;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--text-muted, #6b7280);
          }

          dl {
            margin: 0;
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
            text-align: right;
          }

          .monospace {
            font-family: monospace;
            font-size: 0.875rem;
          }

          .user-agent {
            font-size: 0.75rem;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .changes-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .change-item {
            padding: 0.75rem;
            background: #f9fafb;
            border-radius: 8px;
          }

          .change-field {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }

          .change-values {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-family: monospace;
            font-size: 0.875rem;
          }

          .old-value {
            color: #ef4444;
            background: #fee2e2;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
          }

          .new-value {
            color: #10b981;
            background: #d1fae5;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
          }

          .arrow {
            color: var(--text-muted, #6b7280);
          }

          .metadata-json {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.875rem;
            margin: 0;
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
