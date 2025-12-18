/**
 * CSRF protection utilities
 * Provides token generation and validation
 */

import { cookies } from 'next/headers';
import { randomBytes, createHmac } from 'crypto';
import { logger } from '@/lib/logger';

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(secret: string): string {
  const token = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  const hmac = createHmac('sha256', secret).update(token + timestamp).digest('hex');

  return `${token}.${timestamp}.${hmac}`;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(
  token: string,
  secret: string,
  maxAge: number = CSRF_TOKEN_EXPIRY
): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [tokenPart, timestamp, hmac] = parts;

  // Check expiry
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (tokenAge > maxAge || tokenAge < 0) {
    return false;
  }

  // Verify HMAC
  const expectedHmac = createHmac('sha256', secret)
    .update(tokenPart + timestamp)
    .digest('hex');

  return hmac === expectedHmac;
}

/**
 * Get or create CSRF token for a request
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_TOKEN_COOKIE);

  const secret = process.env.CSRF_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret';

  if (existing?.value && validateCsrfToken(existing.value, secret)) {
    return existing.value;
  }

  // Generate new token
  const token = generateCsrfToken(secret);

  cookieStore.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY / 1000,
    path: '/',
  });

  return token;
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfFromRequest(request: Request): Promise<boolean> {
  const token = request.headers.get(CSRF_TOKEN_HEADER);
  if (!token) {
    return false;
  }

  const secret = process.env.CSRF_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret';
  return validateCsrfToken(token, secret);
}

/**
 * Validate CSRF and throw if invalid
 */
export async function assertCsrfOrThrow(request: Request): Promise<void> {
  const valid = await validateCsrfFromRequest(request);
  if (!valid) {
    logger.warn('CSRF validation failed', { path: (request as any).url });
    throw new Error('Invalid CSRF token');
  }
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  return protectedMethods.includes(method.toUpperCase());
}

/**
 * Attach CSRF cookie manually (useful for API routes issuing tokens)
 */
export async function attachCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY / 1000,
    path: '/',
  });
}




