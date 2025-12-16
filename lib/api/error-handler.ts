/**
 * Centralized error handler for API routes
 * Provides consistent error handling and reporting
 */

import { NextResponse } from 'next/server';
import { ApiError, type ErrorCode } from './response';
import { logger } from '@/lib/logger';
import type { ZodError } from 'zod';

interface ErrorDetails {
  code: ErrorCode;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Map error to standardized error details
 */
export function mapErrorToDetails(err: unknown, _requestId?: string): ErrorDetails {
  // Handle ApiError instances
  if (err instanceof ApiError) {
    return {
      code: err.code,
      message: err.message,
      status: getStatusCode(err.code),
      details: err.details,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };
  }

  // Handle Zod validation errors
  if (isZodError(err)) {
    const zodErr = err as ZodError;
    const details = zodErr.errors.reduce((acc, e) => {
      const path = e.path.join('.');
      acc[path] = e.message;
      return acc;
    }, {} as Record<string, string>);

    return {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      status: 400,
      details,
    };
  }

  // Handle Supabase errors
  if (isSupabaseError(err)) {
    const supabaseErr = err as {
      code: string;
      message: string;
      details?: string;
    };

    // Map common Supabase error codes
    if (supabaseErr.code === '23505') {
      return {
        code: 'CONFLICT',
        message: 'A record with this value already exists',
        status: 409,
        details: { databaseCode: supabaseErr.code },
      };
    }

    if (supabaseErr.code === '23503') {
      return {
        code: 'BAD_REQUEST',
        message: 'Referenced record does not exist',
        status: 400,
        details: { databaseCode: supabaseErr.code },
      };
    }

    if (supabaseErr.code === 'PGRST116') {
      return {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        status: 404,
        details: { databaseCode: supabaseErr.code },
      };
    }

    return {
      code: 'DATABASE_ERROR',
      message: supabaseErr.message || 'Database operation failed',
      status: 500,
      details: { databaseCode: supabaseErr.code },
    };
  }

  // Handle generic Error instances
  if (err instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      status: 500,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };
  }

  // Handle unknown errors
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    status: 500,
  };
}

/**
 * Get HTTP status code for error code
 */
function getStatusCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    BAD_REQUEST: 400,
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    DATABASE_ERROR: 500,
    MEDIA_UPLOAD_ERROR: 500,
  };

  return statusMap[code] || 500;
}

/**
 * Handle API error and return appropriate response
 */
export function handleApiError(
  err: unknown,
  requestId?: string
): NextResponse {
  const errorDetails = mapErrorToDetails(err, requestId);

  // Log error
  logger.error(
    errorDetails.message,
    err,
    {
      code: errorDetails.code,
      status: errorDetails.status,
      ...errorDetails.details,
    },
    requestId
  );

  // In production, sanitize error messages
  const message =
    process.env.NODE_ENV === 'production' && errorDetails.status >= 500
      ? 'An internal error occurred'
      : errorDetails.message;

  // Build error response
  const response: {
    success: false;
    error: {
      message: string;
      code: ErrorCode;
      details?: Record<string, unknown>;
    };
    meta: {
      timestamp: string;
      requestId?: string;
    };
  } = {
    success: false,
    error: {
      message,
      code: errorDetails.code,
      ...(errorDetails.details && { details: errorDetails.details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  return NextResponse.json(response, { status: errorDetails.status });
}

/**
 * Type guards
 */
function isZodError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errors' in err &&
    Array.isArray((err as { errors: unknown }).errors)
  );
}

function isSupabaseError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
}

/**
 * Wrap async route handler with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  requestId?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      return handleApiError(err, requestId);
    }
  };
}




