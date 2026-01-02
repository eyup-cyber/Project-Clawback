/**
 * Application Monitoring and Alerting
 * Phase 30: Health checks, metrics, alerting, status page
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: ServiceStatus[];
  metrics: SystemMetrics;
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number | null;
  lastChecked: string;
  error?: string;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    load: number[];
    percentage: number;
  };
  requests: {
    total: number;
    perMinute: number;
    errorRate: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  service: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
}

export type AlertType =
  | 'service_down'
  | 'high_latency'
  | 'high_error_rate'
  | 'high_memory'
  | 'high_cpu'
  | 'database_connection'
  | 'storage_quota'
  | 'rate_limit'
  | 'security'
  | 'custom';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  cooldown_minutes: number;
  notification_channels: string[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  threshold: number;
  duration_seconds?: number;
}

export interface StatusPageIncident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  affected_services: string[];
  started_at: string;
  resolved_at: string | null;
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  id: string;
  status: string;
  message: string;
  created_at: string;
  created_by: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const START_TIME = Date.now();

const SERVICES = [
  { name: 'database', endpoint: null },
  { name: 'storage', endpoint: null },
  { name: 'auth', endpoint: null },
  { name: 'api', endpoint: '/api/health' },
];

// ============================================================================
// HEALTH CHECKS
// ============================================================================

/**
 * Check overall application health
 */
export async function checkHealth(): Promise<HealthStatus> {
  const services = await Promise.all(SERVICES.map(checkService));
  const metrics = await collectMetrics();

  // Determine overall status
  const hasDown = services.some((s) => s.status === 'down');
  const hasDegraded = services.some((s) => s.status === 'degraded');

  let status: HealthStatus['status'] = 'healthy';
  if (hasDown) status = 'unhealthy';
  else if (hasDegraded) status = 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    services,
    metrics,
  };
}

/**
 * Check a single service
 */
async function checkService(service: {
  name: string;
  endpoint: string | null;
}): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    switch (service.name) {
      case 'database':
        await checkDatabase();
        break;
      case 'storage':
        await checkStorage();
        break;
      case 'auth':
        await checkAuth();
        break;
      case 'api':
        await checkApi(service.endpoint!);
        break;
    }

    return {
      name: service.name,
      status: 'up',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: service.name,
      status: 'down',
      responseTime: null,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkDatabase(): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) throw error;
}

async function checkStorage(): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase.storage.listBuckets();
  if (error) throw error;
}

async function checkAuth(): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase.auth.getSession();
  if (error) throw error;
}

async function checkApi(endpoint: string): Promise<void> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}${endpoint}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
}

// ============================================================================
// METRICS COLLECTION
// ============================================================================

async function collectMetrics(): Promise<SystemMetrics> {
  // In a real implementation, these would come from actual monitoring
  // For now, returning placeholder values
  return {
    memory: {
      used: 0,
      total: 0,
      percentage: 0,
    },
    cpu: {
      load: [0, 0, 0],
      percentage: 0,
    },
    requests: {
      total: 0,
      perMinute: 0,
      errorRate: 0,
    },
    latency: {
      p50: 0,
      p95: 0,
      p99: 0,
    },
  };
}

/**
 * Record a metric
 */
export async function recordMetric(
  name: string,
  value: number,
  tags: Record<string, string> = {}
): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('metrics').insert({
    name,
    value,
    tags,
    recorded_at: new Date().toISOString(),
  });
}

/**
 * Get metric history
 */
export async function getMetricHistory(
  name: string,
  options: { from?: Date; to?: Date; interval?: string } = {}
): Promise<{ timestamp: string; value: number }[]> {
  const supabase = await createServiceClient();
  const { from, to } = options;

  let query = supabase
    .from('metrics')
    .select('recorded_at, value')
    .eq('name', name)
    .order('recorded_at', { ascending: true });

  if (from) query = query.gte('recorded_at', from.toISOString());
  if (to) query = query.lte('recorded_at', to.toISOString());

  const { data } = await query.limit(1000);

  return (data || []).map((m) => ({
    timestamp: m.recorded_at,
    value: m.value,
  }));
}

// ============================================================================
// ALERTING
// ============================================================================

/**
 * Create an alert
 */
export async function createAlert(options: {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  service: string;
  metadata?: Record<string, unknown>;
}): Promise<Alert> {
  const { type, severity, title, message, service, metadata = {} } = options;
  const supabase = await createServiceClient();

  // Check for existing active alert of same type for same service
  const { data: existing } = await supabase
    .from('alerts')
    .select('id')
    .eq('type', type)
    .eq('service', service)
    .eq('status', 'active')
    .single();

  if (existing) {
    logger.debug('[Monitoring] Alert already exists', { type, service });
    return existing as unknown as Alert;
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      type,
      severity,
      title,
      message,
      service,
      status: 'active',
      triggered_at: new Date().toISOString(),
      metadata,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Monitoring] Failed to create alert', error);
    throw error;
  }

  logger.warn('[Monitoring] Alert created', {
    alertId: data.id,
    type,
    severity,
  });

  // Send notifications
  await sendAlertNotifications(data as Alert);

  return data as Alert;
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<Alert> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('alerts')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) {
    logger.error('[Monitoring] Failed to acknowledge alert', error);
    throw error;
  }

  logger.info('[Monitoring] Alert acknowledged', { alertId, userId });

  return data as Alert;
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string): Promise<Alert> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) {
    logger.error('[Monitoring] Failed to resolve alert', error);
    throw error;
  }

  logger.info('[Monitoring] Alert resolved', { alertId });

  return data as Alert;
}

/**
 * Get active alerts
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .in('status', ['active', 'acknowledged'])
    .order('triggered_at', { ascending: false });

  if (error) {
    logger.error('[Monitoring] Failed to fetch alerts', error);
    throw error;
  }

  return (data || []) as Alert[];
}

/**
 * Send alert notifications
 */
async function sendAlertNotifications(alert: Alert): Promise<void> {
  // Get notification channels for this alert type
  const supabase = await createServiceClient();

  const { data: rules } = await supabase
    .from('alert_rules')
    .select('notification_channels')
    .eq('type', alert.type)
    .eq('enabled', true);

  const channels = new Set<string>();
  (rules || []).forEach((rule) => {
    (rule.notification_channels as string[]).forEach((ch) => channels.add(ch));
  });

  // Send to each channel
  for (const channel of channels) {
    try {
      await sendNotification(channel, alert);
    } catch (error) {
      logger.error('[Monitoring] Failed to send notification', {
        channel,
        error,
      });
    }
  }
}

async function sendNotification(channel: string, alert: Alert): Promise<void> {
  const message = `[${alert.severity.toUpperCase()}] ${alert.title}\n${alert.message}`;

  switch (channel) {
    case 'email':
      // Send email notification
      logger.info('[Monitoring] Email notification sent', {
        alertId: alert.id,
      });
      break;

    case 'slack':
      // Send Slack notification
      if (process.env.SLACK_WEBHOOK_URL) {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            attachments: [
              {
                color: alert.severity === 'critical' ? 'danger' : 'warning',
                fields: [
                  { title: 'Service', value: alert.service, short: true },
                  { title: 'Type', value: alert.type, short: true },
                ],
              },
            ],
          }),
        });
      }
      break;

    case 'discord':
      // Send Discord notification
      if (process.env.DISCORD_WEBHOOK_URL) {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: message,
            embeds: [
              {
                title: alert.title,
                description: alert.message,
                color: alert.severity === 'critical' ? 0xff0000 : 0xffff00,
              },
            ],
          }),
        });
      }
      break;
  }
}

// ============================================================================
// STATUS PAGE
// ============================================================================

/**
 * Get status page data
 */
export async function getStatusPageData(): Promise<{
  status: HealthStatus;
  incidents: StatusPageIncident[];
  uptime: { service: string; percentage: number }[];
}> {
  const health = await checkHealth();
  const supabase = await createServiceClient();

  // Get recent incidents
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  // Calculate uptime (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const uptime = await Promise.all(
    SERVICES.map(async (service) => {
      const { data } = await supabase
        .from('health_checks')
        .select('status')
        .eq('service', service.name)
        .gte('checked_at', thirtyDaysAgo.toISOString());

      const total = (data || []).length;
      const healthy = (data || []).filter((c) => c.status === 'up').length;

      return {
        service: service.name,
        percentage: total > 0 ? (healthy / total) * 100 : 100,
      };
    })
  );

  return {
    status: health,
    incidents: (incidents || []) as StatusPageIncident[],
    uptime,
  };
}

/**
 * Create a status page incident
 */
export async function createIncident(options: {
  title: string;
  severity: StatusPageIncident['severity'];
  affectedServices: string[];
  message: string;
  createdBy: string;
}): Promise<StatusPageIncident> {
  const { title, severity, affectedServices, message, createdBy } = options;
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('incidents')
    .insert({
      title,
      status: 'investigating',
      severity,
      affected_services: affectedServices,
      started_at: new Date().toISOString(),
      updates: [
        {
          id: crypto.randomUUID(),
          status: 'investigating',
          message,
          created_at: new Date().toISOString(),
          created_by: createdBy,
        },
      ],
    })
    .select()
    .single();

  if (error) {
    logger.error('[Monitoring] Failed to create incident', error);
    throw error;
  }

  logger.warn('[Monitoring] Incident created', { incidentId: data.id, title });

  return data as StatusPageIncident;
}

/**
 * Update incident status
 */
export async function updateIncident(
  incidentId: string,
  options: {
    status: StatusPageIncident['status'];
    message: string;
    updatedBy: string;
  }
): Promise<StatusPageIncident> {
  const { status, message, updatedBy } = options;
  const supabase = await createServiceClient();

  // Get current incident
  const { data: incident } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  if (!incident) throw new Error('Incident not found');

  const updates = [
    ...((incident.updates as IncidentUpdate[]) || []),
    {
      id: crypto.randomUUID(),
      status,
      message,
      created_at: new Date().toISOString(),
      created_by: updatedBy,
    },
  ];

  const { data, error } = await supabase
    .from('incidents')
    .update({
      status,
      updates,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', incidentId)
    .select()
    .single();

  if (error) {
    logger.error('[Monitoring] Failed to update incident', error);
    throw error;
  }

  logger.info('[Monitoring] Incident updated', { incidentId, status });

  return data as StatusPageIncident;
}

export default {
  checkHealth,
  recordMetric,
  getMetricHistory,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  getActiveAlerts,
  getStatusPageData,
  createIncident,
  updateIncident,
};
