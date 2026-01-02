/**
 * Route wrapper for standardizing API routes
 * Provides logging, error handling, security headers, and request context
 */

import type { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { clearContext, createContext, generateRequestId } from '@/lib/logger/context';
import { assertCsrfOrThrow, requiresCsrfProtection } from '@/lib/security/csrf';
import { applySecurityHeaders } from '@/lib/security/headers';
import { handleApiError } from './error-handler';
import type { UserRole } from './middleware';

interface RouteOptions {
  requireAuth?: boolean;
  requireRole?: UserRole[];
  logRequest?: boolean;
  csrf?: boolean; // defaults to true for state-changing methods
}

/**
 * Wrap an API route handler with standard middleware
 */
export function withRouteHandler<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: RouteOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const method = request.method;
    const path = new URL(request.url).pathname;

    try {
      // Create request context
      createContext(requestId, method, path, {
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      });

      // Log request if enabled
      if (options.logRequest !== false) {
        logger.info(`${method} ${path}`, { method, path }, requestId);
      }

      // CSRF protection for state-changing methods
      const csrfEnabled = options.csrf !== false;
      if (csrfEnabled && requiresCsrfProtection(method)) {
        await assertCsrfOrThrow(request);
      }

      // Authentication check (if required)
      if (options.requireAuth) {
        const { requireAuth, requireRole } = await import('./middleware');
        const { user } = await requireAuth();

        if (options.requireRole && options.requireRole.length > 0) {
          await requireRole(...options.requireRole);
        }

        // Update context with user ID
        const { updateContext } = await import('@/lib/logger/context');
        updateContext(requestId, { userId: user.id });
      }

      // Execute handler
      const response = await handler(request, ...args);

      // Log performance
      const duration = Date.now() - startTime;
      logger.performance(`${method} ${path}`, duration, { status: response.status }, requestId);

      // Apply security headers
      return applySecurityHeaders(response);
    } catch (err) {
      return handleApiError(err, requestId);
    } finally {
      clearContext(requestId);
    }
  };
}
