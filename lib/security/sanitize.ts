/**
 * Input sanitization utilities
 * Prevents XSS and other injection attacks
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'a',
      'img',
      'iframe',
      'div',
      'span',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'width',
      'height',
      'class',
      'id',
      'style',
      'data-*',
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize plain text (removes HTML tags)
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize URL to prevent XSS and protocol-based attacks
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url);

    // Only allow http, https, and mailto protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'file';
  }

  // Remove path components
  const basename = filename.split('/').pop() || filename.split('\\').pop() || filename;

  // Remove dangerous characters
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
}

/**
 * Sanitize JSON content (for rich text editors)
 */
export function sanitizeJsonContent(json: unknown): unknown {
  if (typeof json !== 'object' || json === null) {
    return json;
  }

  if (Array.isArray(json)) {
    return json.map(sanitizeJsonContent);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json)) {
    if (typeof value === 'string') {
      // Sanitize string values that might contain HTML
      sanitized[key] = sanitizeHtml(value);
    } else {
      sanitized[key] = sanitizeJsonContent(value);
    }
  }

  return sanitized;
}

/**
 * Escape special characters for use in SQL (defense in depth)
 * Note: Supabase uses parameterized queries, but this provides extra safety
 */
export function escapeSqlString(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.replace(/'/g, "''");
}
