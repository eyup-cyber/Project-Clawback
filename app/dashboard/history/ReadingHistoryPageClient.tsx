/**
 * Reading History Page Client Component
 * Phase 1.1.4: Reading history with stats, timeline, filtering, and export
 */

'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import EmptyState from '@/app/components/dashboard/shared/EmptyState';
import { HistoryTimeline } from '@/app/components/history/HistoryTimeline';
import { ReadingStats } from '@/app/components/history/ReadingStats';

// ============================================================================
// TYPES
// ============================================================================

interface ReadingStatsData {
  total_articles: number;
  completed_articles: number;
  total_time_seconds: number;
  current_streak: number;
  articles_this_week: number;
  articles_this_month: number;
  average_reading_time: number;
}

interface HistoryItem {
  id: string;
  post_id: string;
  progress: number;
  time_spent_seconds: number;
  last_read_at: string;
  completed_at: string | null;
  post: {
    id: string;
    title: string;
    slug: string;
    featured_image_url: string | null;
    reading_time: number | null;
    author: {
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
}

interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

type DateFilter = 'all' | '7d' | '30d' | '90d' | 'year';

// ============================================================================
// ICONS
// ============================================================================

const DownloadIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ============================================================================
// FETCHERS
// ============================================================================

const statsFetcher = async (url: string): Promise<ReadingStatsData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

const historyFetcher = async (url: string): Promise<HistoryResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
};

// ============================================================================
// DATE FILTER
// ============================================================================

function getDateRange(filter: DateFilter): {
  dateFrom?: string;
  dateTo?: string;
} {
  if (filter === 'all') return {};

  const now = new Date();
  const dateFrom = new Date();

  switch (filter) {
    case '7d':
      dateFrom.setDate(now.getDate() - 7);
      break;
    case '30d':
      dateFrom.setDate(now.getDate() - 30);
      break;
    case '90d':
      dateFrom.setDate(now.getDate() - 90);
      break;
    case 'year':
      dateFrom.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { dateFrom: dateFrom.toISOString() };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReadingHistoryPageClient() {
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [completedOnly, setCompletedOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const dateRange = getDateRange(dateFilter);

  // Build history URL with filters
  const historyParams = new URLSearchParams({
    page: String(page),
    limit: '20',
    ...(dateRange.dateFrom && { date_from: dateRange.dateFrom }),
    ...(completedOnly && { completed_only: 'true' }),
  });

  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<ReadingStatsData>('/api/reading-history/stats', statsFetcher);

  const {
    data: history,
    error: historyError,
    isLoading: historyLoading,
    mutate,
  } = useSWR<HistoryResponse>(`/api/reading-history?${historyParams.toString()}`, historyFetcher);

  // Reset page when filters change
  const handleFilterChange = useCallback((newFilter: DateFilter) => {
    setDateFilter(newFilter);
    setPage(1);
  }, []);

  const handleCompletedOnlyChange = useCallback((value: boolean) => {
    setCompletedOnly(value);
    setPage(1);
  }, []);

  // Clear history
  const handleClearHistory = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all reading history? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const res = await fetch('/api/reading-history', { method: 'DELETE' });
      if (res.ok) {
        await mutate();
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    } finally {
      setIsClearing(false);
    }
  }, [mutate]);

  // Export history
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/reading-history/export');
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reading-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting history:', error);
      alert('Failed to export history. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Remove single item
  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      try {
        const res = await fetch(`/api/reading-history/${itemId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await mutate();
        }
      } catch (error) {
        console.error('Error removing item:', error);
      }
    },
    [mutate]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reading History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your reading progress and statistics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export button */}
          <button
            type="button"
            onClick={() => {
              void handleExport();
            }}
            disabled={isExporting || !history?.items.length}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700
                       dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>

          {/* Clear button */}
          {history && history.items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                void handleClearHistory();
              }}
              disabled={isClearing}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400
                         bg-white dark:bg-gray-800 rounded-lg border border-red-200
                         dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20
                         transition-colors disabled:opacity-50"
            >
              <TrashIcon />
              <span className="hidden sm:inline">{isClearing ? 'Clearing...' : 'Clear'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {statsError ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          Failed to load statistics
        </div>
      ) : statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 animate-pulse"
            >
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
          ))}
        </div>
      ) : (
        stats && <ReadingStats stats={stats} />
      )}

      {/* Filters */}
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100
                      dark:border-gray-700 p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Date filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Time:</span>
            <select
              value={dateFilter}
              onChange={(e) => handleFilterChange(e.target.value as DateFilter)}
              className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200
                         dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="year">Last year</option>
            </select>
          </div>

          {/* Completed only toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={completedOnly}
              onChange={(e) => handleCompletedOnlyChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Completed only</span>
          </label>

          {/* Results count */}
          {history && (
            <span className="ml-auto text-sm text-gray-500">
              {history.total} {history.total === 1 ? 'article' : 'articles'}
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      {historyError ? (
        <EmptyState title="Failed to load history" description="Please try refreshing the page" />
      ) : historyLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-pulse"
            >
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : history && history.items.length === 0 ? (
        <EmptyState
          title={completedOnly ? 'No completed articles' : 'No reading history yet'}
          description={
            completedOnly
              ? 'Finish reading some articles to see them here'
              : 'Start reading articles to build your history'
          }
        />
      ) : history ? (
        <HistoryTimeline
          items={history.items}
          hasMore={history.hasMore}
          onLoadMore={() => setPage((p) => p + 1)}
          onRemoveItem={handleRemoveItem}
        />
      ) : null}
    </div>
  );
}
