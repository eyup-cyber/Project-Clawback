/**
 * Reading History Page Client Component
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ReadingStats } from '@/app/components/history/ReadingStats';
import { HistoryTimeline } from '@/app/components/history/HistoryTimeline';
import EmptyState from '@/app/components/dashboard/shared/EmptyState';

interface ReadingStats {
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

const statsFetcher = async (url: string): Promise<ReadingStats> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

const historyFetcher = async (url: string): Promise<HistoryResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
};

export function ReadingHistoryPageClient() {
  const [page, setPage] = useState(1);

  const { data: stats, error: statsError } = useSWR<ReadingStats>(
    '/api/reading-history/stats',
    statsFetcher
  );

  const { data: history, error: historyError } = useSWR<HistoryResponse>(
    `/api/reading-history?page=${page}&limit=20`,
    historyFetcher
  );

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all reading history?')) return;

    try {
      const res = await fetch('/api/reading-history', { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reading History</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your reading progress and statistics
          </p>
        </div>

        {history && history.items.length > 0 && (
          <button
            onClick={() => void handleClearHistory()}
            className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
          >
            Clear History
          </button>
        )}
      </div>

      {statsError ? (
        <div className="text-red-600">Failed to load statistics</div>
      ) : (
        stats && <ReadingStats stats={stats} />
      )}

      {historyError ? (
        <EmptyState title="Failed to load history" description="Please try refreshing the page" />
      ) : history && history.items.length === 0 ? (
        <EmptyState
          title="No reading history yet"
          description="Start reading articles to build your history"
        />
      ) : history ? (
        <HistoryTimeline
          items={history.items}
          hasMore={history.hasMore}
          onLoadMore={() => setPage((p) => p + 1)}
        />
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
