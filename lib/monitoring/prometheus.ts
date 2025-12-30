/**
 * Prometheus Metrics
 * Custom metrics for application monitoring
 */

// Metric types
type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

interface MetricLabels {
  [key: string]: string;
}

interface Metric {
  name: string;
  help: string;
  type: MetricType;
  labels: string[];
  values: Map<string, { value: number; timestamp: number }>;
}

interface HistogramBucket {
  le: number | '+Inf';
  count: number;
}

interface HistogramMetric extends Metric {
  buckets: number[];
  histogramData: Map<string, { buckets: HistogramBucket[]; sum: number; count: number }>;
}

// Metrics registry
const metrics = new Map<string, Metric | HistogramMetric>();

// Default histogram buckets
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Create a counter metric
 */
export function createCounter(name: string, help: string, labels: string[] = []): void {
  metrics.set(name, {
    name,
    help,
    type: 'counter',
    labels,
    values: new Map(),
  });
}

/**
 * Create a gauge metric
 */
export function createGauge(name: string, help: string, labels: string[] = []): void {
  metrics.set(name, {
    name,
    help,
    type: 'gauge',
    labels,
    values: new Map(),
  });
}

/**
 * Create a histogram metric
 */
export function createHistogram(
  name: string,
  help: string,
  labels: string[] = [],
  buckets: number[] = DEFAULT_BUCKETS
): void {
  const histogram: HistogramMetric = {
    name,
    help,
    type: 'histogram',
    labels,
    values: new Map(),
    buckets: [...buckets].sort((a, b) => a - b),
    histogramData: new Map(),
  };
  metrics.set(name, histogram);
}

/**
 * Get label key from labels object
 */
function getLabelKey(labels: MetricLabels): string {
  const sortedKeys = Object.keys(labels).sort();
  return sortedKeys.map((k) => `${k}="${labels[k]}"`).join(',');
}

/**
 * Increment a counter
 */
export function incrementCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
  const metric = metrics.get(name);
  if (!metric || metric.type !== 'counter') return;

  const key = getLabelKey(labels);
  const current = metric.values.get(key);
  metric.values.set(key, {
    value: (current?.value || 0) + value,
    timestamp: Date.now(),
  });
}

/**
 * Set a gauge value
 */
export function setGauge(name: string, value: number, labels: MetricLabels = {}): void {
  const metric = metrics.get(name);
  if (!metric || metric.type !== 'gauge') return;

  const key = getLabelKey(labels);
  metric.values.set(key, {
    value,
    timestamp: Date.now(),
  });
}

/**
 * Increment a gauge
 */
export function incrementGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
  const metric = metrics.get(name);
  if (!metric || metric.type !== 'gauge') return;

  const key = getLabelKey(labels);
  const current = metric.values.get(key);
  metric.values.set(key, {
    value: (current?.value || 0) + value,
    timestamp: Date.now(),
  });
}

/**
 * Decrement a gauge
 */
export function decrementGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
  incrementGauge(name, labels, -value);
}

/**
 * Observe a value for histogram
 */
export function observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
  const metric = metrics.get(name) as HistogramMetric | undefined;
  if (!metric || metric.type !== 'histogram') return;

  const key = getLabelKey(labels);
  let data = metric.histogramData.get(key);

  if (!data) {
    data = {
      buckets: metric.buckets.map((le) => ({ le, count: 0 })),
      sum: 0,
      count: 0,
    };
    data.buckets.push({ le: '+Inf' as const, count: 0 });
    metric.histogramData.set(key, data);
  }

  // Update buckets
  for (const bucket of data.buckets) {
    if (bucket.le === '+Inf' || value <= bucket.le) {
      bucket.count++;
    }
  }

  data.sum += value;
  data.count++;
}

/**
 * Timer helper for histograms
 */
export function startTimer(name: string, labels: MetricLabels = {}): () => number {
  const start = process.hrtime.bigint();

  return () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
    observeHistogram(name, duration, labels);
    return duration;
  };
}

/**
 * Format metrics in Prometheus exposition format
 */
export function getMetricsString(): string {
  const lines: string[] = [];

  for (const [, metric] of metrics) {
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    lines.push(`# TYPE ${metric.name} ${metric.type}`);

    if (metric.type === 'histogram') {
      const histMetric = metric as HistogramMetric;

      for (const [labelKey, data] of histMetric.histogramData) {
        const labelStr = labelKey ? `{${labelKey}}` : '';

        for (const bucket of data.buckets) {
          const leLabel = bucket.le === '+Inf' ? '+Inf' : bucket.le.toString();
          const bucketLabels = labelKey ? `{${labelKey},le="${leLabel}"}` : `{le="${leLabel}"}`;
          lines.push(`${metric.name}_bucket${bucketLabels} ${bucket.count}`);
        }

        lines.push(`${metric.name}_sum${labelStr} ${data.sum}`);
        lines.push(`${metric.name}_count${labelStr} ${data.count}`);
      }
    } else {
      for (const [labelKey, { value }] of metric.values) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        lines.push(`${metric.name}${labelStr} ${value}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  for (const metric of metrics.values()) {
    metric.values.clear();
    if (metric.type === 'histogram') {
      (metric as HistogramMetric).histogramData.clear();
    }
  }
}

/**
 * Get all metric names
 */
export function getMetricNames(): string[] {
  return Array.from(metrics.keys());
}

/**
 * Check if a metric exists
 */
export function hasMetric(name: string): boolean {
  return metrics.has(name);
}

// ============================================
// Pre-defined application metrics
// ============================================

// HTTP metrics
createCounter('http_requests_total', 'Total number of HTTP requests', ['method', 'path', 'status']);
createHistogram(
  'http_request_duration_seconds',
  'HTTP request duration in seconds',
  ['method', 'path'],
  DEFAULT_BUCKETS
);

// Database metrics
createCounter('db_queries_total', 'Total number of database queries', ['operation', 'table']);
createHistogram(
  'db_query_duration_seconds',
  'Database query duration in seconds',
  ['operation', 'table'],
  DEFAULT_BUCKETS
);
createGauge('db_connections_active', 'Number of active database connections');

// Cache metrics
createCounter('cache_hits_total', 'Total cache hits', ['cache']);
createCounter('cache_misses_total', 'Total cache misses', ['cache']);
createGauge('cache_size_bytes', 'Cache size in bytes', ['cache']);

// Authentication metrics
createCounter('auth_logins_total', 'Total login attempts', ['status', 'method']);
createCounter('auth_2fa_verifications_total', 'Total 2FA verification attempts', ['status']);

// Content metrics
createCounter('posts_created_total', 'Total posts created', ['content_type']);
createCounter('posts_published_total', 'Total posts published', ['content_type']);
createGauge('posts_pending_review', 'Posts pending review');

// Search metrics
createCounter('search_queries_total', 'Total search queries');
createHistogram(
  'search_duration_seconds',
  'Search query duration',
  [],
  [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2]
);

// Job queue metrics
createGauge('job_queue_size', 'Number of jobs in queue', ['queue', 'status']);
createCounter('jobs_processed_total', 'Total jobs processed', ['queue', 'status']);
createHistogram('job_duration_seconds', 'Job processing duration', ['queue'], DEFAULT_BUCKETS);

// Error metrics
createCounter('errors_total', 'Total errors', ['type', 'component']);

// Business metrics
createCounter('signups_total', 'Total user signups', ['source']);
createCounter('content_reports_total', 'Total content reports', ['type']);
createGauge('active_users', 'Number of active users', ['period']);

// Export convenience functions for common metrics
export const httpMetrics = {
  recordRequest: (method: string, path: string, status: number, duration: number) => {
    incrementCounter('http_requests_total', {
      method,
      path,
      status: String(status),
    });
    observeHistogram('http_request_duration_seconds', duration, {
      method,
      path,
    });
  },
};

export const dbMetrics = {
  recordQuery: (operation: string, table: string, duration: number) => {
    incrementCounter('db_queries_total', { operation, table });
    observeHistogram('db_query_duration_seconds', duration, {
      operation,
      table,
    });
  },
  setActiveConnections: (count: number) => {
    setGauge('db_connections_active', count);
  },
};

export const cacheMetrics = {
  recordHit: (cacheName: string) => incrementCounter('cache_hits_total', { cache: cacheName }),
  recordMiss: (cacheName: string) => incrementCounter('cache_misses_total', { cache: cacheName }),
  setSize: (cacheName: string, bytes: number) =>
    setGauge('cache_size_bytes', bytes, { cache: cacheName }),
};

export const authMetrics = {
  recordLogin: (success: boolean, method: string) => {
    incrementCounter('auth_logins_total', {
      status: success ? 'success' : 'failure',
      method,
    });
  },
  record2FA: (success: boolean) => {
    incrementCounter('auth_2fa_verifications_total', {
      status: success ? 'success' : 'failure',
    });
  },
};

export const searchMetrics = {
  recordSearch: (duration: number) => {
    incrementCounter('search_queries_total');
    observeHistogram('search_duration_seconds', duration);
  },
};

export const jobMetrics = {
  setQueueSize: (queue: string, status: string, size: number) => {
    setGauge('job_queue_size', size, { queue, status });
  },
  recordJob: (queue: string, success: boolean, duration: number) => {
    incrementCounter('jobs_processed_total', {
      queue,
      status: success ? 'success' : 'failure',
    });
    observeHistogram('job_duration_seconds', duration, { queue });
  },
};

export const errorMetrics = {
  record: (type: string, component: string) => {
    incrementCounter('errors_total', { type, component });
  },
};
