/**
 * Prometheus Metrics Endpoint
 * Exposes application metrics in Prometheus format
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getMetricsString } from '@/lib/monitoring/prometheus';

/**
 * GET /api/metrics/prometheus
 * Returns metrics in Prometheus exposition format
 */
export async function GET(request: NextRequest) {
  // Optional: Basic authentication for metrics endpoint
  const authHeader = request.headers.get('authorization');
  const metricsToken = process.env.METRICS_TOKEN;

  if (metricsToken && authHeader !== `Bearer ${metricsToken}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const metrics = getMetricsString();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
