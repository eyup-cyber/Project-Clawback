/**
 * Unit tests for CSRF protection
 */

import { generateCsrfToken, validateCsrfToken, requiresCsrfProtection } from '@/lib/security/csrf';

describe('CSRF Protection', () => {
  const testSecret = 'test-secret-key-for-csrf-tokens';

  describe('generateCsrfToken', () => {
    it('should generate a token with correct format', () => {
      const token = generateCsrfToken(testSecret);

      // Token should have three parts: token.timestamp.hmac
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken(testSecret);
      const token2 = generateCsrfToken(testSecret);

      expect(token1).not.toBe(token2);
    });

    it('should include timestamp', () => {
      const token = generateCsrfToken(testSecret);
      const parts = token.split('.');
      const timestamp = parseInt(parts[1], 10);

      // Timestamp should be close to current time
      expect(timestamp).toBeCloseTo(Date.now(), -3); // Within ~1 second
    });
  });

  describe('validateCsrfToken', () => {
    it('should validate a valid token', () => {
      const token = generateCsrfToken(testSecret);
      const isValid = validateCsrfToken(token, testSecret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid token', () => {
      const isValid = validateCsrfToken('invalid-token', testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject tampered token', () => {
      const token = generateCsrfToken(testSecret);
      const parts = token.split('.');
      const tampered = `tampered.${parts[1]}.${parts[2]}`;

      const isValid = validateCsrfToken(tampered, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject expired token', () => {
      const token = generateCsrfToken(testSecret);
      const parts = token.split('.');

      // Create token with old timestamp
      const oldTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      const expiredToken = `${parts[0]}.${oldTimestamp}.${parts[2]}`;

      const isValid = validateCsrfToken(expiredToken, testSecret, 60 * 60 * 1000); // 1 hour max age
      expect(isValid).toBe(false);
    });

    it('should reject token with wrong secret', () => {
      const token = generateCsrfToken(testSecret);
      const isValid = validateCsrfToken(token, 'different-secret');

      expect(isValid).toBe(false);
    });

    it('should handle empty token', () => {
      expect(validateCsrfToken('', testSecret)).toBe(false);
    });

    it('should handle null/undefined token', () => {
      expect(validateCsrfToken(null as any, testSecret)).toBe(false);
      expect(validateCsrfToken(undefined as any, testSecret)).toBe(false);
    });
  });

  describe('requiresCsrfProtection', () => {
    it('should require CSRF for POST', () => {
      expect(requiresCsrfProtection('POST')).toBe(true);
    });

    it('should require CSRF for PUT', () => {
      expect(requiresCsrfProtection('PUT')).toBe(true);
    });

    it('should require CSRF for PATCH', () => {
      expect(requiresCsrfProtection('PATCH')).toBe(true);
    });

    it('should require CSRF for DELETE', () => {
      expect(requiresCsrfProtection('DELETE')).toBe(true);
    });

    it('should not require CSRF for GET', () => {
      expect(requiresCsrfProtection('GET')).toBe(false);
    });

    it('should not require CSRF for HEAD', () => {
      expect(requiresCsrfProtection('HEAD')).toBe(false);
    });

    it('should not require CSRF for OPTIONS', () => {
      expect(requiresCsrfProtection('OPTIONS')).toBe(false);
    });

    it('should handle lowercase method names', () => {
      expect(requiresCsrfProtection('post')).toBe(true);
      expect(requiresCsrfProtection('get')).toBe(false);
    });
  });
});
