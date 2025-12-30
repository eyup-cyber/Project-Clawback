/**
 * Dashboard Home Client Component
 * Phase 1.2.1: Contributor Dashboard Overview with stats, charts, and quick actions
 */

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  totalLikes: number;
  followers: number;
  viewsChange: number; // percentage change from last period
  commentsChange: number;
  likesChange: number;
}

interface RecentPost {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'pending_review' | 'published' | 'scheduled';
  views: number;
  comments: number;
  publishedAt: string | null;
  createdAt: string;
}

interface PerformanceData {
  date: string;
  views: number;
  comments: number;
  likes: number;
}

// ============================================================================
// ICONS
// ============================================================================

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrendUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const TrendDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

// ============================================================================
// COMPONENTS
// ============================================================================

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  icon: string;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div
      className="p-5 rounded-xl border transition-all hover:shadow-md"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {title}
          </p>
          <p
            className="text-2xl font-bold"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          >
            {formatNumber(value)}
          </p>
          {change !== undefined && change !== 0 && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${change > 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {change > 0 ? <TrendUpIcon /> : <TrendDownIcon />}
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ background: color, opacity: 0.15 }}
        >
          <span style={{ opacity: 1 }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

interface QuickActionProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  primary?: boolean;
}

function QuickAction({ href, icon, label, description, primary }: QuickActionProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md hover:scale-[1.01] ${
        primary ? '' : ''
      }`}
      style={{
        background: primary ? 'var(--primary)' : 'var(--surface)',
        borderColor: primary ? 'transparent' : 'var(--border)',
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: primary ? 'rgba(255,255,255,0.2)' : 'var(--primary)',
          color: primary ? 'var(--background)' : 'var(--background)',
        }}
      >
        {icon}
      </div>
      <div>
        <h3
          className="font-medium"
          style={{ color: primary ? 'var(--background)' : 'var(--foreground)' }}
        >
          {label}
        </h3>
        <p
          className="text-sm"
          style={{
            color: primary ? 'var(--background)' : 'var(--foreground)',
            opacity: primary ? 0.8 : 0.6,
          }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}

interface RecentPostRowProps {
  post: RecentPost;
}

function RecentPostRow({ post }: RecentPostRowProps) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-300',
    },
    pending_review: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
    published: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
    },
    scheduled: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
    },
  };

  const status = statusColors[post.status] || statusColors.draft;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <Link
      href={`/dashboard/posts/${post.id}/edit`}
      className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
    >
      <div className="flex-1 min-w-0 pr-4">
        <h4
          className="font-medium truncate group-hover:text-[var(--primary)] transition-colors"
          style={{ color: 'var(--foreground)' }}
        >
          {post.title || 'Untitled'}
        </h4>
        <div
          className="flex items-center gap-3 mt-1 text-sm"
          style={{ color: 'var(--foreground)', opacity: 0.6 }}
        >
          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
          {post.status === 'published' && (
            <>
              <span>•</span>
              <span>{post.views} views</span>
              <span>•</span>
              <span>{post.comments} comments</span>
            </>
          )}
        </div>
      </div>
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${status.bg} ${status.text}`}
      >
        {post.status.replace('_', ' ')}
      </span>
    </Link>
  );
}

// Simple mini chart component
function MiniChart({
  data,
  dataKey,
  color,
}: {
  data: PerformanceData[];
  dataKey: keyof PerformanceData;
  color: string;
}) {
  const values = data.map((d) => d[dataKey] as number);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 40" className="w-full h-10" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardHomeClient() {
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
    `/api/dashboard/stats?period=${timePeriod}`,
    fetcher
  );

  const { data: recentPosts, isLoading: postsLoading } = useSWR<RecentPost[]>(
    '/api/dashboard/posts/recent?limit=5',
    fetcher
  );

  const { data: performanceData } = useSWR<PerformanceData[]>(
    `/api/dashboard/performance?period=${timePeriod}`,
    fetcher
  );

  // Default values for when data is loading
  const defaultStats: DashboardStats = {
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
    totalComments: 0,
    totalLikes: 0,
    followers: 0,
    viewsChange: 0,
    commentsChange: 0,
    likesChange: 0,
  };

  const displayStats = stats || defaultStats;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--primary)',
            }}
          >
            {greeting}! ✨
          </h1>
          <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Here&apos;s how your content is performing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((period) => (
            <button
              type="button"
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timePeriod === period
                  ? 'bg-[var(--primary)] text-[var(--background)]'
                  : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
              }`}
            >
              {period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)' }}
            />
          ))
        ) : (
          <>
            <StatCard
              title="Total Views"
              value={displayStats.totalViews}
              change={displayStats.viewsChange}
              icon="👀"
              color="var(--primary)"
            />
            <StatCard
              title="Comments"
              value={displayStats.totalComments}
              change={displayStats.commentsChange}
              icon="💬"
              color="var(--secondary)"
            />
            <StatCard
              title="Likes"
              value={displayStats.totalLikes}
              change={displayStats.likesChange}
              icon="❤️"
              color="var(--accent)"
            />
            <StatCard
              title="Followers"
              value={displayStats.followers}
              icon="👥"
              color="var(--primary)"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <section>
        <h2
          className="text-lg font-bold mb-4"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--foreground)',
          }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            href="/dashboard/posts/new"
            icon={<PlusIcon />}
            label="Create New Post"
            description="Start writing your next article"
            primary
          />
          <QuickAction
            href="/dashboard/posts?status=draft"
            icon={<span className="text-lg">📝</span>}
            label="Continue Draft"
            description={`${displayStats.draftPosts} drafts waiting`}
          />
          <QuickAction
            href="/dashboard/analytics"
            icon={<span className="text-lg">📊</span>}
            label="View Analytics"
            description="Detailed performance insights"
          />
        </div>
      </section>

      {/* Performance Chart & Recent Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Overview */}
        <div
          className="lg:col-span-2 p-6 rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2
            className="text-lg font-bold mb-4"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--foreground)',
            }}
          >
            Performance Overview
          </h2>
          {performanceData && performanceData.length > 0 ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                    Views
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                    {displayStats.totalViews.toLocaleString()}
                  </span>
                </div>
                <MiniChart data={performanceData} dataKey="views" color="var(--primary)" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                    Engagement
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--secondary)' }}>
                    {(displayStats.totalComments + displayStats.totalLikes).toLocaleString()}
                  </span>
                </div>
                <MiniChart data={performanceData} dataKey="comments" color="var(--secondary)" />
              </div>
            </div>
          ) : (
            <div
              className="h-48 flex items-center justify-center"
              style={{ color: 'var(--foreground)', opacity: 0.5 }}
            >
              <p>No performance data yet. Publish some posts to see your stats!</p>
            </div>
          )}
        </div>

        {/* Recent Posts */}
        <div
          className="p-6 rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--foreground)',
              }}
            >
              Recent Posts
            </h2>
            <Link
              href="/dashboard/posts"
              className="text-sm hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              View all
            </Link>
          </div>
          {postsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg animate-pulse"
                  style={{ background: 'var(--background)' }}
                />
              ))}
            </div>
          ) : recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-1 -mx-4">
              {recentPosts.map((post) => (
                <RecentPostRow key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
              <p className="mb-4">No posts yet</p>
              <Link
                href="/dashboard/posts/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--background)',
                }}
              >
                <PlusIcon />
                Create your first post
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Content Summary */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2
          className="text-lg font-bold mb-4"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--foreground)',
          }}
        >
          Content Summary
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p
              className="text-3xl font-bold"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--primary)',
              }}
            >
              {displayStats.publishedPosts}
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Published
            </p>
          </div>
          <div>
            <p
              className="text-3xl font-bold"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--secondary)',
              }}
            >
              {displayStats.draftPosts}
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Drafts
            </p>
          </div>
          <div>
            <p
              className="text-3xl font-bold"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--foreground)',
              }}
            >
              {displayStats.totalPosts}
            </p>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Total
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
