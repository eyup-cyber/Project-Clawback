/**
 * Rate limiting utilities
 * Provides simple in-memory rate limiting for API endpoints
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (for production, use Redis)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  auth: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  api: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  upload: { maxRequests: 20, windowMs: 60000 }, // 20 uploads per minute
  comments: { maxRequests: 30, windowMs: 60000 }, // 30 comments per minute
} as const;

/**
 * Get identifier for rate limiting (IP address or user ID)
 */
export function getIdentifier(request: Request, userId?: string): string {
  // Prefer user ID for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `ip:${ip}`;
}

/**
 * Check rate limit for an identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  // If no entry or entry expired, create new one
  if (!entry || entry.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit middleware helper
 * Returns null if allowed, or error response if rate limited
 */
export function rateLimit(
  request: Request,
  userId?: string,
  config?: RateLimitConfig
): RateLimitResult {
  const identifier = getIdentifier(request, userId);
  return checkRateLimit(identifier, config);
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(headers: Headers, result: RateLimitResult): void {
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toString());
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
}

/**
 * Clear rate limit for an identifier (useful for testing)
 */
export function clearRateLimit(identifier: string): void {
  store.delete(identifier);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  store.clear();
}

/**
 * Rate limit by IP address (for anonymous/public endpoints)
 */
export function rateLimitByIp(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.api
): RateLimitResult {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const identifier = `ip:${ip}`;
  return checkRateLimit(identifier, config);
}

/**
 * Rate limit by user ID (for authenticated endpoints)
 */
export function rateLimitByUser(
  userId: string,
  config: RateLimitConfig = RATE_LIMITS.api
): RateLimitResult {
  const identifier = `user:${userId}`;
  return checkRateLimit(identifier, config);
}
