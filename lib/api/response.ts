import { NextResponse } from 'next/server';

// ============================================================================
// STANDARDIZED API RESPONSE HELPERS
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Generate a unique request ID for tracking
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================================================
// SUCCESS RESPONSES
// ============================================================================

export function success<T>(
  data: T,
  status: number = 200,
  headers?: HeadersInit
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    },
    { status, headers }
  );
}

export function created<T>(data: T, headers?: HeadersInit): NextResponse<ApiSuccessResponse<T>> {
  return success(data, 201, headers);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ============================================================================
// PAGINATED RESPONSES
// ============================================================================

export function paginated<T>(
  data: T[],
  options: {
    page: number;
    limit: number;
    total: number;
  },
  headers?: HeadersInit
): NextResponse<PaginatedResponse<T>> {
  const { page, limit, total } = options;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    },
    { status: 200, headers }
  );
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'DATABASE_ERROR'
  | 'MEDIA_UPLOAD_ERROR'
  | 'PARSE_ERROR'
  | 'LIMIT_EXCEEDED';

const STATUS_CODES: Record<ErrorCode, number> = {
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
  PARSE_ERROR: 400,
  LIMIT_EXCEEDED: 429,
};

export function error(
  message: string,
  code: ErrorCode = 'INTERNAL_ERROR',
  details?: Record<string, unknown>,
  headers?: HeadersInit
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    },
    { status: STATUS_CODES[code], headers }
  );
}

// Convenience error methods
export const badRequest = (message: string, details?: Record<string, unknown>) =>
  error(message, 'BAD_REQUEST', details);

export const validationError = (message: string, details?: Record<string, unknown>) =>
  error(message, 'VALIDATION_ERROR', details);

export const unauthorized = (message: string = 'Authentication required') =>
  error(message, 'UNAUTHORIZED');

export const forbidden = (message: string = 'Access denied') => error(message, 'FORBIDDEN');

export const notFound = (resource: string = 'Resource') =>
  error(`${resource} not found`, 'NOT_FOUND');

export const methodNotAllowed = (allowed: string[]) =>
  error(`Method not allowed. Allowed: ${allowed.join(', ')}`, 'METHOD_NOT_ALLOWED');

export const conflict = (message: string) => error(message, 'CONFLICT');

export const rateLimited = (retryAfter: number = 60) =>
  error(`Rate limit exceeded. Try again in ${retryAfter} seconds`, 'RATE_LIMITED', undefined, {
    'Retry-After': retryAfter.toString(),
  });

export const internalError = (message: string = 'An unexpected error occurred') =>
  error(message, 'INTERNAL_ERROR');

export const databaseError = (message: string = 'Database operation failed') =>
  error(message, 'DATABASE_ERROR');

// ============================================================================
// HANDLE THROWN ERRORS
// ============================================================================

export function handleApiError(err: unknown, requestId?: string): NextResponse<ApiErrorResponse> {
  // Import error handler dynamically to avoid circular dependency
  // In production, this will be optimized by Next.js
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { handleApiError: handleError } = require('./error-handler');
    return handleError(err, requestId);
  } catch {
    // Fallback to basic error handling if import fails
    console.error('[API Error]', err);
    return internalError('An unexpected error occurred');
  }
}

// ============================================================================
// CUSTOM API ERROR CLASS
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new ApiError(message, 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Authentication required') {
    return new ApiError(message, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Access denied') {
    return new ApiError(message, 'FORBIDDEN');
  }

  static notFound(resource: string = 'Resource') {
    return new ApiError(`${resource} not found`, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new ApiError(message, 'CONFLICT');
  }

  static validation(message: string, details?: Record<string, unknown>) {
    return new ApiError(message, 'VALIDATION_ERROR', details);
  }
}
