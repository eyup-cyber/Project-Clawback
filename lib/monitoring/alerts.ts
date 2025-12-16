/**
 * Alerting system for monitoring critical events
 */

import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/client';
import { config } from '@/lib/config';

// ============================================================================
// TYPES
// ============================================================================

type AlertSeverity = 'info' | 'warning' | 'critical';

interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  acknowledged: boolean;
}

interface AlertCondition {
  name: string;
  severity: AlertSeverity;
  check: () => Promise<boolean>;
  message: string | (() => string);
  cooldownMs: number; // Minimum time between alerts
}

interface AlertChannel {
  name: string;
  send: (alert: Alert) => Promise<boolean>;
}

// ============================================================================
// ALERT STORE
// ============================================================================

const alerts: Map<string, Alert> = new Map();
const lastAlertTime: Map<string, number> = new Map();
const MAX_STORED_ALERTS = 1000;

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function storeAlert(alert: Alert): void {
  alerts.set(alert.id, alert);
  
  // Keep only recent alerts
  if (alerts.size > MAX_STORED_ALERTS) {
    const oldestKey = alerts.keys().next().value;
    if (oldestKey) alerts.delete(oldestKey);
  }
}

// ============================================================================
// ALERT CHANNELS
// ============================================================================

const channels: AlertChannel[] = [];

/**
 * Email alert channel
 */
export const emailChannel: AlertChannel = {
  name: 'email',
  send: async (alert) => {
    try {
      const adminEmail = config.ADMIN_EMAIL;
      if (!adminEmail) {
        logger.warn('No admin email configured for alerts');
        return false;
      }

      const severityColors = {
        info: '#3B82F6',
        warning: '#F59E0B',
        critical: '#EF4444',
      };

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${severityColors[alert.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">
              ${alert.severity.toUpperCase()} Alert: ${alert.name}
            </h1>
          </div>
          <div style="background-color: #1a1a1a; color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${alert.message}</p>
            <p style="color: #888888; font-size: 14px;">
              Time: ${alert.timestamp.toISOString()}
            </p>
            ${alert.metadata ? `
              <pre style="background-color: #252525; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(alert.metadata, null, 2)}
              </pre>
            ` : ''}
          </div>
        </div>
      `;

      const result = await sendEmail({
        to: adminEmail,
        subject: `[${alert.severity.toUpperCase()}] ${alert.name}`,
        html,
      });

      return result.success;
    } catch (error) {
      logger.error('Failed to send email alert', error as Error);
      return false;
    }
  },
};

/**
 * Webhook alert channel
 */
export function createWebhookChannel(webhookUrl: string): AlertChannel {
  return {
    name: 'webhook',
    send: async (alert) => {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: alert.id,
            name: alert.name,
            severity: alert.severity,
            message: alert.message,
            metadata: alert.metadata,
            timestamp: alert.timestamp.toISOString(),
          }),
        });

        return response.ok;
      } catch (error) {
        logger.error('Failed to send webhook alert', error as Error);
        return false;
      }
    },
  };
}

/**
 * Console/log alert channel (always active)
 */
const logChannel: AlertChannel = {
  name: 'log',
  send: async (alert) => {
    const logFn = alert.severity === 'critical' 
      ? logger.error 
      : alert.severity === 'warning' 
        ? logger.warn 
        : logger.info;

    logFn(`Alert: ${alert.name}`, { 
      alertId: alert.id,
      severity: alert.severity,
      message: alert.message,
      ...alert.metadata,
    });
    
    return true;
  },
};

// ============================================================================
// ALERT CONDITIONS
// ============================================================================

const conditions: AlertCondition[] = [];

/**
 * Register an alert condition
 */
export function registerCondition(condition: AlertCondition): void {
  conditions.push(condition);
  logger.info('Alert condition registered', { name: condition.name });
}

/**
 * Register a channel for receiving alerts
 */
export function registerChannel(channel: AlertChannel): void {
  channels.push(channel);
  logger.info('Alert channel registered', { name: channel.name });
}

// ============================================================================
// ALERT TRIGGERS
// ============================================================================

/**
 * Trigger an alert manually
 */
export async function triggerAlert(
  name: string,
  severity: AlertSeverity,
  message: string,
  metadata?: Record<string, unknown>
): Promise<Alert> {
  const alert: Alert = {
    id: generateAlertId(),
    name,
    severity,
    message,
    metadata,
    timestamp: new Date(),
    acknowledged: false,
  };

  storeAlert(alert);

  // Send to log channel (always)
  await logChannel.send(alert);

  // Send to registered channels
  for (const channel of channels) {
    try {
      await channel.send(alert);
    } catch (error) {
      logger.error(`Failed to send alert to ${channel.name}`, error as Error);
    }
  }

  return alert;
}

/**
 * Check all registered conditions and trigger alerts
 */
export async function checkConditions(): Promise<Alert[]> {
  const triggeredAlerts: Alert[] = [];

  for (const condition of conditions) {
    try {
      // Check cooldown
      const lastTime = lastAlertTime.get(condition.name) || 0;
      if (Date.now() - lastTime < condition.cooldownMs) {
        continue;
      }

      const shouldAlert = await condition.check();
      
      if (shouldAlert) {
        const message = typeof condition.message === 'function' 
          ? condition.message() 
          : condition.message;

        const alert = await triggerAlert(
          condition.name,
          condition.severity,
          message
        );

        lastAlertTime.set(condition.name, Date.now());
        triggeredAlerts.push(alert);
      }
    } catch (error) {
      logger.error(`Error checking condition: ${condition.name}`, error as Error);
    }
  }

  return triggeredAlerts;
}

// ============================================================================
// PRE-DEFINED CONDITIONS
// ============================================================================

// Track error counts for threshold-based alerting
const errorCountWindow: number[] = [];
const ERROR_WINDOW_SIZE = 100;

export function recordError(): void {
  errorCountWindow.push(Date.now());
  if (errorCountWindow.length > ERROR_WINDOW_SIZE) {
    errorCountWindow.shift();
  }
}

/**
 * High error rate condition
 */
export const highErrorRateCondition: AlertCondition = {
  name: 'High Error Rate',
  severity: 'critical',
  check: async () => {
    const oneMinuteAgo = Date.now() - 60_000;
    const recentErrors = errorCountWindow.filter((t) => t > oneMinuteAgo).length;
    return recentErrors > 50; // More than 50 errors in the last minute
  },
  message: 'High error rate detected. More than 50 errors in the last minute.',
  cooldownMs: 5 * 60_000, // 5 minutes
};

// Track response times
const responseTimeWindow: number[] = [];
const RESPONSE_TIME_WINDOW_SIZE = 100;

export function recordResponseTime(durationMs: number): void {
  responseTimeWindow.push(durationMs);
  if (responseTimeWindow.length > RESPONSE_TIME_WINDOW_SIZE) {
    responseTimeWindow.shift();
  }
}

/**
 * High latency condition
 */
export const highLatencyCondition: AlertCondition = {
  name: 'High Latency',
  severity: 'warning',
  check: async () => {
    if (responseTimeWindow.length < 10) return false;
    const avgLatency = responseTimeWindow.reduce((a, b) => a + b, 0) / responseTimeWindow.length;
    return avgLatency > 2000; // Average latency over 2 seconds
  },
  message: () => {
    const avg = responseTimeWindow.reduce((a, b) => a + b, 0) / responseTimeWindow.length;
    return `High average latency detected: ${avg.toFixed(0)}ms`;
  },
  cooldownMs: 10 * 60_000, // 10 minutes
};

// ============================================================================
// ALERT MANAGEMENT
// ============================================================================

/**
 * Get all stored alerts
 */
export function getAlerts(options?: {
  severity?: AlertSeverity;
  acknowledged?: boolean;
  limit?: number;
}): Alert[] {
  let result = Array.from(alerts.values());

  if (options?.severity) {
    result = result.filter((a) => a.severity === options.severity);
  }

  if (options?.acknowledged !== undefined) {
    result = result.filter((a) => a.acknowledged === options.acknowledged);
  }

  // Sort by timestamp descending
  result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (options?.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(id: string): boolean {
  const alert = alerts.get(id);
  if (alert) {
    alert.acknowledged = true;
    logger.info('Alert acknowledged', { alertId: id });
    return true;
  }
  return false;
}

/**
 * Clear all acknowledged alerts
 */
export function clearAcknowledgedAlerts(): number {
  let count = 0;
  for (const [id, alert] of alerts.entries()) {
    if (alert.acknowledged) {
      alerts.delete(id);
      count++;
    }
  }
  return count;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the alerting system with default conditions and channels
 */
export function initializeAlerts(): void {
  // Register default conditions
  registerCondition(highErrorRateCondition);
  registerCondition(highLatencyCondition);

  // Register email channel if configured
  if (config.RESEND_API_KEY && config.ADMIN_EMAIL) {
    registerChannel(emailChannel);
  }

  logger.info('Alert system initialized', {
    conditions: conditions.length,
    channels: channels.length + 1, // +1 for log channel
  });
}

