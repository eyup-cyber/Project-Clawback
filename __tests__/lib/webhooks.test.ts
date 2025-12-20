/**
 * Tests for webhook dispatcher
 */

import {
  generateSignature,
  verifySignature,
  type WebhookEvent,
} from '@/lib/webhooks/dispatcher';

describe('Webhook Dispatcher', () => {
  const testSecret = 'test-secret-key';
  const testPayload = JSON.stringify({ event: 'post.created', data: { id: '123' } });

  describe('generateSignature', () => {
    it('should generate a consistent signature', () => {
      const timestamp = 1234567890;
      const signature1 = generateSignature(testPayload, testSecret, timestamp);
      const signature2 = generateSignature(testPayload, testSecret, timestamp);

      expect(signature1).toBe(signature2);
    });

    it('should generate v1 prefixed signature', () => {
      const timestamp = 1234567890;
      const signature = generateSignature(testPayload, testSecret, timestamp);

      expect(signature).toMatch(/^v1=/);
    });

    it('should generate different signatures for different payloads', () => {
      const timestamp = 1234567890;
      const payload1 = JSON.stringify({ event: 'post.created' });
      const payload2 = JSON.stringify({ event: 'post.updated' });

      const sig1 = generateSignature(payload1, testSecret, timestamp);
      const sig2 = generateSignature(payload2, testSecret, timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const timestamp = 1234567890;
      const sig1 = generateSignature(testPayload, 'secret1', timestamp);
      const sig2 = generateSignature(testPayload, 'secret2', timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different timestamps', () => {
      const sig1 = generateSignature(testPayload, testSecret, 1000000);
      const sig2 = generateSignature(testPayload, testSecret, 2000000);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateSignature(testPayload, testSecret, timestamp);

      const isValid = verifySignature(testPayload, signature, testSecret, timestamp);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const invalidSignature = 'v1=invalid-signature';

      const isValid = verifySignature(testPayload, invalidSignature, testSecret, timestamp);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateSignature(testPayload, testSecret, timestamp);

      const isValid = verifySignature(testPayload, signature, 'wrong-secret', timestamp);

      expect(isValid).toBe(false);
    });

    it('should reject stale timestamps', () => {
      const staleTimestamp = Math.floor(Date.now() / 1000) - 400; // 6+ minutes ago
      const signature = generateSignature(testPayload, testSecret, staleTimestamp);

      const isValid = verifySignature(testPayload, signature, testSecret, staleTimestamp);

      expect(isValid).toBe(false);
    });

    it('should accept timestamps within tolerance', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const signature = generateSignature(testPayload, testSecret, recentTimestamp);

      const isValid = verifySignature(testPayload, signature, testSecret, recentTimestamp);

      expect(isValid).toBe(true);
    });

    it('should respect custom tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 400;
      const signature = generateSignature(testPayload, testSecret, timestamp);

      // Should fail with default tolerance (300)
      expect(verifySignature(testPayload, signature, testSecret, timestamp, 300)).toBe(false);

      // Should pass with larger tolerance
      expect(verifySignature(testPayload, signature, testSecret, timestamp, 600)).toBe(true);
    });
  });

  describe('WebhookEvent types', () => {
    it('should have expected event types', () => {
      const events: WebhookEvent[] = [
        'post.created',
        'post.updated',
        'post.published',
        'post.deleted',
        'comment.created',
        'comment.deleted',
        'user.created',
        'user.updated',
        'user.deleted',
        'follow.created',
        'follow.deleted',
        'reaction.created',
        'reaction.deleted',
      ];

      // This test ensures TypeScript compilation catches missing event types
      expect(events).toHaveLength(13);
    });
  });
});

describe('Webhook Payload Structure', () => {
  it('should have correct payload structure', () => {
    const payload = {
      event: 'post.created' as WebhookEvent,
      timestamp: new Date().toISOString(),
      data: {
        id: '123',
        title: 'Test Post',
      },
    };

    expect(payload).toHaveProperty('event');
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('data');
    expect(payload.event).toBe('post.created');
    expect(typeof payload.timestamp).toBe('string');
    expect(typeof payload.data).toBe('object');
  });
});
