/**
 * Unit tests for security headers
 */

import { NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security/headers';

describe('Security Headers', () => {
  let response: NextResponse;

  beforeEach(() => {
    response = NextResponse.json({ test: true });
  });

  describe('applySecurityHeaders', () => {
    it('should apply Content-Security-Policy header', () => {
      const result = applySecurityHeaders(response);
      const csp = result.headers.get('Content-Security-Policy');

      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
    });

    it('should apply Strict-Transport-Security header', () => {
      const result = applySecurityHeaders(response);
      const hsts = result.headers.get('Strict-Transport-Security');

      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
    });

    it('should apply X-Content-Type-Options header', () => {
      const result = applySecurityHeaders(response);
      const header = result.headers.get('X-Content-Type-Options');

      expect(header).toBe('nosniff');
    });

    it('should apply X-Frame-Options header', () => {
      const result = applySecurityHeaders(response);
      const header = result.headers.get('X-Frame-Options');

      expect(header).toBeDefined();
      expect(['DENY', 'SAMEORIGIN']).toContain(header);
    });

    it('should apply X-XSS-Protection header', () => {
      const result = applySecurityHeaders(response);
      const header = result.headers.get('X-XSS-Protection');

      expect(header).toBeDefined();
      expect(header).toContain('1');
    });

    it('should apply Referrer-Policy header', () => {
      const result = applySecurityHeaders(response);
      const header = result.headers.get('Referrer-Policy');

      expect(header).toBeDefined();
    });

    it('should return the same response object with headers added', () => {
      const result = applySecurityHeaders(response);

      expect(result).toBe(response);
    });
  });

  describe('CSP directives', () => {
    it('should include script-src directive', () => {
      const result = applySecurityHeaders(response);
      const csp = result.headers.get('Content-Security-Policy');

      expect(csp).toContain('script-src');
    });

    it('should include style-src directive', () => {
      const result = applySecurityHeaders(response);
      const csp = result.headers.get('Content-Security-Policy');

      expect(csp).toContain('style-src');
    });

    it('should include img-src directive', () => {
      const result = applySecurityHeaders(response);
      const csp = result.headers.get('Content-Security-Policy');

      expect(csp).toContain('img-src');
    });

    it('should include connect-src for API calls', () => {
      const result = applySecurityHeaders(response);
      const csp = result.headers.get('Content-Security-Policy');

      expect(csp).toContain('connect-src');
    });

    it('should block object embedding', () => {
      const result = applySecurityHeaders(response);
      const csp = result.headers.get('Content-Security-Policy');

      expect(csp).toContain("object-src 'none'");
    });
  });
});
