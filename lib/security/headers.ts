/**
 * Security Headers Configuration
 * Phase 27: CSP, CORS, XSS protection, security headers
 */

import { NextResponse, type NextRequest } from 'next/server';

// ============================================================================
// CONTENT SECURITY POLICY
// ============================================================================

export interface CSPDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  scriptSrcElem?: string[];
  styleSrc?: string[];
  styleSrcElem?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  frameAncestors?: string[];
  formAction?: string[];
  baseUri?: string[];
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
  reportUri?: string;
  reportTo?: string;
}

const DEFAULT_CSP_DIRECTIVES: CSPDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://vercel.live',
  ],
  scriptSrcElem: [
    "'self'",
    "'unsafe-inline'",
    'https://www.googletagmanager.com',
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Required for styled components/CSS-in-JS
  ],
  styleSrcElem: [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
  ],
  imgSrc: [
    "'self'",
    'data:',
    'blob:',
    'https:',
    '*.supabase.co',
    '*.cloudflare.com',
    'https://www.google-analytics.com',
  ],
  fontSrc: [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
  ],
  connectSrc: [
    "'self'",
    '*.supabase.co',
    'wss://*.supabase.co',
    'https://www.google-analytics.com',
    'https://vitals.vercel-insights.com',
    'https://vercel.live',
  ],
  mediaSrc: [
    "'self'",
    'blob:',
    'https:',
    '*.cloudflare.com',
  ],
  objectSrc: ["'none'"],
  frameSrc: [
    "'self'",
    'https://www.youtube.com',
    'https://player.vimeo.com',
    'https://www.google.com',
    'https://vercel.live',
  ],
  frameAncestors: ["'self'"],
  formAction: ["'self'"],
  baseUri: ["'self'"],
  upgradeInsecureRequests: true,
};

/**
 * Build CSP header string from directives
 */
export function buildCSP(directives: CSPDirectives = DEFAULT_CSP_DIRECTIVES): string {
  const parts: string[] = [];

  if (directives.defaultSrc?.length) {
    parts.push(`default-src ${directives.defaultSrc.join(' ')}`);
  }
  if (directives.scriptSrc?.length) {
    parts.push(`script-src ${directives.scriptSrc.join(' ')}`);
  }
  if (directives.scriptSrcElem?.length) {
    parts.push(`script-src-elem ${directives.scriptSrcElem.join(' ')}`);
  }
  if (directives.styleSrc?.length) {
    parts.push(`style-src ${directives.styleSrc.join(' ')}`);
  }
  if (directives.styleSrcElem?.length) {
    parts.push(`style-src-elem ${directives.styleSrcElem.join(' ')}`);
  }
  if (directives.imgSrc?.length) {
    parts.push(`img-src ${directives.imgSrc.join(' ')}`);
  }
  if (directives.fontSrc?.length) {
    parts.push(`font-src ${directives.fontSrc.join(' ')}`);
  }
  if (directives.connectSrc?.length) {
    parts.push(`connect-src ${directives.connectSrc.join(' ')}`);
  }
  if (directives.mediaSrc?.length) {
    parts.push(`media-src ${directives.mediaSrc.join(' ')}`);
  }
  if (directives.objectSrc?.length) {
    parts.push(`object-src ${directives.objectSrc.join(' ')}`);
  }
  if (directives.frameSrc?.length) {
    parts.push(`frame-src ${directives.frameSrc.join(' ')}`);
  }
  if (directives.frameAncestors?.length) {
    parts.push(`frame-ancestors ${directives.frameAncestors.join(' ')}`);
  }
  if (directives.formAction?.length) {
    parts.push(`form-action ${directives.formAction.join(' ')}`);
  }
  if (directives.baseUri?.length) {
    parts.push(`base-uri ${directives.baseUri.join(' ')}`);
  }
  if (directives.upgradeInsecureRequests) {
    parts.push('upgrade-insecure-requests');
  }
  if (directives.blockAllMixedContent) {
    parts.push('block-all-mixed-content');
  }
  if (directives.reportUri) {
    parts.push(`report-uri ${directives.reportUri}`);
  }
  if (directives.reportTo) {
    parts.push(`report-to ${directives.reportTo}`);
  }

  return parts.join('; ');
}

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

const DEFAULT_CORS_CONFIG: CORSConfig = {
  allowedOrigins: [
    process.env.NEXT_PUBLIC_SITE_URL || 'https://scroungersmultimedia.com',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
  credentials: true,
};

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // Allow all if wildcard is present
  if (allowedOrigins.includes('*')) return true;

  // Check exact match
  if (allowedOrigins.includes(origin)) return true;

  // Check pattern match (e.g., *.scroungersmultimedia.com)
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      if (origin.endsWith(domain)) return true;
    }
  }

  return false;
}

/**
 * Apply CORS headers to response
 */
export function applyCORSHeaders(
  response: NextResponse,
  request: NextRequest,
  config: CORSConfig = DEFAULT_CORS_CONFIG
): NextResponse {
  const origin = request.headers.get('origin') || '';

  if (isOriginAllowed(origin, config.allowedOrigins)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));

  if (config.exposedHeaders?.length) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }

  if (config.maxAge) {
    response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  }

  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

/**
 * Handle CORS preflight request
 */
export function handlePreflightRequest(
  request: NextRequest,
  config: CORSConfig = DEFAULT_CORS_CONFIG
): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return applyCORSHeaders(response, request, config);
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: boolean | CSPDirectives;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  xContentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: Record<string, string[]>;
  strictTransportSecurity?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  xXssProtection?: boolean;
  xDnsPrefetchControl?: boolean;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
  crossOriginEmbedderPolicy?: string;
}

const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: true,
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    accelerometer: [],
    camera: [],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    microphone: [],
    payment: [],
    usb: [],
    'interest-cohort': [],
  },
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xXssProtection: true,
  xDnsPrefetchControl: true,
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS
): NextResponse {
  // Content Security Policy
  if (config.contentSecurityPolicy) {
    const csp = typeof config.contentSecurityPolicy === 'object'
      ? buildCSP(config.contentSecurityPolicy)
      : buildCSP();
    response.headers.set('Content-Security-Policy', csp);
  }

  // X-Frame-Options
  if (config.xFrameOptions) {
    response.headers.set('X-Frame-Options', config.xFrameOptions);
  }

  // X-Content-Type-Options
  if (config.xContentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }

  // Referrer-Policy
  if (config.referrerPolicy) {
    response.headers.set('Referrer-Policy', config.referrerPolicy);
  }

  // Permissions-Policy
  if (config.permissionsPolicy) {
    const policy = Object.entries(config.permissionsPolicy)
      .map(([key, value]) => `${key}=(${value.join(' ')})`)
      .join(', ');
    response.headers.set('Permissions-Policy', policy);
  }

  // Strict-Transport-Security
  if (config.strictTransportSecurity) {
    let hsts = `max-age=${config.strictTransportSecurity.maxAge}`;
    if (config.strictTransportSecurity.includeSubDomains) {
      hsts += '; includeSubDomains';
    }
    if (config.strictTransportSecurity.preload) {
      hsts += '; preload';
    }
    response.headers.set('Strict-Transport-Security', hsts);
  }

  // X-XSS-Protection (legacy but still useful)
  if (config.xXssProtection) {
    response.headers.set('X-XSS-Protection', '1; mode=block');
  }

  // X-DNS-Prefetch-Control
  if (config.xDnsPrefetchControl) {
    response.headers.set('X-DNS-Prefetch-Control', 'on');
  }

  // Cross-Origin-Opener-Policy
  if (config.crossOriginOpenerPolicy) {
    response.headers.set('Cross-Origin-Opener-Policy', config.crossOriginOpenerPolicy);
  }

  // Cross-Origin-Resource-Policy
  if (config.crossOriginResourcePolicy) {
    response.headers.set('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy);
  }

  // Cross-Origin-Embedder-Policy
  if (config.crossOriginEmbedderPolicy) {
    response.headers.set('Cross-Origin-Embedder-Policy', config.crossOriginEmbedderPolicy);
  }

  return response;
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URLs that could be dangerous
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  return sanitized;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize a URL
 */
export function sanitizeUrl(url: string): string {
  // Only allow http, https, mailto, and tel protocols
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    // If URL is relative, allow it
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }
    return '';
  }
}

export default {
  buildCSP,
  applyCORSHeaders,
  handlePreflightRequest,
  applySecurityHeaders,
  isOriginAllowed,
  sanitizeHtml,
  escapeHtml,
  sanitizeUrl,
  DEFAULT_CSP_DIRECTIVES,
  DEFAULT_CORS_CONFIG,
  DEFAULT_SECURITY_HEADERS,
};
