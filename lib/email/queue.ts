/**
 * Email queue system with retry logic and batch processing
 */

import { logger } from '@/lib/logger';
import { sendEmail, type EmailOptions } from './client';

// ============================================================================
// TYPES
// ============================================================================

interface QueuedEmail {
  id: string;
  options: EmailOptions;
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
}

interface QueueOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  batchSize?: number;
  processIntervalMs?: number;
}

// ============================================================================
// EMAIL QUEUE CLASS
// ============================================================================

class EmailQueue {
  private queue: Map<string, QueuedEmail> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private options: Required<QueueOptions>;

  constructor(options: QueueOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 5000, // 5 seconds
      batchSize: options.batchSize ?? 10,
      processIntervalMs: options.processIntervalMs ?? 1000, // 1 second
    };
  }

  /**
   * Generate unique ID for queued email
   */
  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Add email to the queue
   */
  enqueue(options: EmailOptions, maxAttempts?: number): string {
    const id = this.generateId();
    const email: QueuedEmail = {
      id,
      options,
      attempts: 0,
      maxAttempts: maxAttempts ?? this.options.maxRetries,
      status: 'pending',
      createdAt: new Date(),
    };

    this.queue.set(id, email);
    logger.info('Email queued', { emailId: id, to: options.to });

    return id;
  }

  /**
   * Process a single email
   */
  private async processEmail(email: QueuedEmail): Promise<boolean> {
    email.status = 'processing';
    email.attempts++;
    email.lastAttempt = new Date();

    try {
      const result = await sendEmail(email.options);

      if (result.success) {
        email.status = 'sent';
        email.sentAt = new Date();
        logger.info('Email sent successfully', { emailId: email.id, to: email.options.to });
        return true;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      email.error = errorMessage;

      if (email.attempts >= email.maxAttempts) {
        email.status = 'failed';
        logger.error('Email permanently failed', new Error(errorMessage), {
          emailId: email.id,
          to: email.options.to,
          attempts: email.attempts,
        });
      } else {
        email.status = 'pending';
        logger.warn('Email send failed, will retry', {
          emailId: email.id,
          to: email.options.to,
          attempts: email.attempts,
          maxAttempts: email.maxAttempts,
          error: errorMessage,
        });
      }
      return false;
    }
  }

  /**
   * Process pending emails in batches
   */
  async processBatch(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const pendingEmails = Array.from(this.queue.values())
        .filter((email) => {
          if (email.status !== 'pending') return false;

          // Check retry delay
          if (email.attempts > 0 && email.lastAttempt) {
            const timeSinceLastAttempt = Date.now() - email.lastAttempt.getTime();
            const requiredDelay = this.options.retryDelayMs * Math.pow(2, email.attempts - 1); // Exponential backoff
            if (timeSinceLastAttempt < requiredDelay) return false;
          }

          return true;
        })
        .slice(0, this.options.batchSize);

      for (const email of pendingEmails) {
        processed++;
        const success = await this.processEmail(email);
        if (success) {
          succeeded++;
          // Remove successfully sent emails from queue
          this.queue.delete(email.id);
        } else if (email.status === 'failed') {
          failed++;
        }
      }

      if (processed > 0) {
        logger.info('Email batch processed', { processed, succeeded, failed });
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Start automatic queue processing
   */
  start(): void {
    if (this.processingInterval) {
      return;
    }

    logger.info('Starting email queue processor');
    this.processingInterval = setInterval(
      () => this.processBatch(),
      this.options.processIntervalMs
    );
  }

  /**
   * Stop automatic queue processing
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Stopped email queue processor');
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    sent: number;
    failed: number;
  } {
    const emails = Array.from(this.queue.values());
    return {
      total: emails.length,
      pending: emails.filter((e) => e.status === 'pending').length,
      processing: emails.filter((e) => e.status === 'processing').length,
      sent: emails.filter((e) => e.status === 'sent').length,
      failed: emails.filter((e) => e.status === 'failed').length,
    };
  }

  /**
   * Get email status by ID
   */
  getStatus(id: string): QueuedEmail | undefined {
    return this.queue.get(id);
  }

  /**
   * Remove email from queue
   */
  remove(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * Clear all emails from queue
   */
  clear(): void {
    this.queue.clear();
    logger.info('Email queue cleared');
  }

  /**
   * Clear only failed emails
   */
  clearFailed(): number {
    let count = 0;
    for (const [id, email] of this.queue.entries()) {
      if (email.status === 'failed') {
        this.queue.delete(id);
        count++;
      }
    }
    logger.info('Cleared failed emails', { count });
    return count;
  }

  /**
   * Retry a specific failed email
   */
  retry(id: string): boolean {
    const email = this.queue.get(id);
    if (!email || email.status !== 'failed') {
      return false;
    }

    email.status = 'pending';
    email.attempts = 0;
    email.error = undefined;
    logger.info('Email queued for retry', { emailId: id });
    return true;
  }

  /**
   * Retry all failed emails
   */
  retryAllFailed(): number {
    let count = 0;
    for (const email of this.queue.values()) {
      if (email.status === 'failed') {
        email.status = 'pending';
        email.attempts = 0;
        email.error = undefined;
        count++;
      }
    }
    logger.info('All failed emails queued for retry', { count });
    return count;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const emailQueue = new EmailQueue();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Queue an email for sending
 */
export function queueEmail(options: EmailOptions, maxRetries?: number): string {
  return emailQueue.enqueue(options, maxRetries);
}

/**
 * Queue multiple emails for batch sending
 */
export function queueEmails(emailsToSend: EmailOptions[]): string[] {
  return emailsToSend.map((options) => emailQueue.enqueue(options));
}

/**
 * Send email immediately (bypasses queue)
 */
export async function sendEmailNow(options: EmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  return sendEmail(options);
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  return emailQueue.getStats();
}

/**
 * Start the email queue processor
 */
export function startEmailQueue(): void {
  emailQueue.start();
}

/**
 * Stop the email queue processor
 */
export function stopEmailQueue(): void {
  emailQueue.stop();
}
