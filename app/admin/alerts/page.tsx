'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Alert {
  id: string;
  name: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  status: 'firing' | 'resolved' | 'silenced';
  message: string;
  source: string;
  value?: number;
  threshold?: number;
  firedAt: string;
  resolvedAt?: string;
  silencedUntil?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  severity: 'critical' | 'warning' | 'info';
  channels: string[];
  cooldown: number; // minutes
}

type AlertStatus = 'all' | 'firing' | 'resolved' | 'silenced';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertStatus>('firing');
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules'>('alerts');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/alerts?status=${filter}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch alerts');
      }

      setAlerts(result.data?.alerts || getMockAlerts());
      setRules(result.data?.rules || getMockRules());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
      setAlerts(getMockAlerts());
      setRules(getMockRules());
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(() => void fetchAlerts(), 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledge = async (alert: Alert) => {
    try {
      await fetch(`/api/admin/alerts/${alert.id}/acknowledge`, {
        method: 'POST',
      });
      void fetchAlerts();
    } catch {
      setError('Failed to acknowledge alert');
    }
  };

  const handleSilence = async (alert: Alert, minutes: number) => {
    try {
      await fetch(`/api/admin/alerts/${alert.id}/silence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      void fetchAlerts();
    } catch {
      setError('Failed to silence alert');
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      await fetch(`/api/admin/alerts/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      void fetchAlerts();
    } catch {
      setError('Failed to update rule');
    }
  };

  const getAlertTypeStyles = (type: string) => {
    switch (type) {
      case 'critical':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '🚨' };
      case 'error':
        return { bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316', icon: '❌' };
      case 'warning':
        return { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308', icon: '⚠️' };
      default:
        return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: 'ℹ️' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'firing':
        return { bg: '#ef4444', text: 'Firing' };
      case 'resolved':
        return { bg: '#22c55e', text: 'Resolved' };
      case 'silenced':
        return { bg: '#6b7280', text: 'Silenced' };
      default:
        return { bg: 'var(--border)', text: status };
    }
  };

  const firingCount = alerts.filter((a) => a.status === 'firing').length;
  const criticalCount = alerts.filter((a) => a.status === 'firing' && a.type === 'critical').length;

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
            Alerts
          </h1>
          <p
            style={{
              color: 'var(--foreground)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            System alerts and monitoring
          </p>
        </div>

        {firingCount > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg animate-pulse"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}
          >
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold" style={{ color: '#ef4444' }}>
                {firingCount} Active Alert{firingCount !== 1 ? 's' : ''}
              </p>
              {criticalCount > 0 && (
                <p className="text-sm" style={{ color: '#ef4444' }}>
                  {criticalCount} Critical
                </p>
              )}
            </div>
          </div>
        )}
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
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
        {(['alerts', 'rules'] as const).map((tab) => (
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
            {tab === 'alerts' ? `Alerts ${firingCount > 0 ? `(${firingCount})` : ''}` : 'Rules'}
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
            Loading alerts...
          </p>
        </div>
      ) : (
        <>
          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-2">
                {(['all', 'firing', 'resolved', 'silenced'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      filter === status ? 'ring-2 ring-[var(--primary)]' : ''
                    }`}
                    style={{
                      background: filter === status ? 'var(--primary)' : 'var(--surface)',
                      color: filter === status ? 'var(--background)' : 'var(--foreground)',
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* Alerts list */}
              <div className="space-y-3">
                {alerts
                  .filter((a) => filter === 'all' || a.status === filter)
                  .map((alert) => {
                    const styles = getAlertTypeStyles(alert.type);
                    const statusBadge = getStatusBadge(alert.status);

                    return (
                      <div
                        key={alert.id}
                        className="p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md"
                        style={{
                          background: styles.bg,
                          borderColor: styles.border,
                        }}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{styles.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold" style={{ color: 'var(--foreground)' }}>
                                {alert.name}
                              </h3>
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                style={{ background: statusBadge.bg }}
                              >
                                {statusBadge.text}
                              </span>
                            </div>
                            <p
                              className="text-sm mb-2"
                              style={{ color: 'var(--foreground)', opacity: 0.8 }}
                            >
                              {alert.message}
                            </p>
                            <div
                              className="flex items-center gap-4 text-xs"
                              style={{ color: 'var(--foreground)', opacity: 0.6 }}
                            >
                              <span>Source: {alert.source}</span>
                              <span>Fired: {new Date(alert.firedAt).toLocaleString()}</span>
                              {alert.value !== undefined && alert.threshold !== undefined && (
                                <span>
                                  Value: {alert.value} (threshold: {alert.threshold})
                                </span>
                              )}
                            </div>
                          </div>
                          {alert.status === 'firing' && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleAcknowledge(alert);
                                }}
                                className="px-3 py-1 rounded text-sm font-medium"
                                style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
                              >
                                Acknowledge
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleSilence(alert, 60);
                                }}
                                className="px-3 py-1 rounded text-sm font-medium"
                                style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
                              >
                                Silence 1h
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {alerts.filter((a) => filter === 'all' || a.status === filter).length === 0 && (
                  <div
                    className="text-center py-12 rounded-xl border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-4xl mb-2">✅</p>
                    <p style={{ color: 'var(--foreground)' }}>No alerts</p>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                      All systems operational
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div
                className="rounded-xl border overflow-hidden"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {rules.map((rule) => (
                    <div key={rule.id} className="p-4 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void handleToggleRule(rule)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${
                          rule.enabled ? '' : 'opacity-50'
                        }`}
                        style={{ background: rule.enabled ? 'var(--primary)' : 'var(--border)' }}
                        aria-label={`Toggle rule: ${rule.name}`}
                      >
                        <span
                          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                          style={{ left: rule.enabled ? '1.5rem' : '0.25rem' }}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>
                            {rule.name}
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{
                              background:
                                rule.severity === 'critical'
                                  ? '#ef4444'
                                  : rule.severity === 'warning'
                                    ? '#eab308'
                                    : '#3b82f6',
                            }}
                          >
                            {rule.severity}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                          {rule.description}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: 'var(--foreground)', opacity: 0.5 }}
                        >
                          {rule.condition} • Threshold: {rule.threshold} • Cooldown: {rule.cooldown}
                          min
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {rule.channels.map((channel) => (
                          <span
                            key={channel}
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                          >
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl p-6"
            style={{ background: 'var(--background)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
              Alert Details
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Name
                </label>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {selectedAlert.name}
                </p>
              </div>
              <div>
                <label className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Message
                </label>
                <p style={{ color: 'var(--foreground)' }}>{selectedAlert.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                    Source
                  </label>
                  <p style={{ color: 'var(--foreground)' }}>{selectedAlert.source}</p>
                </div>
                <div>
                  <label className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                    Type
                  </label>
                  <p style={{ color: 'var(--foreground)' }}>{selectedAlert.type}</p>
                </div>
              </div>
              {selectedAlert.value !== undefined && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                      Current Value
                    </label>
                    <p style={{ color: 'var(--foreground)' }}>{selectedAlert.value}</p>
                  </div>
                  <div>
                    <label className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                      Threshold
                    </label>
                    <p style={{ color: 'var(--foreground)' }}>{selectedAlert.threshold}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                    Fired At
                  </label>
                  <p style={{ color: 'var(--foreground)' }}>
                    {new Date(selectedAlert.firedAt).toLocaleString()}
                  </p>
                </div>
                {selectedAlert.resolvedAt && (
                  <div>
                    <label className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                      Resolved At
                    </label>
                    <p style={{ color: 'var(--foreground)' }}>
                      {new Date(selectedAlert.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
            href="/admin/monitoring"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            System Monitoring →
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

// Mock data
function getMockAlerts(): Alert[] {
  return [
    {
      id: '1',
      name: 'High Error Rate',
      type: 'critical',
      status: 'firing',
      message: 'Error rate exceeded 5% in the last 5 minutes',
      source: 'api-gateway',
      value: 7.2,
      threshold: 5,
      firedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: '2',
      name: 'High Memory Usage',
      type: 'warning',
      status: 'firing',
      message: 'Memory usage above 80% on worker-1',
      source: 'worker-1',
      value: 85,
      threshold: 80,
      firedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: '3',
      name: 'Database Slow Queries',
      type: 'warning',
      status: 'resolved',
      message: 'Multiple queries taking longer than 1s',
      source: 'postgres',
      firedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      resolvedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    },
    {
      id: '4',
      name: 'SSL Certificate Expiry',
      type: 'info',
      status: 'silenced',
      message: 'SSL certificate expires in 14 days',
      source: 'ssl-monitor',
      firedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      silencedUntil: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
    },
  ];
}

function getMockRules(): AlertRule[] {
  return [
    {
      id: '1',
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds threshold',
      condition: 'error_rate > threshold',
      threshold: 5,
      enabled: true,
      severity: 'critical',
      channels: ['slack', 'pagerduty'],
      cooldown: 5,
    },
    {
      id: '2',
      name: 'High CPU Usage',
      description: 'Alert when CPU usage exceeds 90%',
      condition: 'cpu_usage > threshold',
      threshold: 90,
      enabled: true,
      severity: 'warning',
      channels: ['slack'],
      cooldown: 10,
    },
    {
      id: '3',
      name: 'High Memory Usage',
      description: 'Alert when memory usage exceeds 80%',
      condition: 'memory_usage > threshold',
      threshold: 80,
      enabled: true,
      severity: 'warning',
      channels: ['slack'],
      cooldown: 10,
    },
    {
      id: '4',
      name: 'Database Connection Pool',
      description: 'Alert when connection pool is nearly exhausted',
      condition: 'db_connections > threshold',
      threshold: 90,
      enabled: true,
      severity: 'critical',
      channels: ['slack', 'pagerduty'],
      cooldown: 5,
    },
    {
      id: '5',
      name: 'Slow Response Time',
      description: 'Alert when p95 response time exceeds 2s',
      condition: 'response_time_p95 > threshold',
      threshold: 2000,
      enabled: false,
      severity: 'info',
      channels: ['slack'],
      cooldown: 15,
    },
  ];
}
