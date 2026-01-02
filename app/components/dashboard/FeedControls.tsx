/**
 * Feed Controls Component
 * Phase 1.1.1: Feed filtering and view controls
 */

'use client';

// ============================================================================
// ICONS
// ============================================================================

const RefreshIcon = ({ className }: { className?: string }) => (
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

const ListIcon = ({ className }: { className?: string }) => (
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

const GridIcon = ({ className }: { className?: string }) => (
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

// ============================================================================
// TYPES
// ============================================================================

interface FeedControlsProps {
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  excludeRead: boolean;
  onExcludeReadChange: (exclude: boolean) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  // Legacy prop names for backward compatibility
  showReadArticles?: boolean;
  onShowReadChange?: (show: boolean) => void;
  isLoading?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FeedControls({
  viewMode,
  onViewModeChange,
  excludeRead,
  onExcludeReadChange,
  onRefresh,
  isRefreshing = false,
  // Legacy props
  showReadArticles,
  onShowReadChange,
  isLoading,
}: FeedControlsProps) {
  // Support legacy prop names
  const showRead = showReadArticles !== undefined ? showReadArticles : !excludeRead;
  const handleShowReadChange = onShowReadChange || ((show: boolean) => onExcludeReadChange(!show));
  const loading = isLoading !== undefined ? isLoading : isRefreshing;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100
                    dark:border-gray-700 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left side: Refresh and filter */}
        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700
                       dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg
                       hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
            aria-label="Refresh feed"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Exclude read toggle */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={!showRead}
                onChange={(e) => handleShowReadChange(!e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-9 h-5 bg-gray-200 dark:bg-gray-600 rounded-full peer
                              peer-checked:bg-blue-600 transition-colors"
              />
              <div
                className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow
                              transition-transform peer-checked:translate-x-4"
              />
            </div>
            <span
              className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800
                             dark:group-hover:text-gray-200 transition-colors hidden sm:inline"
            >
              Hide read
            </span>
          </label>
        </div>

        {/* Right side: View mode toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <ListIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <GridIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
