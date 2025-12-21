'use client';

/**
 * Content Reports Queue
 * Phase 2.6: Queue, review, resolve, appeal handling
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'appealed';
export type ReportType = 'post' | 'comment' | 'user';
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'misinformation'
  | 'copyright'
  | 'inappropriate'
  | 'other';

export interface Report {
  id: string;
  type: ReportType;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reporter: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  reported_content: {
    id: string;
    type: ReportType;
    title?: string;
    content?: string;
    author?: {
      id: string;
      username: string;
      display_name: string;
    };
    url?: string;
  };
  resolution: {
    action?: string;
    notes?: string;
    resolved_by?: {
      id: string;
      display_name: string;
    };
    resolved_at?: string;
  } | null;
  appeal?: {
    reason: string;
    submitted_at: string;
    status: 'pending' | 'approved' | 'rejected';
  };
  similar_reports_count: number;
  created_at: string;
  updated_at: string;
}

interface ReportFilters {
  status: ReportStatus | 'all';
  type: ReportType | 'all';
  reason: ReportReason | 'all';
  priority: 'all' | 'high' | 'urgent';
  sort: 'created_at' | 'priority' | 'similar_reports_count';
  order: 'asc' | 'desc';
}

type ResolveAction = 'remove_content' | 'warn_user' | 'suspend_user' | 'ban_user' | 'dismiss' | 'no_action';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContentReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState<ReportFilters>({
    status: 'pending',
    type: 'all',
    reason: 'all',
    priority: 'all',
    sort: 'created_at',
    order: 'desc',
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    under_review: 0,
    resolved: 0,
    appealed: 0,
    urgent: 0,
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sort: filters.sort,
        order: filters.order,
      });

      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.reason !== 'all') params.set('reason', filters.reason);
      if (filters.priority !== 'all') params.set('priority', filters.priority);

      const response = await fetch(`/api/admin/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
        setPagination((p) => ({ ...p, total: data.total || 0 }));
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleResolve = async (
    reportId: string,
    action: ResolveAction,
    notes: string
  ) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      if (response.ok) {
        void fetchReports();
        setShowResolveModal(false);
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Failed to resolve report:', error);
    }
  };

  const handleAppealDecision = async (
    reportId: string,
    approved: boolean,
    notes: string
  ) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, notes }),
      });

      if (response.ok) {
        void fetchReports();
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Failed to process appeal:', error);
    }
  };

  const handleClaimReport = async (reportId: string) => {
    try {
      await fetch(`/api/admin/reports/${reportId}/claim`, { method: 'POST' });
      void fetchReports();
    } catch (error) {
      console.error('Failed to claim report:', error);
    }
  };

  return (
    <div className="content-reports">
      {/* Header */}
      <div className="header">
        <h1>Content Reports</h1>
        {stats.urgent > 0 && (
          <div className="urgent-badge">🚨 {stats.urgent} urgent reports</div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <button
          className={`stat-btn ${filters.status === 'pending' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'pending' }))}
        >
          Pending ({stats.pending})
        </button>
        <button
          className={`stat-btn ${filters.status === 'under_review' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'under_review' }))}
        >
          Under Review ({stats.under_review})
        </button>
        <button
          className={`stat-btn ${filters.status === 'appealed' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'appealed' }))}
        >
          Appeals ({stats.appealed})
        </button>
        <button
          className={`stat-btn ${filters.status === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'resolved' }))}
        >
          Resolved ({stats.resolved})
        </button>
        <button
          className={`stat-btn ${filters.status === 'all' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'all' }))}
        >
          All ({stats.total})
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as ReportFilters['type'] }))}
        >
          <option value="all">All Types</option>
          <option value="post">Posts</option>
          <option value="comment">Comments</option>
          <option value="user">Users</option>
        </select>

        <select
          value={filters.reason}
          onChange={(e) =>
            setFilters((f) => ({ ...f, reason: e.target.value as ReportFilters['reason'] }))
          }
        >
          <option value="all">All Reasons</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="hate_speech">Hate Speech</option>
          <option value="misinformation">Misinformation</option>
          <option value="copyright">Copyright</option>
          <option value="inappropriate">Inappropriate</option>
          <option value="other">Other</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) =>
            setFilters((f) => ({ ...f, priority: e.target.value as ReportFilters['priority'] }))
          }
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent Only</option>
          <option value="high">High & Urgent</option>
        </select>

        <select
          value={`${filters.sort}-${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split('-') as [
              ReportFilters['sort'],
              ReportFilters['order']
            ];
            setFilters((f) => ({ ...f, sort, order }));
          }}
        >
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="priority-desc">Highest Priority</option>
          <option value="similar_reports_count-desc">Most Similar Reports</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="reports-list">
        {loading ? (
          <div className="loading">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <p>No reports found</p>
            {filters.status === 'pending' && (
              <p className="empty-hint">All caught up! 🎉</p>
            )}
          </div>
        ) : (
          reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onSelect={() => {
                setSelectedReport(report);
                setShowResolveModal(true);
              }}
              onClaim={() => void handleClaimReport(report.id)}
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

      {/* Resolve Modal */}
      {showResolveModal && selectedReport && (
        <ResolveModal
          report={selectedReport}
          onClose={() => {
            setShowResolveModal(false);
            setSelectedReport(null);
          }}
          onResolve={(reportId, action, notes) => void handleResolve(reportId, action, notes)}
          onAppealDecision={(reportId, approved, notes) => void handleAppealDecision(reportId, approved, notes)}
        />
      )}

      <style jsx>{`
        .content-reports {
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

        .urgent-badge {
          padding: 0.5rem 1rem;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 8px;
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

        .filters-bar {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        select {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted, #6b7280);
          background: white;
          border-radius: 12px;
        }

        .empty-hint {
          font-size: 1.5rem;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ReportCard({
  report,
  onSelect,
  onClaim,
}: {
  report: Report;
  onSelect: () => void;
  onClaim: () => void;
}) {
  const priorityColors = {
    low: { bg: '#f3f4f6', text: '#6b7280' },
    medium: { bg: '#dbeafe', text: '#1e40af' },
    high: { bg: '#fef3c7', text: '#92400e' },
    urgent: { bg: '#fee2e2', text: '#991b1b' },
  };

  const statusColors: Record<ReportStatus, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    under_review: { bg: '#dbeafe', text: '#1e40af' },
    resolved: { bg: '#d1fae5', text: '#065f46' },
    dismissed: { bg: '#f3f4f6', text: '#6b7280' },
    appealed: { bg: '#fce7f3', text: '#9d174d' },
  };

  const reasonLabels: Record<ReportReason, string> = {
    spam: 'Spam',
    harassment: 'Harassment',
    hate_speech: 'Hate Speech',
    misinformation: 'Misinformation',
    copyright: 'Copyright',
    inappropriate: 'Inappropriate',
    other: 'Other',
  };

  const typeIcons: Record<ReportType, string> = {
    post: '📄',
    comment: '💬',
    user: '👤',
  };

  const pColors = priorityColors[report.priority];
  const sColors = statusColors[report.status];

  return (
    <div className="report-card" onClick={onSelect}>
      <div className="card-header">
        <div className="header-left">
          <span
            className="priority-badge"
            style={{ backgroundColor: pColors.bg, color: pColors.text }}
          >
            {report.priority}
          </span>
          <span
            className="status-badge"
            style={{ backgroundColor: sColors.bg, color: sColors.text }}
          >
            {report.status.replace('_', ' ')}
          </span>
          <span className="type-badge">
            {typeIcons[report.type]} {report.type}
          </span>
        </div>
        <div className="header-right">
          <span className="date">
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="card-body">
        <div className="reason-row">
          <span className="reason-label">{reasonLabels[report.reason]}</span>
          {report.similar_reports_count > 0 && (
            <span className="similar-badge">+{report.similar_reports_count} similar</span>
          )}
        </div>

        <div className="content-preview">
          {report.reported_content.title && (
            <p className="content-title">{report.reported_content.title}</p>
          )}
          {report.reported_content.content && (
            <p className="content-text">{report.reported_content.content.slice(0, 150)}...</p>
          )}
          {report.reported_content.author && (
            <p className="content-author">By @{report.reported_content.author.username}</p>
          )}
        </div>

        {report.description && (
          <div className="report-description">
            <span className="description-label">Reporter&apos;s notes:</span>
            <p>{report.description}</p>
          </div>
        )}

        {report.appeal && (
          <div className="appeal-banner">
            🔔 Appeal submitted: {report.appeal.reason.slice(0, 100)}...
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="reporter-info">
          Reported by {report.reporter.display_name}
        </div>
        {report.status === 'pending' && (
          <button
            className="claim-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClaim();
            }}
          >
            Claim
          </button>
        )}
        <button className="review-btn">Review →</button>
      </div>

      <style jsx>{`
        .report-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: box-shadow 0.2s, transform 0.2s;
        }

        .report-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .header-left {
          display: flex;
          gap: 0.5rem;
        }

        .priority-badge,
        .status-badge,
        .type-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          text-transform: capitalize;
        }

        .type-badge {
          background: #f3f4f6;
          color: #6b7280;
        }

        .date {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .reason-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .reason-label {
          font-weight: 600;
        }

        .similar-badge {
          padding: 0.125rem 0.5rem;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 999px;
          font-size: 0.75rem;
        }

        .content-preview {
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 0.75rem;
        }

        .content-title {
          margin: 0 0 0.25rem;
          font-weight: 500;
        }

        .content-text {
          margin: 0;
          color: var(--text-muted, #6b7280);
          font-size: 0.875rem;
        }

        .content-author {
          margin: 0.5rem 0 0;
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .report-description {
          margin-bottom: 0.75rem;
        }

        .description-label {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .report-description p {
          margin: 0.25rem 0 0;
          font-style: italic;
        }

        .appeal-banner {
          padding: 0.5rem 0.75rem;
          background: #fce7f3;
          color: #9d174d;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .card-footer {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color, #e5e7eb);
        }

        .reporter-info {
          flex: 1;
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .claim-btn,
        .review-btn {
          padding: 0.375rem 0.75rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .claim-btn:hover {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1e40af;
        }

        .review-btn {
          background: var(--primary-color, #3b82f6);
          color: white;
          border-color: var(--primary-color, #3b82f6);
        }
      `}</style>
    </div>
  );
}

function ResolveModal({
  report,
  onClose,
  onResolve,
  onAppealDecision,
}: {
  report: Report;
  onClose: () => void;
  onResolve: (id: string, action: ResolveAction, notes: string) => void;
  onAppealDecision: (id: string, approved: boolean, notes: string) => void;
}) {
  const [action, setAction] = useState<ResolveAction>('no_action');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAppeal = report.status === 'appealed' && report.appeal?.status === 'pending';

  const handleSubmit = async () => {
    setSubmitting(true);
    if (isAppeal) {
      await onAppealDecision(report.id, action === 'dismiss', notes);
    } else {
      await onResolve(report.id, action, notes);
    }
    setSubmitting(false);
  };

  const actionLabels: Record<ResolveAction, string> = {
    remove_content: 'Remove Content',
    warn_user: 'Warn User',
    suspend_user: 'Suspend User',
    ban_user: 'Ban User',
    dismiss: 'Dismiss Report',
    no_action: 'No Action Needed',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isAppeal ? 'Review Appeal' : 'Resolve Report'}</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Report Details */}
          <div className="section">
            <h4>Reported Content</h4>
            <div className="content-box">
              {report.reported_content.title && <p className="title">{report.reported_content.title}</p>}
              {report.reported_content.content && (
                <p className="content">{report.reported_content.content}</p>
              )}
              {report.reported_content.author && (
                <p className="author">By @{report.reported_content.author.username}</p>
              )}
              {report.reported_content.url && (
                <Link
                  href={report.reported_content.url}
                  target="_blank"
                  className="view-link"
                >
                  View Original →
                </Link>
              )}
            </div>
          </div>

          {/* Report Reason */}
          <div className="section">
            <h4>Report Details</h4>
            <p>
              <strong>Reason:</strong> {report.reason.replace('_', ' ')}
            </p>
            <p>
              <strong>Reporter:</strong> {report.reporter.display_name} (@{report.reporter.username})
            </p>
            {report.description && (
              <p className="description">{report.description}</p>
            )}
          </div>

          {/* Appeal Info */}
          {isAppeal && report.appeal && (
            <div className="section appeal-section">
              <h4>Appeal</h4>
              <p>{report.appeal.reason}</p>
              <p className="appeal-date">
                Submitted {formatDistanceToNow(new Date(report.appeal.submitted_at), { addSuffix: true })}
              </p>
            </div>
          )}

          {/* Previous Resolution */}
          {report.resolution && (
            <div className="section resolution-section">
              <h4>Previous Resolution</h4>
              <p>
                <strong>Action:</strong> {report.resolution.action}
              </p>
              {report.resolution.notes && <p>{report.resolution.notes}</p>}
              <p className="resolution-meta">
                By {report.resolution.resolved_by?.display_name} on{' '}
                {new Date(report.resolution.resolved_at!).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Action Selection */}
          {report.status === 'pending' || report.status === 'under_review' || isAppeal ? (
            <div className="section">
              <h4>{isAppeal ? 'Appeal Decision' : 'Select Action'}</h4>
              {isAppeal ? (
                <div className="appeal-buttons">
                  <button
                    className={`appeal-btn ${action === 'dismiss' ? 'active' : ''}`}
                    onClick={() => setAction('dismiss')}
                  >
                    ✓ Uphold Original Decision
                  </button>
                  <button
                    className={`appeal-btn success ${action !== 'dismiss' ? 'active' : ''}`}
                    onClick={() => setAction('no_action')}
                  >
                    ↩ Reverse Decision
                  </button>
                </div>
              ) : (
                <div className="action-grid">
                  {(Object.keys(actionLabels) as ResolveAction[]).map((act) => (
                    <button
                      key={act}
                      className={`action-btn ${action === act ? 'active' : ''} ${
                        ['suspend_user', 'ban_user'].includes(act) ? 'danger' : ''
                      }`}
                      onClick={() => setAction(act)}
                    >
                      {actionLabels[act]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Notes */}
          {(report.status === 'pending' || report.status === 'under_review' || isAppeal) && (
            <div className="section">
              <h4>Notes</h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        {(report.status === 'pending' || report.status === 'under_review' || isAppeal) && (
          <div className="modal-actions">
            <button onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button onClick={() => void handleSubmit()} className="primary" disabled={submitting}>
              {submitting ? 'Processing...' : isAppeal ? 'Submit Decision' : 'Resolve Report'}
            </button>
          </div>
        )}

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
            display: flex;
            flex-direction: column;
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
            overflow-y: auto;
            flex: 1;
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

          .content-box {
            padding: 1rem;
            background: #f9fafb;
            border-radius: 8px;
          }

          .content-box .title {
            margin: 0 0 0.5rem;
            font-weight: 600;
          }

          .content-box .content {
            margin: 0;
            line-height: 1.6;
          }

          .content-box .author {
            margin: 0.5rem 0 0;
            font-size: 0.875rem;
            color: var(--text-muted, #6b7280);
          }

          .view-link {
            display: inline-block;
            margin-top: 0.5rem;
            color: var(--primary-color, #3b82f6);
            text-decoration: none;
            font-size: 0.875rem;
          }

          .description {
            font-style: italic;
            color: var(--text-muted, #6b7280);
          }

          .appeal-section {
            background: #fce7f3;
            padding: 1rem;
            border-radius: 8px;
          }

          .appeal-date {
            font-size: 0.75rem;
            color: var(--text-muted, #6b7280);
          }

          .resolution-section {
            background: #d1fae5;
            padding: 1rem;
            border-radius: 8px;
          }

          .resolution-meta {
            font-size: 0.75rem;
            color: var(--text-muted, #6b7280);
          }

          .action-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }

          .action-btn {
            padding: 0.75rem;
            border: 2px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            background: white;
            cursor: pointer;
            text-align: left;
            transition: all 0.2s;
          }

          .action-btn:hover {
            border-color: var(--primary-color, #3b82f6);
          }

          .action-btn.active {
            border-color: var(--primary-color, #3b82f6);
            background: #dbeafe;
          }

          .action-btn.danger:hover,
          .action-btn.danger.active {
            border-color: #ef4444;
            background: #fee2e2;
          }

          .appeal-buttons {
            display: flex;
            gap: 0.75rem;
          }

          .appeal-btn {
            flex: 1;
            padding: 1rem;
            border: 2px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            background: white;
            cursor: pointer;
            font-weight: 500;
          }

          .appeal-btn.active {
            border-color: #f59e0b;
            background: #fef3c7;
          }

          .appeal-btn.success.active {
            border-color: #10b981;
            background: #d1fae5;
          }

          textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            resize: vertical;
            font-family: inherit;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-color, #e5e7eb);
          }

          .modal-actions button {
            padding: 0.5rem 1.5rem;
            border-radius: 8px;
            border: 1px solid var(--border-color, #e5e7eb);
            background: white;
            cursor: pointer;
            font-weight: 500;
          }

          .modal-actions button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .modal-actions .primary {
            background: var(--primary-color, #3b82f6);
            border-color: var(--primary-color, #3b82f6);
            color: white;
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
