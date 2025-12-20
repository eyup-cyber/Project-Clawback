/**
 * Feed Controls Component
 * Phase 3.2.3: Feed filtering and sorting controls
 */

'use client';

const ArrowPathIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const ListBulletIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const Squares2X2Icon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

interface FeedControlsProps {
  onRefresh: () => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  showReadArticles: boolean;
  onShowReadChange: (show: boolean) => void;
  isLoading?: boolean;
}

export function FeedControls({
  onRefresh,
  viewMode,
  onViewModeChange,
  showReadArticles,
  onShowReadChange,
  isLoading = false,
}: FeedControlsProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>

        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showReadArticles}
            onChange={(e) => onShowReadChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Show read articles</span>
        </label>
      </div>

      <div className="flex items-center space-x-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-2 rounded ${
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          } transition-colors`}
          aria-label="List view"
        >
          <ListBulletIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 rounded ${
            viewMode === 'grid'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          } transition-colors`}
          aria-label="Grid view"
        >
          <Squares2X2Icon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
