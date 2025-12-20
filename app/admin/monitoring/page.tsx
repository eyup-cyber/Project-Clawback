'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  change?: number;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  uptime: number;
  lastCheck: string;
}

interface HealthCheck {
  component: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
}

interface MonitoringData {
  system: SystemMetric[];
  services: ServiceStatus[];
  healthChecks: HealthCheck[];
  recentIncidents: Array<{
    id: string;
    title: string;
    severity: 'minor' | 'major' | 'critical';
    status: 'resolved' | 'investigating' | 'identified';
    startedAt: string;
    resolvedAt?: string;
  }>;
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/monitoring');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch monitoring data');
      }

      setData(result.data || getMockData());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
      setData(getMockData());
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'pass':
      case 'resolved':
        return '#22c55e';
      case 'warning':
      case 'degraded':
      case 'warn':
      case 'investigating':
      case 'identified':
        return '#eab308';
      case 'critical':
      case 'down':
      case 'fail':
        return '#ef4444';
      default:
        return 'var(--foreground)';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'pass':
        return '✓';
      case 'warning':
      case 'degraded':
      case 'warn':
        return '⚠';
      case 'critical':
      case 'down':
      case 'fail':
        return '✕';
      default:
        return '?';
    }
  };

  const overallStatus = data?.services.every((s) => s.status === 'operational')
    ? 'operational'
    : data?.services.some((s) => s.status === 'down')
      ? 'down'
      : 'degraded';

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
            System Monitoring
          </h1>
          <p
            style={{
              color: 'var(--foreground)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Real-time system health and performance
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', color: 'var(--background)' }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {data && (
        <div
          className="p-6 rounded-xl flex items-center justify-between"
          style={{
            background:
              overallStatus === 'operational'
                ? 'rgba(34, 197, 94, 0.1)'
                : overallStatus === 'degraded'
                  ? 'rgba(234, 179, 8, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${getStatusColor(overallStatus)}`,
          }}
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl">
              {overallStatus === 'operational' ? '✅' : overallStatus === 'degraded' ? '⚠️' : '🚨'}
            </span>
            <div>
              <h2 className="text-xl font-bold" style={{ color: getStatusColor(overallStatus) }}>
                {overallStatus === 'operational'
                  ? 'All Systems Operational'
                  : overallStatus === 'degraded'
                    ? 'Degraded Performance'
                    : 'System Outage'}
              </h2>
              <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                {data.services.filter((s) => s.status === 'operational').length} of{' '}
                {data.services.length} services running normally
              </p>
            </div>
          </div>
        </div>
      )}

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

      {loading ? (
        <div className="text-center py-12">
          <div
            className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          />
          <p className="mt-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Loading monitoring data...
          </p>
        </div>
      ) : data ? (
        <>
          {/* System Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.system.map((metric) => (
              <div
                key={metric.name}
                className="p-4 rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <p className="text-sm mb-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  {metric.name}
                </p>
                <div className="flex items-end gap-2">
                  <p
                    className="text-2xl font-bold"
                    style={{ color: getStatusColor(metric.status) }}
                  >
                    {metric.value}
                    <span className="text-sm font-normal">{metric.unit}</span>
                  </p>
                  {metric.change !== undefined && (
                    <span
                      className="text-sm"
                      style={{ color: metric.change >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {metric.change >= 0 ? '↑' : '↓'}
                      {Math.abs(metric.change)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Services Grid */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold" style={{ color: 'var(--foreground)' }}>
                Services
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {data.services.map((service) => (
                <div key={service.name} className="p-4 flex items-center gap-4">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: getStatusColor(service.status) }}
                  >
                    {getStatusIcon(service.status)}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {service.name}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                      {service.uptime.toFixed(2)}% uptime
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ color: getStatusColor(service.status) }}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                      {service.latency}ms latency
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Checks */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold" style={{ color: 'var(--foreground)' }}>
                Health Checks
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {data.healthChecks.map((check) => (
                <div
                  key={check.component}
                  className="p-3 rounded-lg border flex items-center gap-3"
                  style={{
                    background: 'var(--background)',
                    borderColor: getStatusColor(check.status),
                  }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: getStatusColor(check.status) }}
                  >
                    {getStatusIcon(check.status)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                      {check.component}
                    </p>
                    {check.message && (
                      <p
                        className="text-xs truncate"
                        style={{ color: 'var(--foreground)', opacity: 0.5 }}
                      >
                        {check.message}
                      </p>
                    )}
                  </div>
                  {check.responseTime && (
                    <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                      {check.responseTime}ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold" style={{ color: 'var(--foreground)' }}>
                Recent Incidents
              </h3>
            </div>
            {data.recentIncidents.length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {data.recentIncidents.map((incident) => (
                  <div key={incident.id} className="p-4 flex items-center gap-4">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        background:
                          incident.severity === 'critical'
                            ? '#ef4444'
                            : incident.severity === 'major'
                              ? '#f97316'
                              : '#eab308',
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {incident.title}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                        {new Date(incident.startedAt).toLocaleString()}
                        {incident.resolvedAt &&
                          ` — Resolved ${new Date(incident.resolvedAt).toLocaleString()}`}
                      </p>
                    </div>
                    <span
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ background: getStatusColor(incident.status) }}
                    >
                      {incident.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                No recent incidents
              </div>
            )}
          </div>
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
            href="/admin/alerts"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Alerts →
          </Link>
          <Link
            href="/admin/analytics"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Analytics →
          </Link>
          <Link
            href="/admin/jobs"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Background Jobs →
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

function getMockData(): MonitoringData {
  return {
    system: [
      { name: 'CPU Usage', value: 45, unit: '%', status: 'healthy', change: -3 },
      { name: 'Memory', value: 72, unit: '%', status: 'warning', change: 5 },
      { name: 'Disk', value: 58, unit: '%', status: 'healthy', change: 1 },
      { name: 'Network', value: 12, unit: 'MB/s', status: 'healthy', change: 8 },
    ],
    services: [
      {
        name: 'API Gateway',
        status: 'operational',
        latency: 45,
        uptime: 99.99,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'Database',
        status: 'operational',
        latency: 12,
        uptime: 99.95,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'Cache (Redis)',
        status: 'operational',
        latency: 2,
        uptime: 99.99,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'Storage',
        status: 'operational',
        latency: 85,
        uptime: 99.9,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'Search',
        status: 'operational',
        latency: 35,
        uptime: 99.85,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'Email Service',
        status: 'operational',
        latency: 120,
        uptime: 99.8,
        lastCheck: new Date().toISOString(),
      },
    ],
    healthChecks: [
      { component: 'PostgreSQL', status: 'pass', responseTime: 12 },
      { component: 'Redis', status: 'pass', responseTime: 2 },
      { component: 'Supabase Auth', status: 'pass', responseTime: 45 },
      { component: 'Supabase Storage', status: 'pass', responseTime: 85 },
      { component: 'Edge Functions', status: 'pass', responseTime: 150 },
      { component: 'DNS Resolution', status: 'pass', responseTime: 5 },
      { component: 'SSL Certificate', status: 'pass', message: 'Valid for 89 days' },
      { component: 'Rate Limiter', status: 'pass', responseTime: 1 },
      { component: 'Job Queue', status: 'pass', message: '12 jobs pending' },
    ],
    recentIncidents: [
      {
        id: '1',
        title: 'Elevated API Latency',
        severity: 'minor',
        status: 'resolved',
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        title: 'Database Connection Pool Exhaustion',
        severity: 'major',
        status: 'resolved',
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
      },
    ],
  };
}
