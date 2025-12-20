/**
 * Scheduled Jobs Database Operations
 * Phase 1.7.12: Background job scheduling
 */

import { createClient } from '@/lib/supabase/server';

export interface ScheduledJob {
  id: string;
  name: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  result: Record<string, unknown> | null;
  created_at: string;
}

export interface ScheduleJobOptions {
  name: string;
  type: string;
  payload: Record<string, unknown>;
  scheduledFor: Date;
  priority?: number;
}

/**
 * Schedule a job
 */
export async function scheduleJob(options: ScheduleJobOptions): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('schedule_job', {
    p_name: options.name,
    p_type: options.type,
    p_payload: options.payload,
    p_scheduled_for: options.scheduledFor.toISOString(),
    p_priority: options.priority || 5,
  });

  if (error) throw error;
  return data;
}

/**
 * Get pending jobs for processing
 */
export async function getPendingJobs(
  type?: string,
  batchSize: number = 10
): Promise<ScheduledJob[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_pending_jobs', {
    p_type: type || null,
    p_batch_size: batchSize,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Mark a job as completed
 */
export async function completeJob(jobId: string, result?: Record<string, unknown>): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('complete_job', {
    p_job_id: jobId,
    p_result: result || null,
  });

  if (error) throw error;
}

/**
 * Mark a job as failed
 */
export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('fail_job', {
    p_job_id: jobId,
    p_error: errorMessage,
  });

  if (error) throw error;
}
