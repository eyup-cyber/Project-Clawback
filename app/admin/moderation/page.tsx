'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ContentReport {
  id: string;
  contentType: 'post' | 'comment' | 'profile';
  contentId: string;
  reason: string;
  description: string | null;
  reporterUserId: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy: string | null;
  reviewedAt: string | null;
  resolution: string | null;
  createdAt: string;
  content?: {
    title?: string;
    excerpt?: string;
    authorName?: string;
  };
  reporter?: {
    username: string;
    displayName: string;
  };
}

interface ModerationStats {
  pending: number;
  reviewedToday: number;
  resolvedThisWeek: number;
  totalReports: number;
}

const REPORT_REASONS = {
  spam: {
    label: 'Spam',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  harassment: {
    label: 'Harassment',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  hate_speech: {
    label: 'Hate Speech',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  misinformation: {
    label: 'Misinformation',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  inappropriate: {
    label: 'Inappropriate',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  copyright: {
    label: 'Copyright',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  dismissed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export default function ModerationPage() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>(
    'pending'
  );
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const response = await fetch(`/api/admin/moderation/reports?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch reports');
      }

      setReports(data.data.reports || []);
      setStats(data.data.stats || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleResolve = async (
    report: ContentReport,
    action: 'dismiss' | 'warn' | 'remove' | 'ban'
  ) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/moderation/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve report');
      }

      setSelectedReport(null);
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve report');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--accent)',
          }}
        >
          Content Moderation
        </h1>
        <p
          style={{
            color: 'var(--foreground)',
            opacity: 0.7,
            fontFamily: 'var(--font-body)',
          }}
        >
          Review reported content and manage community guidelines
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="p-4 rounded-lg border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-3xl font-bold" style={{ color: '#ef4444' }}>
              {stats.pending}
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Pending Review
            </p>
          </div>
          <div
            className="p-4 rounded-lg border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
              {stats.reviewedToday}
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Reviewed Today
            </p>
          </div>
          <div
            className="p-4 rounded-lg border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>
              {stats.resolvedThisWeek}
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Resolved This Week
            </p>
          </div>
          <div
            className="p-4 rounded-lg border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
              {stats.totalReports}
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Total Reports
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          className="p-4 rounded-lg border"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
          }}
        >
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-wrap gap-2 p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === status ? 'ring-2 ring-[var(--primary)]' : ''
            }`}
            style={{
              background: filter === status ? 'var(--primary)' : 'var(--background)',
              color: filter === status ? 'var(--background)' : 'var(--foreground)',
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="text-center py-12">
          <div
            className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          />
          <p className="mt-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Loading reports...
          </p>
        </div>
      ) : reports.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-6xl mb-4">✅</div>
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {filter === 'pending' ? 'No reports pending review' : 'No reports found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-6 rounded-lg border transition-all hover:shadow-md cursor-pointer"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              onClick={() => setSelectedReport(report)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedReport(report)}
              role="button"
              tabIndex={0}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Report info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        REPORT_REASONS[report.reason as keyof typeof REPORT_REASONS]?.color ||
                        REPORT_REASONS.other.color
                      }`}
                    >
                      {REPORT_REASONS[report.reason as keyof typeof REPORT_REASONS]?.label ||
                        report.reason}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[report.status]}`}
                    >
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                    >
                      {report.contentType}
                    </span>
                  </div>

                  {report.content?.title && (
                    <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                      {report.content.title}
                    </h3>
                  )}

                  {report.content?.excerpt && (
                    <p
                      className="text-sm mb-2"
                      style={{ color: 'var(--foreground)', opacity: 0.6 }}
                    >
                      {report.content.excerpt}
                    </p>
                  )}

                  {report.description && (
                    <p
                      className="text-sm italic"
                      style={{ color: 'var(--foreground)', opacity: 0.7 }}
                    >
                      &quot;{report.description}&quot;
                    </p>
                  )}

                  <div
                    className="flex flex-wrap gap-4 mt-3 text-xs"
                    style={{ color: 'var(--foreground)', opacity: 0.5 }}
                  >
                    <span>Reported {new Date(report.createdAt).toLocaleString()}</span>
                    {report.reporter && (
                      <span>by {report.reporter.displayName || report.reporter.username}</span>
                    )}
                    {report.content?.authorName && <span>Author: {report.content.authorName}</span>}
                  </div>
                </div>

                {/* Quick actions */}
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleResolve(report, 'dismiss');
                      }}
                      className="px-3 py-1 rounded text-sm"
                      style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(report);
                      }}
                      className="px-3 py-1 rounded text-sm"
                      style={{ background: 'var(--primary)', color: 'var(--background)' }}
                    >
                      Review
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div
        className="p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          Related Tools
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/users"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            User Management →
          </Link>
          <Link
            href="/admin/posts"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Post Management →
          </Link>
          <Link
            href="/admin"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Admin Dashboard →
          </Link>
        </div>
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ background: 'var(--surface)' }}
          >
            <h2
              className="text-2xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
            >
              Review Report
            </h2>

            {/* Report details */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    REPORT_REASONS[selectedReport.reason as keyof typeof REPORT_REASONS]?.color ||
                    REPORT_REASONS.other.color
                  }`}
                >
                  {REPORT_REASONS[selectedReport.reason as keyof typeof REPORT_REASONS]?.label ||
                    selectedReport.reason}
                </span>
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                >
                  {selectedReport.contentType}
                </span>
              </div>

              <div className="p-4 rounded-lg" style={{ background: 'var(--background)' }}>
                {selectedReport.content?.title && (
                  <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    {selectedReport.content.title}
                  </h3>
                )}
                {selectedReport.content?.excerpt && (
                  <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                    {selectedReport.content.excerpt}
                  </p>
                )}
                <div className="mt-2 text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  <Link
                    href={`/${selectedReport.contentType}s/${selectedReport.contentId}`}
                    className="hover:underline"
                    style={{ color: 'var(--primary)' }}
                    target="_blank"
                  >
                    View content →
                  </Link>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                    Reporter&apos;s description:
                  </h4>
                  <p
                    className="text-sm italic"
                    style={{ color: 'var(--foreground)', opacity: 0.7 }}
                  >
                    &quot;{selectedReport.description}&quot;
                  </p>
                </div>
              )}

              <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                Reported {new Date(selectedReport.createdAt).toLocaleString()}
                {selectedReport.reporter &&
                  ` by ${selectedReport.reporter.displayName || selectedReport.reporter.username}`}
              </div>
            </div>

            {/* Actions */}
            {selectedReport.status === 'pending' && (
              <div className="space-y-3">
                <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>
                  Take Action
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => void handleResolve(selectedReport, 'dismiss')}
                    disabled={actionLoading}
                    className="p-3 rounded-lg border text-sm transition-all hover:shadow-md disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    <span className="text-lg">✓</span>
                    <p className="font-medium mt-1">Dismiss</p>
                    <p className="text-xs opacity-60">No action needed</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResolve(selectedReport, 'warn')}
                    disabled={actionLoading}
                    className="p-3 rounded-lg border text-sm transition-all hover:shadow-md disabled:opacity-50"
                    style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                  >
                    <span className="text-lg">⚠️</span>
                    <p className="font-medium mt-1">Warn Author</p>
                    <p className="text-xs opacity-60">Send warning</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResolve(selectedReport, 'remove')}
                    disabled={actionLoading}
                    className="p-3 rounded-lg border text-sm transition-all hover:shadow-md disabled:opacity-50"
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    <span className="text-lg">🗑️</span>
                    <p className="font-medium mt-1">Remove Content</p>
                    <p className="text-xs opacity-60">Delete the content</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResolve(selectedReport, 'ban')}
                    disabled={actionLoading}
                    className="p-3 rounded-lg border text-sm transition-all hover:shadow-md disabled:opacity-50"
                    style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
                  >
                    <span className="text-lg">🚫</span>
                    <p className="font-medium mt-1">Ban User</p>
                    <p className="text-xs opacity-60">Suspend account</p>
                  </button>
                </div>
              </div>
            )}

            {selectedReport.status !== 'pending' && (
              <div className="p-4 rounded-lg" style={{ background: 'var(--background)' }}>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                  Resolution: {selectedReport.resolution || selectedReport.status}
                </p>
                {selectedReport.reviewedAt && (
                  <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                    Reviewed {new Date(selectedReport.reviewedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Close button */}
            <div
              className="flex justify-end mt-6 pt-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
