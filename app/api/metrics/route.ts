/**
 * Metrics endpoint - Prometheus-compatible format
 * GET /api/metrics
 */

import { NextResponse } from 'next/server';
import { getMetricsSummary } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/api/middleware';
import { handleApiError } from '@/lib/api/error-handler';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format metrics in Prometheus exposition format
 */
function formatPrometheusMetrics(metrics: ReturnType<typeof getMetricsSummary>): string {
  const lines: string[] = [];

  // Request count
  lines.push('# HELP scroungers_requests_total Total number of requests');
  lines.push('# TYPE scroungers_requests_total counter');
  lines.push(`scroungers_requests_total ${metrics.counters.find(c => c.name === 'requests')?.value ?? 0}`);

  // Error count
  lines.push('# HELP scroungers_errors_total Total number of errors');
  lines.push('# TYPE scroungers_errors_total counter');
  lines.push(`scroungers_errors_total ${metrics.counters.find(c => c.name === 'errors')?.value ?? 0}`);

  // Response time metrics
  const responseTimes = metrics.timings.find(t => t.name.includes('response'));
  if (responseTimes) {
    lines.push('# HELP scroungers_response_time_seconds Response time histogram');
    lines.push('# TYPE scroungers_response_time_seconds histogram');
    lines.push(`scroungers_response_time_seconds_sum ${(responseTimes.sum ?? 0) / 1000}`);
    lines.push(`scroungers_response_time_seconds_count ${responseTimes.count ?? 0}`);
    
    // Add percentile buckets
    const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    for (const bucket of buckets) {
      // Estimate bucket count based on average (simplified)
      const avgMs = responseTimes.avg ?? 0;
      const bucketMs = bucket * 1000;
      const estimatedCount = avgMs <= bucketMs ? (responseTimes.count ?? 0) : 0;
      lines.push(`scroungers_response_time_seconds_bucket{le="${bucket}"} ${estimatedCount}`);
    }
    lines.push(`scroungers_response_time_seconds_bucket{le="+Inf"} ${responseTimes.count ?? 0}`);
  }

  // Database query metrics
  const dbTimes = metrics.timings.find(t => t.name.includes('db') || t.name.includes('database'));
  if (dbTimes) {
    lines.push('# HELP scroungers_db_query_seconds Database query time');
    lines.push('# TYPE scroungers_db_query_seconds summary');
    lines.push(`scroungers_db_query_seconds_sum ${(dbTimes.sum ?? 0) / 1000}`);
    lines.push(`scroungers_db_query_seconds_count ${dbTimes.count ?? 0}`);
  }

  // Gauge metrics
  for (const gauge of metrics.gauges) {
    const safeName = gauge.name.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`# HELP scroungers_${safeName} Gauge metric`);
    lines.push(`# TYPE scroungers_${safeName} gauge`);
    lines.push(`scroungers_${safeName} ${gauge.value}`);
  }

  return lines.join('\n');
}

// ============================================================================
// GET /api/metrics - Get metrics in Prometheus format
// ============================================================================
export async function GET(request: Request) {
  try {
    // Require editor or higher to view metrics
    await requireRole('editor', 'admin');

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'prometheus';

    const metrics = getMetricsSummary();

    if (format === 'json') {
      // JSON format for easier debugging
      return NextResponse.json({
        success: true,
        data: {
          ...metrics,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Prometheus format (default)
    const prometheusOutput = formatPrometheusMetrics(metrics);

    return new NextResponse(prometheusOutput, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    logger.error('Error fetching metrics', err as Error);
    return handleApiError(err);
  }
}

// ============================================================================
// HEAD /api/metrics - Health check for metrics endpoint
// ============================================================================
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

