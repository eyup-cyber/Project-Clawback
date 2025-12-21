'use client';

/**
 * User Management Component
 * Phase 2.2: Table, filters, detail view, role changes, suspend/ban/reactivate
 */

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'reader' | 'contributor' | 'editor' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  bio: string | null;
  website_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  post_count: number;
  comment_count: number;
  follower_count: number;
  following_count: number;
  is_verified: boolean;
  badges: string[];
  suspension_reason?: string;
  suspension_ends_at?: string;
  ban_reason?: string;
}

export interface UserFilters {
  search: string;
  role: UserRole | 'all';
  status: UserStatus | 'all';
  sort: 'created_at' | 'last_sign_in_at' | 'post_count' | 'display_name';
  order: 'asc' | 'desc';
}

interface UserAction {
  type: 'change_role' | 'suspend' | 'unsuspend' | 'ban' | 'unban' | 'delete' | 'verify' | 'unverify';
  userId: string;
  payload?: Record<string, unknown>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<UserAction | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    sort: 'created_at',
    order: 'desc',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sort: filters.sort,
        order: filters.order,
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.role !== 'all') params.set('role', filters.role);
      if (filters.status !== 'all') params.set('status', filters.status);

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination((p) => ({ ...p, total: data.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleUserAction = async (action: UserAction) => {
    try {
      const response = await fetch(`/api/admin/users/${action.userId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.type, ...action.payload }),
      });

      if (response.ok) {
        void fetchUsers();
        setShowActionModal(null);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const handleBulkAction = async (actionType: string) => {
    if (selectedUsers.size === 0) return;

    try {
      const response = await fetch('/api/admin/users/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          userIds: Array.from(selectedUsers),
        }),
      });

      if (response.ok) {
        void fetchUsers();
        setSelectedUsers(new Set());
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  return (
    <div className="user-management">
      {/* Header */}
      <div className="header">
        <h1>User Management</h1>
        <div className="header-stats">
          <span>{pagination.total.toLocaleString()} users</span>
        </div>
      </div>

      {/* Filters */}
      <UserFiltersBar filters={filters} onChange={setFilters} />

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedUsers.size} selected</span>
          <button onClick={() => void handleBulkAction('suspend')}>Suspend Selected</button>
          <button onClick={() => void handleBulkAction('unsuspend')}>Unsuspend Selected</button>
          <button onClick={() => setSelectedUsers(new Set())}>Clear Selection</button>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Posts</th>
              <th>Joined</th>
              <th>Last Active</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelected={selectedUsers.has(user.id)}
                  onSelect={() => toggleSelect(user.id)}
                  onView={() => {
                    setSelectedUser(user);
                    setShowDetailModal(true);
                  }}
                  onAction={(type, payload) =>
                    setShowActionModal({ type, userId: user.id, payload })
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        onChange={(page) => setPagination((p) => ({ ...p, page }))}
      />

      {/* Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
          onAction={(type, payload) => setShowActionModal({ type, userId: selectedUser.id, payload })}
        />
      )}

      {/* Action Confirmation Modal */}
      {showActionModal && (
        <ActionConfirmModal
          action={showActionModal}
          onConfirm={(payload) => void handleUserAction({ ...showActionModal, payload })}
          onCancel={() => setShowActionModal(null)}
        />
      )}

      <style jsx>{`
        .user-management {
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

        .header-stats {
          color: var(--text-muted, #6b7280);
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: #dbeafe;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .bulk-actions button {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid var(--border-color, #e5e7eb);
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .bulk-actions button:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .table-container {
          overflow-x: auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
        }

        .users-table th,
        .users-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .users-table th {
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

function UserFiltersBar({
  filters,
  onChange,
}: {
  filters: UserFilters;
  onChange: (filters: UserFilters) => void;
}) {
  return (
    <div className="filters-bar">
      <input
        type="search"
        placeholder="Search users..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="search-input"
      />

      <select
        value={filters.role}
        onChange={(e) => onChange({ ...filters, role: e.target.value as UserFilters['role'] })}
      >
        <option value="all">All Roles</option>
        <option value="reader">Reader</option>
        <option value="contributor">Contributor</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as UserFilters['status'] })}
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="banned">Banned</option>
        <option value="pending">Pending</option>
      </select>

      <select
        value={`${filters.sort}-${filters.order}`}
        onChange={(e) => {
          const [sort, order] = e.target.value.split('-') as [UserFilters['sort'], UserFilters['order']];
          onChange({ ...filters, sort, order });
        }}
      >
        <option value="created_at-desc">Newest First</option>
        <option value="created_at-asc">Oldest First</option>
        <option value="last_sign_in_at-desc">Recently Active</option>
        <option value="post_count-desc">Most Posts</option>
        <option value="display_name-asc">Name A-Z</option>
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
          font-size: 0.875rem;
        }

        select {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
          font-size: 0.875rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function UserRow({
  user,
  isSelected,
  onSelect,
  onView,
  onAction,
}: {
  user: User;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onAction: (type: UserAction['type'], payload?: Record<string, unknown>) => void;
}) {
  const roleColors: Record<UserRole, string> = {
    reader: '#6b7280',
    contributor: '#3b82f6',
    editor: '#8b5cf6',
    admin: '#ef4444',
  };

  const statusColors: Record<UserStatus, string> = {
    active: '#10b981',
    suspended: '#f59e0b',
    banned: '#ef4444',
    pending: '#6b7280',
  };

  return (
    <tr className={isSelected ? 'selected' : ''}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          aria-label={`Select ${user.display_name}`}
        />
      </td>
      <td>
        <div className="user-cell">
          <div className="user-avatar">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" />
            ) : (
              <span>{user.display_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="user-info">
            <div className="user-name">
              {user.display_name}
              {user.is_verified && <span className="verified-badge">✓</span>}
            </div>
            <div className="user-email">@{user.username}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="role-badge" style={{ color: roleColors[user.role] }}>
          {user.role}
        </span>
      </td>
      <td>
        <span className="status-badge" style={{ color: statusColors[user.status] }}>
          {user.status}
        </span>
      </td>
      <td>{user.post_count}</td>
      <td>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</td>
      <td>
        {user.last_sign_in_at
          ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
          : 'Never'}
      </td>
      <td>
        <div className="actions-cell">
          <button onClick={onView} title="View Details">
            👁️
          </button>
          <button onClick={() => onAction('change_role')} title="Change Role">
            🔧
          </button>
          {user.status === 'active' ? (
            <button onClick={() => onAction('suspend')} title="Suspend">
              ⏸️
            </button>
          ) : user.status === 'suspended' ? (
            <button onClick={() => onAction('unsuspend')} title="Unsuspend">
              ▶️
            </button>
          ) : null}
          {user.status !== 'banned' ? (
            <button onClick={() => onAction('ban')} title="Ban" className="danger">
              🚫
            </button>
          ) : (
            <button onClick={() => onAction('unban')} title="Unban">
              ✓
            </button>
          )}
        </div>
      </td>

      <style jsx>{`
        tr.selected {
          background: #dbeafe;
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--avatar-bg, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-avatar span {
          font-weight: 600;
          color: var(--text-muted, #6b7280);
        }

        .user-name {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .verified-badge {
          color: #3b82f6;
          font-size: 0.875rem;
        }

        .user-email {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .role-badge,
        .status-badge {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .actions-cell {
          display: flex;
          gap: 0.25rem;
        }

        .actions-cell button {
          padding: 0.25rem 0.5rem;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 1rem;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .actions-cell button:hover {
          opacity: 1;
        }

        .actions-cell button.danger:hover {
          background: #fee2e2;
          border-radius: 4px;
        }
      `}</style>
    </tr>
  );
}

function UserDetailModal({
  user,
  onClose,
  onAction,
}: {
  user: User;
  onClose: () => void;
  onAction: (type: UserAction['type'], payload?: Record<string, unknown>) => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>User Details</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="user-profile">
          <div className="avatar-large">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.display_name} />
            ) : (
              <span>{user.display_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="profile-info">
            <h3>
              {user.display_name}
              {user.is_verified && <span className="verified">✓ Verified</span>}
            </h3>
            <p className="username">@{user.username}</p>
            <p className="email">{user.email}</p>
          </div>
        </div>

        {user.bio && <p className="bio">{user.bio}</p>}

        <div className="stats-grid">
          <div className="stat">
            <span className="stat-value">{user.post_count}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.comment_count}</span>
            <span className="stat-label">Comments</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.follower_count}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.following_count}</span>
            <span className="stat-label">Following</span>
          </div>
        </div>

        <div className="detail-section">
          <h4>Account Details</h4>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{user.status}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt>Last Active</dt>
              <dd>
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                  : 'Never'}
              </dd>
            </div>
          </dl>
        </div>

        {user.badges.length > 0 && (
          <div className="badges-section">
            <h4>Badges</h4>
            <div className="badges-list">
              {user.badges.map((badge) => (
                <span key={badge} className="badge">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="actions-section">
          <h4>Actions</h4>
          <div className="action-buttons">
            <button onClick={() => onAction('change_role')}>Change Role</button>
            {user.is_verified ? (
              <button onClick={() => onAction('unverify')}>Remove Verification</button>
            ) : (
              <button onClick={() => onAction('verify')}>Verify User</button>
            )}
            {user.status === 'active' && (
              <button onClick={() => onAction('suspend')} className="warning">
                Suspend User
              </button>
            )}
            {user.status === 'suspended' && (
              <button onClick={() => onAction('unsuspend')}>Unsuspend User</button>
            )}
            {user.status !== 'banned' && (
              <button onClick={() => onAction('ban')} className="danger">
                Ban User
              </button>
            )}
            {user.status === 'banned' && (
              <button onClick={() => onAction('unban')}>Unban User</button>
            )}
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
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 1.5rem;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .modal-header h2 {
            margin: 0;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-muted, #6b7280);
          }

          .user-profile {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .avatar-large {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: var(--avatar-bg, #e5e7eb);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            font-size: 2rem;
          }

          .avatar-large img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .profile-info h3 {
            margin: 0 0 0.25rem;
          }

          .verified {
            color: #3b82f6;
            font-size: 0.75rem;
            margin-left: 0.5rem;
          }

          .username,
          .email {
            margin: 0;
            color: var(--text-muted, #6b7280);
            font-size: 0.875rem;
          }

          .bio {
            color: var(--text-muted, #6b7280);
            margin-bottom: 1rem;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
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

          .detail-section,
          .badges-section,
          .actions-section {
            margin-bottom: 1.5rem;
          }

          .detail-section h4,
          .badges-section h4,
          .actions-section h4 {
            margin: 0 0 0.75rem;
            font-size: 0.875rem;
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
          }

          .badges-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .badge {
            padding: 0.25rem 0.75rem;
            background: #dbeafe;
            color: #3b82f6;
            border-radius: 999px;
            font-size: 0.75rem;
          }

          .action-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .action-buttons button {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            background: white;
            cursor: pointer;
            font-size: 0.875rem;
          }

          .action-buttons button:hover {
            background: var(--hover-bg, #f3f4f6);
          }

          .action-buttons button.warning {
            border-color: #f59e0b;
            color: #92400e;
          }

          .action-buttons button.warning:hover {
            background: #fef3c7;
          }

          .action-buttons button.danger {
            border-color: #ef4444;
            color: #991b1b;
          }

          .action-buttons button.danger:hover {
            background: #fee2e2;
          }
        `}</style>
      </div>
    </div>
  );
}

function ActionConfirmModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: UserAction;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7');
  const [newRole, setNewRole] = useState<UserRole>('reader');

  const getTitle = () => {
    const titles: Record<UserAction['type'], string> = {
      change_role: 'Change User Role',
      suspend: 'Suspend User',
      unsuspend: 'Unsuspend User',
      ban: 'Ban User',
      unban: 'Unban User',
      delete: 'Delete User',
      verify: 'Verify User',
      unverify: 'Remove Verification',
    };
    return titles[action.type];
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{getTitle()}</h2>

        {action.type === 'change_role' && (
          <div className="form-group">
            <label>New Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
              <option value="reader">Reader</option>
              <option value="contributor">Contributor</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}

        {(action.type === 'suspend' || action.type === 'ban') && (
          <>
            <div className="form-group">
              <label>Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            </div>
            {action.type === 'suspend' && (
              <div className="form-group">
                <label>Duration (days)</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={() => {
              onConfirm({ reason, duration, newRole });
            }}
            className={action.type === 'ban' || action.type === 'delete' ? 'danger' : 'primary'}
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
            margin: 0 0 1rem;
          }

          .form-group {
            margin-bottom: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 0.25rem;
            font-weight: 500;
          }

          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
          }

          .modal-actions {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
            margin-top: 1.5rem;
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

          .modal-actions button.danger {
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

  if (totalPages <= 1) return null;

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

        button:not(:disabled):hover {
          background: var(--hover-bg, #f3f4f6);
        }

        span {
          color: var(--text-muted, #6b7280);
        }
      `}</style>
    </div>
  );
}
