/**
 * Webhook Request Signing
 * Provides HMAC-based signature verification for webhooks
 */

import crypto from 'crypto';

export const SIGNATURE_HEADER = 'X-Webhook-Signature';
export const TIMESTAMP_HEADER = 'X-Webhook-Timestamp';
const TOLERANCE_SECONDS = 300; // 5 minutes

/**
 * Sign a webhook payload
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;

  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Parse a webhook signature header
 */
export function parseSignature(header: string): {
  timestamp: number;
  signatures: string[];
} | null {
  try {
    const parts = header.split(',');
    let timestamp = 0;
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = parseInt(value, 10);
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      return null;
    }

    return { timestamp, signatures };
  } catch {
    return null;
  }
}

/**
 * Verify a webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): { valid: boolean; error?: string } {
  const parsed = parseSignature(signature);

  if (!parsed) {
    return { valid: false, error: 'Invalid signature format' };
  }

  const { timestamp, signatures } = parsed;

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) {
    return { valid: false, error: 'Timestamp outside tolerance window' };
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  // Check if any signature matches (timing-safe comparison)
  for (const sig of signatures) {
    if (sig.length === expectedSignature.length) {
      if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))) {
        return { valid: true };
      }
    }
  }

  return { valid: false, error: 'Signature mismatch' };
}

/**
 * Generate a webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('base64url')}`;
}

/**
 * Middleware to verify incoming webhook requests
 */
export function createWebhookVerifier(getSecret: (webhookId: string) => Promise<string | null>) {
  return async (
    request: Request,
    webhookId: string
  ): Promise<{ valid: boolean; error?: string }> => {
    const signature = request.headers.get(SIGNATURE_HEADER);

    if (!signature) {
      return { valid: false, error: 'Missing signature header' };
    }

    const secret = await getSecret(webhookId);

    if (!secret) {
      return { valid: false, error: 'Unknown webhook' };
    }

    const payload = await request.text();
    return verifyWebhookSignature(payload, signature, secret);
  };
}

/**
 * Express-style middleware for webhook verification
 */
export function webhookVerificationMiddleware(secret: string) {
  return async (request: Request): Promise<{ valid: boolean; body?: string; error?: string }> => {
    const signature = request.headers.get(SIGNATURE_HEADER);

    if (!signature) {
      return { valid: false, error: 'Missing signature header' };
    }

    const body = await request.text();
    const result = verifyWebhookSignature(body, signature, secret);

    if (result.valid) {
      return { valid: true, body };
    }

    return result;
  };
}
