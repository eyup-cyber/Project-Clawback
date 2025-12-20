/**
 * Email Queue Database Operations
 * Phase 1.7.4: Email queue management
 */

import { createClient } from '@/lib/supabase/server';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_template: string;
  text_template: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QueuedEmail {
  id: string;
  to_email: string;
  to_name: string | null;
  from_email: string;
  from_name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  template_name: string | null;
  template_data: Record<string, unknown> | null;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  priority: number;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  scheduled_for: string;
  sent_at: string | null;
  created_at: string;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export async function getEmailTemplate(name: string): Promise<EmailTemplate | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('email_templates').select('*').order('name');

  if (error) throw error;
  return data || [];
}

// ============================================================================
// EMAIL QUEUE
// ============================================================================

export interface QueueEmailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateName?: string;
  templateData?: Record<string, unknown>;
  scheduledFor?: Date;
  priority?: number;
}

export async function queueEmail(options: QueueEmailOptions): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('email_queue')
    .insert({
      to_email: options.toEmail,
      to_name: options.toName || null,
      subject: options.subject,
      html_content: options.htmlContent,
      text_content: options.textContent || null,
      template_name: options.templateName || null,
      template_data: options.templateData || null,
      scheduled_for: options.scheduledFor?.toISOString() || new Date().toISOString(),
      priority: options.priority || 5,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function queueTemplatedEmail(
  toEmail: string,
  toName: string | undefined,
  templateName: string,
  templateData: Record<string, unknown>,
  scheduledFor?: Date
): Promise<string> {
  const supabase = await createClient();

  // Use the database function to render template
  const { data, error } = await supabase.rpc('queue_templated_email', {
    p_to_email: toEmail,
    p_to_name: toName || null,
    p_template_name: templateName,
    p_template_data: templateData,
    p_scheduled_for: scheduledFor?.toISOString() || new Date().toISOString(),
    p_priority: 5,
  });

  if (error) throw error;
  return data;
}

export async function getPendingEmails(batchSize: number = 10): Promise<QueuedEmail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_pending_emails', {
    p_batch_size: batchSize,
  });

  if (error) throw error;
  return data || [];
}

export async function markEmailSent(emailId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('mark_email_sent', {
    p_email_id: emailId,
  });

  if (error) throw error;
}

export async function markEmailFailed(emailId: string, errorMessage: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('mark_email_failed', {
    p_email_id: emailId,
    p_error: errorMessage,
  });

  if (error) throw error;
}

export async function getEmailQueueStats(): Promise<{
  pending: number;
  processing: number;
  failed: number;
  sent_today: number;
}> {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pending, processing, failed, sentToday] = await Promise.all([
    supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing'),
    supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', today.toISOString()),
  ]);

  return {
    pending: pending.count || 0,
    processing: processing.count || 0,
    failed: failed.count || 0,
    sent_today: sentToday.count || 0,
  };
}
