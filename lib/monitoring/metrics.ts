/**
 * Metrics collection for monitoring
 * Tracks performance, errors, and usage metrics
 */

import { logger } from '@/lib/logger';

interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

// In-memory metrics store (use external service in production)
const metricsStore: Metric[] = [];
const MAX_METRICS = 10000;

/**
 * Record a metric
 */
export function recordMetric(name: string, value: number, tags?: Record<string, string>): void {
  const metric: Metric = {
    name,
    value,
    tags,
    timestamp: Date.now(),
  };

  metricsStore.push(metric);

  // Keep only recent metrics
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Metric: ${name} = ${value}`, tags);
  }
}

/**
 * Increment a counter metric
 */
export function incrementCounter(
  name: string,
  tags?: Record<string, string>,
  value: number = 1
): void {
  recordMetric(name, value, { ...tags, type: 'counter' });
}

/**
 * Record a timing metric (duration in milliseconds)
 */
export function recordTiming(name: string, duration: number, tags?: Record<string, string>): void {
  recordMetric(name, duration, { ...tags, type: 'timing' });
}

/**
 * Record a gauge metric (current value)
 */
export function recordGauge(name: string, value: number, tags?: Record<string, string>): void {
  recordMetric(name, value, { ...tags, type: 'gauge' });
}

/**
 * Get metrics by name
 */
export function getMetrics(name: string, limit: number = 100): Metric[] {
  return metricsStore.filter((m) => m.name === name).slice(-limit);
}

/**
 * Get all metrics
 */
export function getAllMetrics(limit: number = 1000): Metric[] {
  return metricsStore.slice(-limit);
}

/**
 * Get aggregated metrics
 */
export function getAggregatedMetrics(name: string): {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
} {
  const metrics = getMetrics(name);

  if (metrics.length === 0) {
    return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
  }

  const values = metrics.map((m) => m.value);
  const sum = values.reduce((a, b) => a + b, 0);

  return {
    count: metrics.length,
    sum,
    avg: sum / metrics.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/**
 * Clear old metrics (older than maxAge milliseconds)
 */
export function clearOldMetrics(maxAge: number = 3600000): void {
  const now = Date.now();
  const cutoff = now - maxAge;

  const initialLength = metricsStore.length;
  while (metricsStore.length > 0 && metricsStore[0].timestamp < cutoff) {
    metricsStore.shift();
  }

  const cleared = initialLength - metricsStore.length;
  if (cleared > 0) {
    logger.debug(`Cleared ${cleared} old metrics`);
  }
}

// Clean up old metrics every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => clearOldMetrics(), 3600000);
}

/**
 * Get metrics by name (alias for getMetrics)
 */
export function getMetricsByName(name: string, limit: number = 100): Metric[] {
  return getMetrics(name, limit);
}

/**
 * Get metrics summary for Prometheus/monitoring endpoints
 */
export function getMetricsSummary(): {
  counters: Array<{ name: string; value: number }>;
  timings: Array<{
    name: string;
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  }>;
  gauges: Array<{ name: string; value: number }>;
  uptime: number;
} {
  const counterMetrics = metricsStore.filter((m) => m.tags?.type === 'counter');
  const timingMetrics = metricsStore.filter((m) => m.tags?.type === 'timing');
  const gaugeMetrics = metricsStore.filter((m) => m.tags?.type === 'gauge');

  // Aggregate counters by name
  const counterMap = new Map<string, number>();
  for (const m of counterMetrics) {
    counterMap.set(m.name, (counterMap.get(m.name) || 0) + m.value);
  }
  const counters = Array.from(counterMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // Aggregate timings by name
  const timingMap = new Map<string, number[]>();
  for (const m of timingMetrics) {
    if (!timingMap.has(m.name)) {
      timingMap.set(m.name, []);
    }
    timingMap.get(m.name)!.push(m.value);
  }
  const timings = Array.from(timingMap.entries()).map(([name, values]) => {
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      name,
      count: values.length,
      sum,
      avg: values.length > 0 ? sum / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  });

  // Get latest gauge values by name
  const gaugeMap = new Map<string, number>();
  for (const m of gaugeMetrics) {
    gaugeMap.set(m.name, m.value); // Latest value wins
  }
  const gauges = Array.from(gaugeMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  return {
    counters,
    timings,
    gauges,
    uptime: process.uptime(),
  };
}
