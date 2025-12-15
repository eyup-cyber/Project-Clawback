import { NextRequest } from 'next/server';
import { success } from '@/lib/api';
import { getHealthStatus } from '@/lib/monitoring/health';
import { applySecurityHeaders } from '@/lib/security/headers';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { handleApiError } from './error-handler';

// ============================================================================
// GET /api/health - Enhanced health check endpoint
// ============================================================================
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    createContext(requestId, 'GET', '/api/health', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    });

    logger.debug('Health check requested', {}, requestId);

    const healthStatus = await getHealthStatus();

    const statusCode = healthStatus.status === 'unhealthy' ? 503 : healthStatus.status === 'degraded' ? 200 : 200;

    const response = success(healthStatus, statusCode);
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}



