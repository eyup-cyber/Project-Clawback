/**
 * Reading Stats Component
 */

'use client';

interface ReadingStatsProps {
  stats: {
    total_articles: number;
    completed_articles: number;
    total_time_seconds: number;
    current_streak: number;
    articles_this_week: number;
    articles_this_month: number;
    average_reading_time: number;
  };
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function ReadingStats({ stats }: ReadingStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {stats.total_articles}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Articles Read</div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {formatTime(stats.total_time_seconds)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Reading Time</div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
          {stats.current_streak}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Day Streak</div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {stats.articles_this_month}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">This Month</div>
      </div>
    </div>
  );
}
