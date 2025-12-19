/**
 * Unit tests for rate limiting
 */

import {
  checkRateLimit,
  getIdentifier,
  clearRateLimit,
  clearAllRateLimits,
  RATE_LIMITS,
} from '@/lib/security/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  describe('getIdentifier', () => {
    it('should return user identifier when userId provided', () => {
      const request = new Request('http://localhost/api/test');
      const identifier = getIdentifier(request, 'user-123');
      expect(identifier).toBe('user:user-123');
    });

    it('should return IP identifier when no userId', () => {
      const request = new Request('http://localhost/api/test');
      const identifier = getIdentifier(request);
      expect(identifier).toBe('ip:unknown');
    });

    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });
      const identifier = getIdentifier(request);
      expect(identifier).toBe('ip:192.168.1.1');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkRateLimit('test-user', { maxRequests: 5, windowMs: 60000 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track multiple requests', () => {
      const config = { maxRequests: 3, windowMs: 60000 };
      
      const r1 = checkRateLimit('test-user', config);
      expect(r1.remaining).toBe(2);
      
      const r2 = checkRateLimit('test-user', config);
      expect(r2.remaining).toBe(1);
      
      const r3 = checkRateLimit('test-user', config);
      expect(r3.remaining).toBe(0);
    });

    it('should block requests exceeding limit', () => {
      const config = { maxRequests: 2, windowMs: 60000 };
      
      checkRateLimit('test-user', config);
      checkRateLimit('test-user', config);
      
      const result = checkRateLimit('test-user', config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should isolate rate limits by identifier', () => {
      const config = { maxRequests: 1, windowMs: 60000 };
      
      checkRateLimit('user-1', config);
      const result1 = checkRateLimit('user-1', config);
      expect(result1.success).toBe(false);
      
      const result2 = checkRateLimit('user-2', config);
      expect(result2.success).toBe(true);
    });

    it('should use default API config', () => {
      const result = checkRateLimit('test-user');
      expect(result.remaining).toBe(RATE_LIMITS.api.maxRequests - 1);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for identifier', () => {
      const config = { maxRequests: 1, windowMs: 60000 };
      
      checkRateLimit('test-user', config);
      let result = checkRateLimit('test-user', config);
      expect(result.success).toBe(false);
      
      clearRateLimit('test-user');
      
      result = checkRateLimit('test-user', config);
      expect(result.success).toBe(true);
    });
  });
});
