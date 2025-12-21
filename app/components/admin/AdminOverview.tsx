'use client';

/**
 * Admin Overview Dashboard
 * Phase 2.1: Stats, charts, activity feed, alerts, quick actions
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_today: number;
    new_this_week: number;
    pending_applications: number;
  };
  posts: {
    total: number;
    published: number;
    pending_review: number;
    drafts: number;
    scheduled: number;
  };
  comments: {
    total: number;
    pending_moderation: number;
    reported: number;
  };
  media: {
    total_files: number;
    storage_used_bytes: number;
    storage_limit_bytes: number;
  };
  engagement: {
    views_today: number;
    views_this_week: number;
    reactions_today: number;
    comments_today: number;
  };
}

interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  action: string;
  target?: {
    type: string;
    id: string;
    title?: string;
  };
  metadata?: Record<string, unknown>;
  created_at: string;
}

type ActivityType =
  | 'user_signup'
  | 'user_application'
  | 'post_published'
  | 'post_submitted'
  | 'comment_posted'
  | 'comment_reported'
  | 'post_reported'
  | 'user_banned'
  | 'settings_changed';

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  dismissible: boolean;
  created_at: string;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  badge?: number;
  variant: 'default' | 'primary' | 'warning' | 'danger';
}

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Main Admin Overview Component
 */
export function AdminOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{
    views: ChartDataPoint[];
    users: ChartDataPoint[];
    posts: ChartDataPoint[];
  }>({ views: [], users: [], posts: [] });

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, activitiesRes, alertsRes, chartRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/activity?limit=10'),
        fetch('/api/admin/alerts'),
        fetch('/api/admin/charts?period=7d'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || []);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }

      if (chartRes.ok) {
        const data = await chartRes.json();
        setChartData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(() => void fetchDashboardData(), 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const quickActions: QuickAction[] = [
    {
      id: 'review-applications',
      label: 'Review Applications',
      description: 'Pending contributor applications',
      icon: '📝',
      href: '/admin/applications',
      badge: stats?.users.pending_applications,
      variant: stats?.users.pending_applications ? 'warning' : 'default',
    },
    {
      id: 'moderate-posts',
      label: 'Moderate Posts',
      description: 'Posts awaiting review',
      icon: '📄',
      href: '/admin/posts/pending',
      badge: stats?.posts.pending_review,
      variant: stats?.posts.pending_review ? 'primary' : 'default',
    },
    {
      id: 'moderate-comments',
      label: 'Moderate Comments',
      description: 'Comments needing attention',
      icon: '💬',
      href: '/admin/comments/pending',
      badge: stats?.comments.pending_moderation,
      variant: stats?.comments.pending_moderation ? 'warning' : 'default',
    },
    {
      id: 'view-reports',
      label: 'View Reports',
      description: 'Content reports to review',
      icon: '🚨',
      href: '/admin/reports',
      badge: stats?.comments.reported,
      variant: stats?.comments.reported ? 'danger' : 'default',
    },
    {
      id: 'manage-users',
      label: 'Manage Users',
      description: 'User management',
      icon: '👥',
      href: '/admin/users',
      variant: 'default',
    },
    {
      id: 'site-settings',
      label: 'Site Settings',
      description: 'Configure site options',
      icon: '⚙️',
      href: '/admin/settings',
      variant: 'default',
    },
  ];

  if (loading) {
    return <AdminOverviewSkeleton />;
  }

  return (
    <div className="admin-overview">
      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <AlertsBanner alerts={alerts} onDismiss={(id) => setAlerts((a) => a.filter((alert) => alert.id !== id))} />
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats?.users.total || 0}
          change={stats?.users.new_this_week || 0}
          changeLabel="this week"
          icon="👥"
          href="/admin/users"
        />
        <StatCard
          title="Published Posts"
          value={stats?.posts.published || 0}
          subvalue={`${stats?.posts.pending_review || 0} pending`}
          icon="📄"
          href="/admin/posts"
        />
        <StatCard
          title="Comments"
          value={stats?.comments.total || 0}
          subvalue={`${stats?.comments.pending_moderation || 0} to moderate`}
          icon="💬"
          href="/admin/comments"
        />
        <StatCard
          title="Views Today"
          value={stats?.engagement.views_today || 0}
          change={calculatePercentChange(
            stats?.engagement.views_today || 0,
            (stats?.engagement.views_this_week || 0) / 7
          )}
          changeLabel="vs avg"
          icon="👁️"
          href="/admin/analytics"
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(stats?.media.storage_used_bytes || 0)}
          subvalue={`of ${formatBytes(stats?.media.storage_limit_bytes || 0)}`}
          icon="💾"
          href="/admin/media"
          progress={
            stats?.media.storage_limit_bytes
              ? (stats.media.storage_used_bytes / stats.media.storage_limit_bytes) * 100
              : 0
          }
        />
        <StatCard
          title="Pending Applications"
          value={stats?.users.pending_applications || 0}
          icon="📝"
          href="/admin/applications"
          variant={stats?.users.pending_applications ? 'warning' : 'default'}
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <ChartCard title="Page Views (7 days)" data={chartData.views} color="#3b82f6" />
        <ChartCard title="New Users (7 days)" data={chartData.users} color="#10b981" />
        <ChartCard title="New Posts (7 days)" data={chartData.posts} color="#8b5cf6" />
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Quick Actions */}
        <div className="quick-actions-card">
          <h2>Quick Actions</h2>
          <div className="quick-actions-list">
            {quickActions.map((action) => (
              <QuickActionItem key={action.id} action={action} />
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="activity-feed-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <Link href="/admin/activity" className="view-all">
              View All →
            </Link>
          </div>
          <div className="activity-list">
            {activities.length === 0 ? (
              <p className="empty-state">No recent activity</p>
            ) : (
              activities.map((activity) => <ActivityFeedItem key={activity.id} activity={activity} />)
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-overview {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .charts-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        .quick-actions-card,
        .activity-feed-card {
          background: var(--card-bg, white);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .quick-actions-card h2,
        .activity-feed-card h2 {
          margin: 0 0 1rem;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .quick-actions-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .card-header h2 {
          margin: 0;
        }

        .view-all {
          color: var(--primary-color, #3b82f6);
          text-decoration: none;
          font-size: 0.875rem;
        }

        .view-all:hover {
          text-decoration: underline;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .empty-state {
          color: var(--text-muted, #6b7280);
          text-align: center;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  title,
  value,
  change,
  changeLabel,
  subvalue,
  icon,
  href,
  progress,
  variant = 'default',
}: {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  subvalue?: string;
  icon: string;
  href: string;
  progress?: number;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: '',
    warning: 'stat-card--warning',
    danger: 'stat-card--danger',
  };

  return (
    <Link href={href} className={`stat-card ${variantClasses[variant]}`}>
      <div className="stat-card-header">
        <span className="stat-icon">{icon}</span>
        <span className="stat-title">{title}</span>
      </div>
      <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {change !== undefined && (
        <div className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '+' : ''}
          {change} {changeLabel}
        </div>
      )}
      {subvalue && <div className="stat-subvalue">{subvalue}</div>}
      {progress !== undefined && (
        <div className="stat-progress">
          <div className="stat-progress-bar" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}

      <style jsx>{`
        .stat-card {
          background: var(--card-bg, white);
          border-radius: 12px;
          padding: 1.25rem;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stat-card--warning {
          border-left: 4px solid #f59e0b;
        }

        .stat-card--danger {
          border-left: 4px solid #ef4444;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .stat-icon {
          font-size: 1.25rem;
        }

        .stat-title {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .stat-change {
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .stat-change.positive {
          color: #10b981;
        }

        .stat-change.negative {
          color: #ef4444;
        }

        .stat-subvalue {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          margin-top: 0.25rem;
        }

        .stat-progress {
          height: 4px;
          background: var(--border-color, #e5e7eb);
          border-radius: 2px;
          margin-top: 0.75rem;
          overflow: hidden;
        }

        .stat-progress-bar {
          height: 100%;
          background: var(--primary-color, #3b82f6);
          border-radius: 2px;
          transition: width 0.3s;
        }
      `}</style>
    </Link>
  );
}

/**
 * Chart Card Component
 */
function ChartCard({
  title,
  data,
  color,
}: {
  title: string;
  data: ChartDataPoint[];
  color: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{title}</h3>
        <span className="chart-total">{total.toLocaleString()} total</span>
      </div>
      <div className="chart-bars">
        {data.map((point, i) => (
          <div key={i} className="chart-bar-wrapper">
            <div
              className="chart-bar"
              style={{
                height: `${(point.value / maxValue) * 100}%`,
                backgroundColor: color,
              }}
              title={`${point.label || point.date}: ${point.value}`}
            />
            <span className="chart-label">{formatChartLabel(point.date)}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .chart-card {
          background: var(--card-bg, white);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .chart-header h3 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .chart-total {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 100px;
        }

        .chart-bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .chart-bar {
          width: 100%;
          border-radius: 4px 4px 0 0;
          transition: height 0.3s;
          min-height: 4px;
        }

        .chart-label {
          font-size: 0.625rem;
          color: var(--text-muted, #6b7280);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

/**
 * Quick Action Item Component
 */
function QuickActionItem({ action }: { action: QuickAction }) {
  const variantClasses = {
    default: '',
    primary: 'quick-action--primary',
    warning: 'quick-action--warning',
    danger: 'quick-action--danger',
  };

  return (
    <Link href={action.href} className={`quick-action ${variantClasses[action.variant]}`}>
      <span className="quick-action-icon">{action.icon}</span>
      <div className="quick-action-content">
        <span className="quick-action-label">{action.label}</span>
        <span className="quick-action-description">{action.description}</span>
      </div>
      {action.badge !== undefined && action.badge > 0 && (
        <span className="quick-action-badge">{action.badge}</span>
      )}

      <style jsx>{`
        .quick-action {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          transition: background 0.2s;
        }

        .quick-action:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .quick-action--warning {
          background: #fef3c7;
        }

        .quick-action--warning:hover {
          background: #fde68a;
        }

        .quick-action--danger {
          background: #fee2e2;
        }

        .quick-action--danger:hover {
          background: #fecaca;
        }

        .quick-action--primary {
          background: #dbeafe;
        }

        .quick-action--primary:hover {
          background: #bfdbfe;
        }

        .quick-action-icon {
          font-size: 1.5rem;
        }

        .quick-action-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .quick-action-label {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .quick-action-description {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .quick-action-badge {
          background: var(--primary-color, #3b82f6);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          min-width: 1.5rem;
          text-align: center;
        }
      `}</style>
    </Link>
  );
}

/**
 * Activity Feed Item Component
 */
function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
  const getActivityIcon = (type: ActivityType): string => {
    const icons: Record<ActivityType, string> = {
      user_signup: '👤',
      user_application: '📝',
      post_published: '📄',
      post_submitted: '📤',
      comment_posted: '💬',
      comment_reported: '🚩',
      post_reported: '🚨',
      user_banned: '🚫',
      settings_changed: '⚙️',
    };
    return icons[type] || '📌';
  };

  return (
    <div className="activity-item">
      <span className="activity-icon">{getActivityIcon(activity.type)}</span>
      <div className="activity-content">
        <div className="activity-text">
          <strong>{activity.actor.display_name}</strong> {activity.action}
          {activity.target && <span className="activity-target"> &quot;{activity.target.title}&quot;</span>}
        </div>
        <div className="activity-time">{formatRelativeTime(activity.created_at)}</div>
      </div>

      <style jsx>{`
        .activity-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-text {
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .activity-target {
          color: var(--primary-color, #3b82f6);
        }

        .activity-time {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}

/**
 * Alerts Banner Component
 */
function AlertsBanner({
  alerts,
  onDismiss,
}: {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}) {
  const alertStyles = {
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  };

  return (
    <div className="alerts-banner">
      {alerts.map((alert) => {
        const style = alertStyles[alert.type];
        return (
          <div
            key={alert.id}
            className="alert"
            style={{
              backgroundColor: style.bg,
              borderLeftColor: style.border,
              color: style.text,
            }}
          >
            <div className="alert-content">
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
              {alert.action && (
                <Link href={alert.action.href} className="alert-action">
                  {alert.action.label} →
                </Link>
              )}
            </div>
            {alert.dismissible && (
              <button className="alert-dismiss" onClick={() => onDismiss(alert.id)} aria-label="Dismiss">
                ×
              </button>
            )}
          </div>
        );
      })}

      <style jsx>{`
        .alerts-banner {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .alert {
          display: flex;
          align-items: flex-start;
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .alert-content {
          flex: 1;
        }

        .alert-content strong {
          display: block;
          margin-bottom: 0.25rem;
        }

        .alert-content p {
          margin: 0;
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .alert-action {
          display: inline-block;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          color: inherit;
        }

        .alert-dismiss {
          background: none;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          opacity: 0.7;
          color: inherit;
        }

        .alert-dismiss:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

/**
 * Loading Skeleton
 */
function AdminOverviewSkeleton() {
  return (
    <div className="admin-overview-skeleton">
      <div className="skeleton-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line short" />
            <div className="skeleton-line large" />
          </div>
        ))}
      </div>

      <style jsx>{`
        .admin-overview-skeleton {
          padding: 1.5rem;
        }

        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .skeleton-card {
          background: var(--card-bg, white);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .skeleton-line {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }

        .skeleton-line.short {
          width: 60%;
          height: 16px;
          margin-bottom: 0.75rem;
        }

        .skeleton-line.large {
          width: 80%;
          height: 32px;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatChartLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
}

function calculatePercentChange(current: number, average: number): number {
  if (average === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - average) / average) * 100);
}
