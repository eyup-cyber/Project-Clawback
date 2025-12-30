'use client';

/**
 * Admin Analytics Dashboard
 * Phase 2.10: Site-wide metrics, user analytics, content performance
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyticsOverview {
  pageViews: {
    total: number;
    change: number;
    chartData: ChartDataPoint[];
  };
  uniqueVisitors: {
    total: number;
    change: number;
    chartData: ChartDataPoint[];
  };
  avgSessionDuration: {
    seconds: number;
    change: number;
  };
  bounceRate: {
    percentage: number;
    change: number;
  };
  newUsers: {
    total: number;
    change: number;
    chartData: ChartDataPoint[];
  };
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface ContentMetrics {
  topPosts: PostMetric[];
  topCategories: CategoryMetric[];
  topAuthors: AuthorMetric[];
  engagementByType: {
    type: string;
    views: number;
    reactions: number;
    comments: number;
  }[];
}

export interface UserMetrics {
  signups: ChartDataPoint[];
  retentionRate: number;
  activeUsersTrend: ChartDataPoint[];
  roleDistribution: { role: string; count: number }[];
  deviceBreakdown: { device: string; percentage: number }[];
  geoDistribution: { country: string; count: number }[];
}

interface ChartDataPoint {
  date: string;
  value: number;
}

interface PostMetric {
  id: string;
  title: string;
  slug: string;
  views: number;
  reactions: number;
  comments: number;
  shares: number;
}

interface CategoryMetric {
  id: string;
  name: string;
  slug: string;
  color: string;
  postCount: number;
  totalViews: number;
}

interface AuthorMetric {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  postCount: number;
  totalViews: number;
  avgEngagement: number;
}

type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [contentMetrics, setContentMetrics] = useState<ContentMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'users'>('overview');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: dateRange });
      const [overviewRes, contentRes, usersRes] = await Promise.all([
        fetch(`/api/admin/analytics/overview?${params}`),
        fetch(`/api/admin/analytics/content?${params}`),
        fetch(`/api/admin/analytics/users?${params}`),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }

      if (contentRes.ok) {
        const data = await contentRes.json();
        setContentMetrics(data);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUserMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(
        `/api/admin/analytics/export?range=${dateRange}&format=${format}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${dateRange}.${format}`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="header">
        <h1>Analytics</h1>
        <div className="header-actions">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
          <div className="export-dropdown">
            <button className="export-btn">📥 Export</button>
            <div className="export-menu">
              <button onClick={() => void handleExport('csv')}>Export CSV</button>
              <button onClick={() => void handleExport('json')}>Export JSON</button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'content' ? 'active' : ''}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading analytics...</div>
      ) : (
        <>
          {activeTab === 'overview' && overview && <OverviewTab data={overview} />}
          {activeTab === 'content' && contentMetrics && <ContentTab data={contentMetrics} />}
          {activeTab === 'users' && userMetrics && <UsersTab data={userMetrics} />}
        </>
      )}

      <style jsx>{`
        .analytics-dashboard {
          padding: 1.5rem;
          max-width: 1400px;
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

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        select {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
        }

        .export-dropdown {
          position: relative;
        }

        .export-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
          cursor: pointer;
        }

        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          display: none;
          z-index: 10;
        }

        .export-dropdown:hover .export-menu {
          display: block;
        }

        .export-menu button {
          display: block;
          width: 100%;
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          white-space: nowrap;
        }

        .export-menu button:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .tabs button {
          padding: 0.75rem 1.5rem;
          border: none;
          background: none;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-muted, #6b7280);
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }

        .tabs button.active {
          color: var(--primary-color, #3b82f6);
          border-bottom-color: var(--primary-color, #3b82f6);
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted, #6b7280);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function OverviewTab({ data }: { data: AnalyticsOverview }) {
  return (
    <div className="overview-tab">
      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Page Views"
          value={data.pageViews.total.toLocaleString()}
          change={data.pageViews.change}
          chartData={data.pageViews.chartData}
          color="#3b82f6"
        />
        <MetricCard
          title="Unique Visitors"
          value={data.uniqueVisitors.total.toLocaleString()}
          change={data.uniqueVisitors.change}
          chartData={data.uniqueVisitors.chartData}
          color="#10b981"
        />
        <MetricCard
          title="Avg. Session"
          value={formatDuration(data.avgSessionDuration.seconds)}
          change={data.avgSessionDuration.change}
          color="#8b5cf6"
        />
        <MetricCard
          title="Bounce Rate"
          value={`${data.bounceRate.percentage.toFixed(1)}%`}
          change={-data.bounceRate.change}
          color="#f59e0b"
          invertChange
        />
      </div>

      {/* Active Users */}
      <div className="active-users-card">
        <h3>Active Users</h3>
        <div className="active-users-grid">
          <div className="active-users-stat">
            <span className="value">{data.activeUsers.daily.toLocaleString()}</span>
            <span className="label">Daily</span>
          </div>
          <div className="active-users-stat">
            <span className="value">{data.activeUsers.weekly.toLocaleString()}</span>
            <span className="label">Weekly</span>
          </div>
          <div className="active-users-stat">
            <span className="value">{data.activeUsers.monthly.toLocaleString()}</span>
            <span className="label">Monthly</span>
          </div>
        </div>
      </div>

      {/* New Users Chart */}
      <div className="chart-card">
        <h3>New User Signups</h3>
        <SimpleLineChart data={data.newUsers.chartData} color="#10b981" />
      </div>

      <style jsx>{`
        .overview-tab {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .active-users-card,
        .chart-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .active-users-card h3,
        .chart-card h3 {
          margin: 0 0 1rem;
          font-size: 1rem;
        }

        .active-users-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          text-align: center;
        }

        .active-users-stat .value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
        }

        .active-users-stat .label {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }
      `}</style>
    </div>
  );
}

function ContentTab({ data }: { data: ContentMetrics }) {
  return (
    <div className="content-tab">
      <div className="content-grid">
        {/* Top Posts */}
        <div className="card">
          <h3>Top Posts</h3>
          <div className="list">
            {data.topPosts.map((post, i) => (
              <div key={post.id} className="list-item">
                <span className="rank">#{i + 1}</span>
                <div className="item-info">
                  <span className="item-title">{post.title}</span>
                  <span className="item-stats">
                    {post.views.toLocaleString()} views · {post.reactions} reactions ·{' '}
                    {post.comments} comments
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Categories */}
        <div className="card">
          <h3>Top Categories</h3>
          <div className="list">
            {data.topCategories.map((cat, i) => (
              <div key={cat.id} className="list-item">
                <span className="rank" style={{ backgroundColor: cat.color }}>
                  #{i + 1}
                </span>
                <div className="item-info">
                  <span className="item-title">{cat.name}</span>
                  <span className="item-stats">
                    {cat.postCount} posts · {cat.totalViews.toLocaleString()} views
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Authors */}
        <div className="card">
          <h3>Top Authors</h3>
          <div className="list">
            {data.topAuthors.map((author, i) => (
              <div key={author.id} className="list-item">
                <span className="rank">#{i + 1}</span>
                <div className="author-avatar">
                  {author.avatarUrl ? (
                    <img src={author.avatarUrl} alt="" />
                  ) : (
                    <span>{author.displayName.charAt(0)}</span>
                  )}
                </div>
                <div className="item-info">
                  <span className="item-title">{author.displayName}</span>
                  <span className="item-stats">
                    {author.postCount} posts · {author.totalViews.toLocaleString()} views
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement by Type */}
        <div className="card">
          <h3>Engagement by Content Type</h3>
          <div className="engagement-bars">
            {data.engagementByType.map((type) => (
              <div key={type.type} className="engagement-row">
                <span className="type-name">{type.type}</span>
                <div className="type-stats">
                  <span>👁️ {type.views.toLocaleString()}</span>
                  <span>❤️ {type.reactions}</span>
                  <span>💬 {type.comments}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .content-tab {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1rem;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card h3 {
          margin: 0 0 1rem;
          font-size: 1rem;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .list-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .rank {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          background: #6b7280;
        }

        .author-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .author-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .item-info {
          flex: 1;
          min-width: 0;
        }

        .item-title {
          display: block;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-stats {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .engagement-bars {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .engagement-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .type-name {
          font-weight: 500;
          text-transform: capitalize;
        }

        .type-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }
      `}</style>
    </div>
  );
}

function UsersTab({ data }: { data: UserMetrics }) {
  return (
    <div className="users-tab">
      <div className="users-grid">
        {/* Signups Chart */}
        <div className="card wide">
          <h3>User Signups</h3>
          <SimpleLineChart data={data.signups} color="#3b82f6" />
        </div>

        {/* Retention */}
        <div className="card">
          <h3>Retention Rate</h3>
          <div className="retention-display">
            <span className="retention-value">{data.retentionRate.toFixed(1)}%</span>
            <span className="retention-label">users return within 7 days</span>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="card">
          <h3>Role Distribution</h3>
          <div className="distribution-list">
            {data.roleDistribution.map((role) => (
              <div key={role.role} className="distribution-item">
                <span className="distribution-label">{role.role}</span>
                <span className="distribution-value">{role.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="card">
          <h3>Device Breakdown</h3>
          <div className="distribution-list">
            {data.deviceBreakdown.map((device) => (
              <div key={device.device} className="distribution-item">
                <span className="distribution-label">
                  {device.device === 'mobile' ? '📱' : device.device === 'desktop' ? '💻' : '📋'}{' '}
                  {device.device}
                </span>
                <span className="distribution-value">{device.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geo Distribution */}
        <div className="card">
          <h3>Top Countries</h3>
          <div className="distribution-list">
            {data.geoDistribution.slice(0, 10).map((geo) => (
              <div key={geo.country} className="distribution-item">
                <span className="distribution-label">{geo.country}</span>
                <span className="distribution-value">{geo.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Users Trend */}
        <div className="card">
          <h3>Active Users Trend</h3>
          <SimpleLineChart data={data.activeUsersTrend} color="#10b981" />
        </div>
      </div>

      <style jsx>{`
        .users-tab {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card.wide {
          grid-column: 1 / -1;
        }

        .card h3 {
          margin: 0 0 1rem;
          font-size: 1rem;
        }

        .retention-display {
          text-align: center;
          padding: 1rem;
        }

        .retention-value {
          display: block;
          font-size: 3rem;
          font-weight: 700;
          color: #10b981;
        }

        .retention-label {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }

        .distribution-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .distribution-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .distribution-label {
          text-transform: capitalize;
        }

        .distribution-value {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  change,
  chartData,
  color,
  invertChange = false,
}: {
  title: string;
  value: string;
  change: number;
  chartData?: ChartDataPoint[];
  color: string;
  invertChange?: boolean;
}) {
  const isPositive = invertChange ? change <= 0 : change >= 0;

  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        <span className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)}%
        </span>
      </div>
      <div className="metric-value" style={{ color }}>
        {value}
      </div>
      {chartData && (
        <div className="metric-chart">
          <MiniSparkline data={chartData} color={color} />
        </div>
      )}

      <style jsx>{`
        .metric-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .metric-title {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }

        .metric-change {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
        }

        .metric-change.positive {
          background: #d1fae5;
          color: #065f46;
        }

        .metric-change.negative {
          background: #fee2e2;
          color: #991b1b;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
        }

        .metric-chart {
          margin-top: 0.75rem;
          height: 40px;
        }
      `}</style>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: ChartDataPoint[]; color: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (d.value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="sparkline">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <style jsx>{`
        .sparkline {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </svg>
  );
}

function SimpleLineChart({ data, color }: { data: ChartDataPoint[]; color: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="line-chart">
      {data.map((point, i) => (
        <div key={i} className="chart-bar-wrapper">
          <div
            className="chart-bar"
            style={{
              height: `${(point.value / maxValue) * 100}%`,
              backgroundColor: color,
            }}
            title={`${point.date}: ${point.value}`}
          />
          <span className="chart-label">
            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}

      <style jsx>{`
        .line-chart {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 120px;
          padding-top: 20px;
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
          transform: rotate(-45deg);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
