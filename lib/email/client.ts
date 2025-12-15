// ============================================================================
// EMAIL CLIENT
// Uses Resend for transactional emails
// ============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Scroungers <noreply@scroungers.co>';
const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { logger } = await import('@/lib/logger');
  
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        tags: options.tags,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Email send failed', error, { to: options.to, subject: options.subject });
      return { success: false, error: error.message || 'Failed to send email' };
    }

    const result = await response.json();
    logger.info('Email sent successfully', { emailId: result.id, to: options.to });
    return { success: true, id: result.id };
  } catch (err) {
    logger.error('Email send error', err, { to: options.to, subject: options.subject });
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail(
  recipients: string[],
  options: Omit<EmailOptions, 'to'>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Send in batches of 10
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((to) => sendEmail({ ...options, to }))
    );

    results.forEach((result) => {
      if (result.success) sent++;
      else failed++;
    });

    // Rate limiting between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { sent, failed };
}



