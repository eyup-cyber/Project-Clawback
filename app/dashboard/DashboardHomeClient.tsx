/**
 * Dashboard Home Client Component
 */

'use client';

import { PersonalizedFeed } from '@/app/components/dashboard/PersonalizedFeed';
import { ContinueReading } from '@/app/components/dashboard/ContinueReading';
import { FeedControls } from '@/app/components/dashboard/FeedControls';
import { useState, useEffect, useSyncExternalStore } from 'react';

// Helper to read from localStorage with SSR safety
function getStorageSnapshot(key: string, defaultValue: string): () => string {
  return () => {
    if (typeof window === 'undefined') return defaultValue;
    return localStorage.getItem(key) ?? defaultValue;
  };
}

function subscribeStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function DashboardHomeClient() {
  // Use sync external store for localStorage to avoid setState in effect
  const storedViewMode = useSyncExternalStore(
    subscribeStorage,
    getStorageSnapshot('feedViewMode', 'list'),
    () => 'list'
  ) as 'list' | 'grid';

  const storedShowRead = useSyncExternalStore(
    subscribeStorage,
    getStorageSnapshot('feedShowReadArticles', 'false'),
    () => 'false'
  );

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(storedViewMode);
  const [showReadArticles, setShowReadArticles] = useState(storedShowRead === 'true');
  const [refreshKey, setRefreshKey] = useState(0);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('feedViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('feedShowReadArticles', String(showReadArticles));
  }, [showReadArticles]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here&apos;s what&apos;s new in your personalized feed
        </p>
      </div>

      {/* Continue Reading */}
      <section>
        <ContinueReading />
      </section>

      {/* Feed Controls */}
      <section>
        <FeedControls
          onRefresh={handleRefresh}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showReadArticles={showReadArticles}
          onShowReadChange={setShowReadArticles}
        />

        {/* Personalized Feed */}
        <PersonalizedFeed excludeRead={!showReadArticles} key={refreshKey} />
      </section>
    </div>
  );
}
