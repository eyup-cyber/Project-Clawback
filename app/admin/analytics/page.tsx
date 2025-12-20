'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface MetricCard {
  label: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format?: 'number' | 'percentage' | 'duration';
}

interface TimeSeriesData {
  date: string;
  value: number;
}

interface TopContent {
  id: string;
  title: string;
  views: number;
  author: string;
  change: number;
}

interface AnalyticsData {
  overview: {
    pageViews: MetricCard;
    uniqueVisitors: MetricCard;
    avgSessionDuration: MetricCard;
    bounceRate: MetricCard;
  };
  charts: {
    pageViews: TimeSeriesData[];
    users: TimeSeriesData[];
  };
  topContent: TopContent[];
  topReferrers: Array<{ source: string; count: number; percentage: number }>;
  deviceBreakdown: Array<{ device: string; count: number; percentage: number }>;
  countryBreakdown: Array<{ country: string; count: number; percentage: number }>;
}

type DateRange = '7d' | '30d' | '90d' | 'custom';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'audience'>('overview');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch analytics');
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      // Set mock data for demo
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const formatValue = (value: number, format?: string): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}m ${seconds}s`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: string, isPositive: boolean): string => {
    if (trend === 'stable') return 'var(--foreground)';
    return (trend === 'up') === isPositive ? '#22c55e' : '#ef4444';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--accent)',
            }}
          >
            Analytics
          </h1>
          <p
            style={{
              color: 'var(--foreground)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Track performance and user engagement
          </p>
        </div>

        {/* Date range selector */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                dateRange === range ? 'ring-2 ring-[var(--primary)]' : ''
              }`}
              style={{
                background: dateRange === range ? 'var(--primary)' : 'var(--surface)',
                color: dateRange === range ? 'var(--background)' : 'var(--foreground)',
              }}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

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
          {error} (showing demo data)
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
        {(['overview', 'content', 'audience'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'shadow-sm' : ''
            }`}
            style={{
              background: activeTab === tab ? 'var(--background)' : 'transparent',
              color: 'var(--foreground)',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div
            className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          />
          <p className="mt-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Loading analytics...
          </p>
        </div>
      ) : data ? (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(data.overview).map(([key, metric]) => (
                  <div
                    key={key}
                    className="p-6 rounded-xl border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <p
                      className="text-sm mb-1"
                      style={{ color: 'var(--foreground)', opacity: 0.6 }}
                    >
                      {metric.label}
                    </p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
                      {typeof metric.value === 'number'
                        ? formatValue(metric.value, metric.format)
                        : metric.value}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-sm">
                      <span style={{ color: getTrendColor(metric.trend, key !== 'bounceRate') }}>
                        {getTrendIcon(metric.trend)} {Math.abs(metric.change).toFixed(1)}%
                      </span>
                      <span style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                        vs previous period
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                  className="p-6 rounded-xl border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <h3 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                    Page Views
                  </h3>
                  <div className="h-64 flex items-end gap-2">
                    {data.charts.pageViews.slice(-14).map((point, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all hover:opacity-80"
                        style={{
                          background: 'var(--primary)',
                          height: `${(point.value / Math.max(...data.charts.pageViews.map((p) => p.value))) * 100}%`,
                          minHeight: '4px',
                        }}
                        title={`${point.date}: ${point.value.toLocaleString()}`}
                      />
                    ))}
                  </div>
                </div>

                <div
                  className="p-6 rounded-xl border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <h3 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                    Unique Visitors
                  </h3>
                  <div className="h-64 flex items-end gap-2">
                    {data.charts.users.slice(-14).map((point, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all hover:opacity-80"
                        style={{
                          background: 'var(--secondary)',
                          height: `${(point.value / Math.max(...data.charts.users.map((p) => p.value))) * 100}%`,
                          minHeight: '4px',
                        }}
                        title={`${point.date}: ${point.value.toLocaleString()}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div
                className="rounded-xl border overflow-hidden"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-bold" style={{ color: 'var(--foreground)' }}>
                    Top Content
                  </h3>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {data.topContent.map((content, index) => (
                    <div key={content.id} className="p-4 flex items-center gap-4">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                      >
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {content.title}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                          by {content.author}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: 'var(--foreground)' }}>
                          {content.views.toLocaleString()}
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: content.change >= 0 ? '#22c55e' : '#ef4444' }}
                        >
                          {content.change >= 0 ? '+' : ''}
                          {content.change}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audience Tab */}
          {activeTab === 'audience' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Devices */}
              <div
                className="p-6 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <h3 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                  Devices
                </h3>
                <div className="space-y-3">
                  {data.deviceBreakdown.map((item) => (
                    <div key={item.device}>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: 'var(--foreground)' }}>{item.device}</span>
                        <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'var(--background)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            background: 'var(--primary)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referrers */}
              <div
                className="p-6 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <h3 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                  Top Referrers
                </h3>
                <div className="space-y-3">
                  {data.topReferrers.map((item) => (
                    <div key={item.source} className="flex justify-between">
                      <span className="truncate" style={{ color: 'var(--foreground)' }}>
                        {item.source}
                      </span>
                      <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div
                className="p-6 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <h3 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                  Top Countries
                </h3>
                <div className="space-y-3">
                  {data.countryBreakdown.map((item) => (
                    <div key={item.country} className="flex justify-between">
                      <span style={{ color: 'var(--foreground)' }}>{item.country}</span>
                      <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Quick links */}
      <div
        className="p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          Related
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/experiments"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            A/B Experiments →
          </Link>
          <Link
            href="/admin/monitoring"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            System Monitoring →
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
    </div>
  );
}

// Mock data for demo/fallback
function getMockData(): AnalyticsData {
  const generateTimeSeries = (days: number, base: number, variance: number): TimeSeriesData[] => {
    const data: TimeSeriesData[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(base + (Math.random() - 0.5) * variance),
      });
    }
    return data;
  };

  return {
    overview: {
      pageViews: { label: 'Page Views', value: 125430, change: 12.5, trend: 'up' },
      uniqueVisitors: { label: 'Unique Visitors', value: 45230, change: 8.3, trend: 'up' },
      avgSessionDuration: {
        label: 'Avg. Session',
        value: 185,
        change: -2.1,
        trend: 'down',
        format: 'duration',
      },
      bounceRate: {
        label: 'Bounce Rate',
        value: 42.3,
        change: -5.2,
        trend: 'down',
        format: 'percentage',
      },
    },
    charts: {
      pageViews: generateTimeSeries(30, 4000, 2000),
      users: generateTimeSeries(30, 1500, 800),
    },
    topContent: [
      {
        id: '1',
        title: 'Getting Started with Creative Writing',
        views: 12450,
        author: 'Jane Smith',
        change: 15,
      },
      { id: '2', title: 'The Art of Storytelling', views: 9823, author: 'John Doe', change: 8 },
      {
        id: '3',
        title: 'Understanding Color Theory',
        views: 8234,
        author: 'Alex Johnson',
        change: -3,
      },
      { id: '4', title: 'Music Production Basics', views: 7651, author: 'Sam Wilson', change: 22 },
      {
        id: '5',
        title: 'Photography Tips for Beginners',
        views: 6543,
        author: 'Emily Brown',
        change: 5,
      },
    ],
    topReferrers: [
      { source: 'Direct', count: 15234, percentage: 35 },
      { source: 'Google', count: 12453, percentage: 28 },
      { source: 'Twitter', count: 5432, percentage: 12 },
      { source: 'Facebook', count: 4321, percentage: 10 },
      { source: 'Reddit', count: 3210, percentage: 7 },
    ],
    deviceBreakdown: [
      { device: 'Desktop', count: 25000, percentage: 55 },
      { device: 'Mobile', count: 18000, percentage: 40 },
      { device: 'Tablet', count: 2250, percentage: 5 },
    ],
    countryBreakdown: [
      { country: 'United States', count: 20000, percentage: 45 },
      { country: 'United Kingdom', count: 8000, percentage: 18 },
      { country: 'Canada', count: 5000, percentage: 11 },
      { country: 'Australia', count: 4000, percentage: 9 },
      { country: 'Germany', count: 3500, percentage: 8 },
    ],
  };
}
