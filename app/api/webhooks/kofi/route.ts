/**
 * Ko-fi Webhook Handler
 * Receives and processes Ko-fi donation notifications
 */

import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { processKofiWebhook, type KofiWebhookPayload } from '@/lib/integrations/kofi';

/**
 * POST /api/webhooks/kofi
 * Handle incoming Ko-fi webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Ko-fi sends data as form-encoded
    const formData = await request.formData();
    const dataString = formData.get('data');

    if (!dataString || typeof dataString !== 'string') {
      logger.warn('[Ko-fi Webhook] Invalid request - missing data');
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }

    // Parse the JSON payload
    let payload: KofiWebhookPayload;
    try {
      payload = JSON.parse(dataString);
    } catch {
      logger.warn('[Ko-fi Webhook] Invalid JSON payload');
      return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }

    logger.info('[Ko-fi Webhook] Received', {
      type: payload.type,
      transactionId: payload.kofi_transaction_id,
      amount: payload.amount,
    });

    // Process the webhook
    const result = await processKofiWebhook(payload);

    if (!result.success) {
      logger.error('[Ko-fi Webhook] Processing failed', { message: result.message });
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.message.includes('verification') ? 401 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error(
      '[Ko-fi Webhook] Error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}

// Ko-fi may send GET requests for verification
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'kofi-webhook' });
}
