'use client';

/**
 * Contributor Applications Queue
 * Phase 2.3: Queue, review interface, approve/reject workflow
 */

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface Application {
  id: string;
  user_id: string;
  user: {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
  };
  status: ApplicationStatus;
  pitch: string;
  writing_samples: WritingSample[];
  social_links: SocialLink[];
  experience: string;
  topics_of_interest: string[];
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer?: {
    display_name: string;
  };
  decision_notes: string | null;
}

export interface WritingSample {
  title: string;
  url: string;
  description?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

interface ApplicationFilters {
  status: ApplicationStatus | 'all';
  search: string;
  sort: 'submitted_at' | 'display_name';
  order: 'asc' | 'desc';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApplicationsQueue() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState<ApplicationFilters>({
    status: 'pending',
    search: '',
    sort: 'submitted_at',
    order: 'desc',
  });
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const fetchApplications = useCallback(async () => {
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

      const response = await fetch(`/api/admin/applications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
        setPagination((p) => ({ ...p, total: data.total || 0 }));
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, stats]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const handleReview = async (
    applicationId: string,
    decision: 'approved' | 'rejected',
    notes: string
  ) => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes }),
      });

      if (response.ok) {
        void fetchApplications();
        setShowReviewModal(false);
        setSelectedApplication(null);
      }
    } catch (error) {
      console.error('Failed to review application:', error);
    }
  };

  return (
    <div className="applications-queue">
      {/* Header */}
      <div className="header">
        <h1>Contributor Applications</h1>
        <div className="header-stats">
          <span className="stat pending">{stats.pending} pending</span>
          <span className="stat approved">{stats.approved} approved</span>
          <span className="stat rejected">{stats.rejected} rejected</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <button
          className={`stat-card ${filters.status === 'pending' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'pending' }))}
        >
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending Review</span>
        </button>
        <button
          className={`stat-card ${filters.status === 'approved' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'approved' }))}
        >
          <span className="stat-value">{stats.approved}</span>
          <span className="stat-label">Approved</span>
        </button>
        <button
          className={`stat-card ${filters.status === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'rejected' }))}
        >
          <span className="stat-value">{stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </button>
        <button
          className={`stat-card ${filters.status === 'all' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, status: 'all' }))}
        >
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">All Applications</span>
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="search"
          placeholder="Search by name or email..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="search-input"
        />
        <select
          value={`${filters.sort}-${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split('-') as [
              ApplicationFilters['sort'],
              ApplicationFilters['order'],
            ];
            setFilters((f) => ({ ...f, sort, order }));
          }}
        >
          <option value="submitted_at-desc">Newest First</option>
          <option value="submitted_at-asc">Oldest First</option>
          <option value="display_name-asc">Name A-Z</option>
        </select>
      </div>

      {/* Applications List */}
      <div className="applications-list">
        {loading ? (
          <div className="loading">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <p>No applications found</p>
            {filters.status === 'pending' && <p className="empty-hint">All caught up! 🎉</p>}
          </div>
        ) : (
          applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onSelect={() => {
                setSelectedApplication(application);
                setShowReviewModal(true);
              }}
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

      {/* Review Modal */}
      {showReviewModal && selectedApplication && (
        <ReviewModal
          application={selectedApplication}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedApplication(null);
          }}
          onReview={(id, decision, notes) => {
            void handleReview(id, decision, notes);
          }}
        />
      )}

      <style jsx>{`
        .applications-queue {
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

        .header-stats {
          display: flex;
          gap: 1rem;
        }

        .header-stats .stat {
          font-size: 0.875rem;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
        }

        .stat.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .stat.approved {
          background: #d1fae5;
          color: #065f46;
        }

        .stat.rejected {
          background: #fee2e2;
          color: #991b1b;
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 1rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stat-card:hover {
          border-color: var(--primary-color, #3b82f6);
        }

        .stat-card.active {
          border-color: var(--primary-color, #3b82f6);
          background: #dbeafe;
        }

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          text-transform: uppercase;
        }

        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
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

        .applications-list {
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

function ApplicationCard({
  application,
  onSelect,
}: {
  application: Application;
  onSelect: () => void;
}) {
  const statusColors: Record<ApplicationStatus, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    approved: { bg: '#d1fae5', text: '#065f46' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
    withdrawn: { bg: '#f3f4f6', text: '#6b7280' },
  };

  const colors = statusColors[application.status];

  return (
    <div className="application-card" onClick={onSelect}>
      <div className="card-header">
        <div className="applicant-info">
          <div className="avatar">
            {application.user.avatar_url ? (
              <img src={application.user.avatar_url} alt="" />
            ) : (
              <span>{application.user.display_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="info">
            <h3>{application.user.display_name}</h3>
            <p>@{application.user.username}</p>
          </div>
        </div>
        <div className="card-meta">
          <span className="status-badge" style={{ backgroundColor: colors.bg, color: colors.text }}>
            {application.status}
          </span>
          <span className="date">
            {formatDistanceToNow(new Date(application.submitted_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="pitch-preview">
        <p>{application.pitch.slice(0, 200)}...</p>
      </div>

      <div className="card-footer">
        <div className="topics">
          {application.topics_of_interest.slice(0, 3).map((topic) => (
            <span key={topic} className="topic-tag">
              {topic}
            </span>
          ))}
          {application.topics_of_interest.length > 3 && (
            <span className="more">+{application.topics_of_interest.length - 3} more</span>
          )}
        </div>
        <div className="samples-count">
          📄 {application.writing_samples.length} sample
          {application.writing_samples.length !== 1 ? 's' : ''}
        </div>
      </div>

      <style jsx>{`
        .application-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition:
            box-shadow 0.2s,
            transform 0.2s;
        }

        .application-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .applicant-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .avatar {
          width: 48px;
          height: 48px;
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

        .avatar span {
          font-weight: 600;
          font-size: 1.25rem;
          color: var(--text-muted, #6b7280);
        }

        .info h3 {
          margin: 0;
          font-size: 1rem;
        }

        .info p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }

        .card-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .date {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .pitch-preview {
          margin-bottom: 1rem;
        }

        .pitch-preview p {
          margin: 0;
          color: var(--text-muted, #6b7280);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .topics {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .topic-tag {
          padding: 0.125rem 0.5rem;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .more {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .samples-count {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }
      `}</style>
    </div>
  );
}

function ReviewModal({
  application,
  onClose,
  onReview,
}: {
  application: Application;
  onClose: () => void;
  onReview: (id: string, decision: 'approved' | 'rejected', notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setSubmitting(true);
    await onReview(application.id, decision, notes);
    setSubmitting(false);
  };

  const isPending = application.status === 'pending';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Application Review</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Applicant Info */}
          <div className="section applicant-section">
            <div className="applicant-header">
              <div className="avatar-large">
                {application.user.avatar_url ? (
                  <img src={application.user.avatar_url} alt="" />
                ) : (
                  <span>{application.user.display_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="applicant-details">
                <h3>{application.user.display_name}</h3>
                <p>@{application.user.username}</p>
                <p className="email">{application.user.email}</p>
                <p className="joined">
                  Member since {new Date(application.user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Pitch */}
          <div className="section">
            <h4>Pitch</h4>
            <div className="pitch-content">{application.pitch}</div>
          </div>

          {/* Experience */}
          <div className="section">
            <h4>Experience</h4>
            <div className="experience-content">{application.experience}</div>
          </div>

          {/* Topics of Interest */}
          <div className="section">
            <h4>Topics of Interest</h4>
            <div className="topics-list">
              {application.topics_of_interest.map((topic) => (
                <span key={topic} className="topic-tag">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* Writing Samples */}
          <div className="section">
            <h4>Writing Samples ({application.writing_samples.length})</h4>
            <div className="samples-list">
              {application.writing_samples.map((sample, i) => (
                <a
                  key={i}
                  href={sample.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sample-link"
                >
                  <span className="sample-title">{sample.title}</span>
                  {sample.description && <span className="sample-desc">{sample.description}</span>}
                  <span className="sample-url">{new URL(sample.url).hostname}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Social Links */}
          {application.social_links.length > 0 && (
            <div className="section">
              <h4>Social Links</h4>
              <div className="social-links">
                {application.social_links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link"
                  >
                    {link.platform}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Previous Decision */}
          {!isPending && application.decision_notes && (
            <div className="section decision-section">
              <h4>Previous Decision</h4>
              <p>
                <strong>{application.status}</strong> by {application.reviewer?.display_name}
              </p>
              <p className="decision-notes">{application.decision_notes}</p>
            </div>
          )}

          {/* Review Form */}
          {isPending && (
            <div className="section review-section">
              <h4>Your Review</h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your decision (will be visible to the applicant)..."
                rows={4}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <div className="modal-actions">
            <button onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              onClick={() => {
                void handleDecision('rejected');
              }}
              className="reject-btn"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Reject'}
            </button>
            <button
              onClick={() => {
                void handleDecision('approved');
              }}
              className="approve-btn"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Approve'}
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
            max-width: 700px;
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
            color: var(--text-muted, #6b7280);
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

          .applicant-header {
            display: flex;
            gap: 1rem;
          }

          .avatar-large {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--avatar-bg, #e5e7eb);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
          }

          .avatar-large img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-large span {
            font-size: 1.5rem;
            font-weight: 600;
          }

          .applicant-details h3 {
            margin: 0;
          }

          .applicant-details p {
            margin: 0;
            color: var(--text-muted, #6b7280);
            font-size: 0.875rem;
          }

          .pitch-content,
          .experience-content {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
            line-height: 1.6;
            white-space: pre-wrap;
          }

          .topics-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .topic-tag {
            padding: 0.25rem 0.75rem;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 999px;
            font-size: 0.875rem;
          }

          .samples-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .sample-link {
            display: flex;
            flex-direction: column;
            padding: 0.75rem;
            background: #f9fafb;
            border-radius: 8px;
            text-decoration: none;
            color: inherit;
            transition: background 0.2s;
          }

          .sample-link:hover {
            background: #f3f4f6;
          }

          .sample-title {
            font-weight: 500;
          }

          .sample-desc {
            font-size: 0.875rem;
            color: var(--text-muted, #6b7280);
          }

          .sample-url {
            font-size: 0.75rem;
            color: var(--primary-color, #3b82f6);
          }

          .social-links {
            display: flex;
            gap: 0.5rem;
          }

          .social-link {
            padding: 0.25rem 0.75rem;
            background: #f3f4f6;
            border-radius: 999px;
            text-decoration: none;
            color: var(--text-muted, #6b7280);
            font-size: 0.875rem;
          }

          .social-link:hover {
            background: #e5e7eb;
          }

          .decision-section {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
          }

          .decision-notes {
            margin-top: 0.5rem;
            font-style: italic;
          }

          .review-section textarea {
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

          .reject-btn {
            border-color: #ef4444 !important;
            color: #991b1b;
          }

          .reject-btn:hover:not(:disabled) {
            background: #fee2e2;
          }

          .approve-btn {
            background: #10b981 !important;
            border-color: #10b981 !important;
            color: white;
          }

          .approve-btn:hover:not(:disabled) {
            background: #059669 !important;
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
