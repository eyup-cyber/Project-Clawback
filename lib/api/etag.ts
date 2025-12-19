/**
 * ETag Support for Conditional Requests
 * Implements HTTP caching with ETags for efficient bandwidth usage
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Generate an ETag from data
 */
export function generateETag(data: unknown): string {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash}"`;
}

/**
 * Generate a weak ETag (for semantically equivalent responses)
 */
export function generateWeakETag(data: unknown): string {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16);
  return `W/"${hash}"`;
}

/**
 * Generate ETag from timestamp and version
 */
export function generateTimestampETag(timestamp: Date | string, version?: string): string {
  const ts = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  const combined = version ? `${ts}-${version}` : String(ts);
  return `"${combined}"`;
}

/**
 * Check if request has matching ETag (Not Modified)
 */
export function checkIfNoneMatch(
  requestHeaders: Headers,
  currentETag: string
): boolean {
  const ifNoneMatch = requestHeaders.get('if-none-match');
  if (!ifNoneMatch) return false;

  // Handle multiple ETags
  const tags = ifNoneMatch.split(',').map((t) => t.trim());
  
  // Check for wildcard
  if (tags.includes('*')) return true;

  // Check for matching tag (handle weak comparison)
  const normalizedCurrent = currentETag.replace(/^W\//, '');
  return tags.some((tag) => {
    const normalizedTag = tag.replace(/^W\//, '');
    return normalizedTag === normalizedCurrent;
  });
}

/**
 * Check If-Match header for conditional updates
 */
export function checkIfMatch(
  requestHeaders: Headers,
  currentETag: string
): boolean {
  const ifMatch = requestHeaders.get('if-match');
  if (!ifMatch) return true; // No If-Match means proceed

  // Handle multiple ETags
  const tags = ifMatch.split(',').map((t) => t.trim());
  
  // Wildcard matches any
  if (tags.includes('*')) return true;

  // Strong comparison (no weak tags)
  return tags.some((tag) => tag === currentETag && !tag.startsWith('W/'));
}

/**
 * Build response with ETag headers
 */
export function responseWithETag<T>(
  data: T,
  options: {
    etag?: string;
    weak?: boolean;
    maxAge?: number;
    staleWhileRevalidate?: number;
    isPrivate?: boolean;
  } = {}
): NextResponse<T> {
  const {
    weak = false,
    maxAge = 60,
    staleWhileRevalidate = 0,
    isPrivate = false,
  } = options;

  const etag = options.etag || (weak ? generateWeakETag(data) : generateETag(data));

  // Build Cache-Control header
  const cacheDirectives = [
    isPrivate ? 'private' : 'public',
    `max-age=${maxAge}`,
  ];
  
  if (staleWhileRevalidate > 0) {
    cacheDirectives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  const response = NextResponse.json(data);
  response.headers.set('ETag', etag);
  response.headers.set('Cache-Control', cacheDirectives.join(', '));
  response.headers.set('Vary', 'Accept-Encoding');

  return response;
}

/**
 * Create 304 Not Modified response
 */
export function notModifiedResponse(etag: string): NextResponse {
  return new NextResponse(null, {
    status: 304,
    headers: {
      ETag: etag,
    },
  });
}

/**
 * Create 412 Precondition Failed response
 */
export function preconditionFailedResponse(): NextResponse {
  return NextResponse.json(
    { error: { message: 'Precondition Failed', code: 'PRECONDITION_FAILED' } },
    { status: 412 }
  );
}

/**
 * Handle conditional GET request
 */
export function handleConditionalGet<T>(
  request: Request,
  data: T,
  options: {
    etag?: string;
    weak?: boolean;
    maxAge?: number;
    staleWhileRevalidate?: number;
    isPrivate?: boolean;
  } = {}
): NextResponse<T> | NextResponse {
  const { weak = false } = options;
  const etag = options.etag || (weak ? generateWeakETag(data) : generateETag(data));

  // Check If-None-Match
  if (checkIfNoneMatch(request.headers, etag)) {
    return notModifiedResponse(etag);
  }

  return responseWithETag(data, { ...options, etag });
}

/**
 * Handle conditional PUT/PATCH request
 */
export function handleConditionalUpdate(
  request: Request,
  currentETag: string
): { proceed: boolean; response?: NextResponse } {
  // Check If-Match for concurrent modification
  if (!checkIfMatch(request.headers, currentETag)) {
    return {
      proceed: false,
      response: preconditionFailedResponse(),
    };
  }

  return { proceed: true };
}

/**
 * Middleware helper for ETag handling
 */
export function withETag<T>(
  handler: (request: Request) => Promise<{ data: T; etag?: string }>
) {
  return async (request: Request): Promise<NextResponse> => {
    const { data, etag } = await handler(request);
    return handleConditionalGet(request, data, { etag });
  };
}
