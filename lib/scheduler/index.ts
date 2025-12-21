/**
 * Scheduled Tasks and Cron Jobs System
 * Phase 53: Task scheduling, execution, and monitoring
 */

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  handler: string;
  schedule: CronSchedule;
  config: TaskConfig;
  status: TaskStatus;
  last_run_at: string | null;
  last_run_status: 'success' | 'failure' | 'timeout' | null;
  last_run_duration_ms: number | null;
  last_run_error: string | null;
  next_run_at: string | null;
  run_count: number;
  failure_count: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'idle' | 'running' | 'disabled' | 'error';

export interface CronSchedule {
  expression: string;
  timezone: string;
}

export interface TaskConfig {
  timeout_ms: number;
  retry_attempts: number;
  retry_delay_ms: number;
  max_concurrent: number;
  priority: number;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface TaskRun {
  id: string;
  task_id: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'timeout' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
  result: unknown;
  attempt: number;
  created_at: string;
}

export interface TaskHandler {
  name: string;
  description: string;
  execute: (config: Record<string, unknown>) => Promise<TaskResult>;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metrics?: Record<string, number>;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: TaskConfig = {
  timeout_ms: 30000,
  retry_attempts: 3,
  retry_delay_ms: 1000,
  max_concurrent: 1,
  priority: 5,
  tags: [],
  metadata: {},
};

// ============================================================================
// CRON EXPRESSION PARSING
// ============================================================================

/**
 * Parse cron expression to next run time
 */
export function getNextRunTime(expression: string, _timezone: string = 'UTC'): Date {
  const parts = expression.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression. Expected 5 parts.');
  }

  const [minute, hour, _dayOfMonth, _month, _dayOfWeek] = parts;

  // Simple implementation - for production use a library like node-cron
  const now = new Date();
  const next = new Date(now);

  // Handle common patterns
  if (expression === '* * * * *') {
    // Every minute
    next.setMinutes(next.getMinutes() + 1);
    next.setSeconds(0);
    next.setMilliseconds(0);
    return next;
  }

  if (expression === '0 * * * *') {
    // Every hour
    next.setMinutes(0);
    next.setSeconds(0);
    next.setMilliseconds(0);
    if (next <= now) {
      next.setHours(next.getHours() + 1);
    }
    return next;
  }

  if (expression.match(/^0 0 \* \* \*$/)) {
    // Every day at midnight
    next.setHours(0, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  // Parse minute
  if (minute !== '*') {
    const minuteVal = parseInt(minute, 10);
    next.setMinutes(minuteVal);
    next.setSeconds(0);
    next.setMilliseconds(0);
  }

  // Parse hour
  if (hour !== '*') {
    const hourVal = parseInt(hour, 10);
    next.setHours(hourVal);
    if (next <= now && minute !== '*') {
      next.setDate(next.getDate() + 1);
    }
  }

  // Ensure next is in the future
  while (next <= now) {
    if (minute === '*') {
      next.setMinutes(next.getMinutes() + 1);
    } else if (hour === '*') {
      next.setHours(next.getHours() + 1);
    } else {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

/**
 * Describe cron expression in human-readable format
 */
export function describeCronExpression(expression: string): string {
  const parts = expression.split(' ');
  if (parts.length !== 5) {
    return 'Invalid cron expression';
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (expression === '* * * * *') return 'Every minute';
  if (expression === '0 * * * *') return 'Every hour';
  if (expression === '0 0 * * *') return 'Every day at midnight';
  if (expression === '0 0 * * 0') return 'Every Sunday at midnight';
  if (expression === '0 0 1 * *') return 'First day of every month';
  if (expression.match(/^(\d+) \* \* \* \*$/)) return `Every hour at minute ${minute}`;
  if (expression.match(/^(\d+) (\d+) \* \* \*$/)) return `Every day at ${hour}:${minute.padStart(2, '0')}`;

  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

// ============================================================================
// TASK HANDLERS REGISTRY
// ============================================================================

const taskHandlers = new Map<string, TaskHandler>();

/**
 * Register a task handler
 */
export function registerTaskHandler(handler: TaskHandler): void {
  taskHandlers.set(handler.name, handler);
  logger.info('[Scheduler] Handler registered', { name: handler.name });
}

/**
 * Get registered handler
 */
export function getTaskHandler(name: string): TaskHandler | undefined {
  return taskHandlers.get(name);
}

/**
 * List all registered handlers
 */
export function listTaskHandlers(): TaskHandler[] {
  return Array.from(taskHandlers.values());
}

// ============================================================================
// BUILT-IN TASK HANDLERS
// ============================================================================

// Cleanup old data
registerTaskHandler({
  name: 'cleanup_old_data',
  description: 'Clean up old audit logs, notifications, and temporary data',
  execute: async (config) => {
    const supabase = await createServiceClient();
    const retentionDays = (config.retention_days as number) || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;

    // Clean old notifications
    const { count: notificationsDeleted } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lt('created_at', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true });
    deletedCount += notificationsDeleted || 0;

    // Clean old audit logs
    const { count: auditLogsDeleted } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true });
    deletedCount += auditLogsDeleted || 0;

    return {
      success: true,
      data: { deleted_count: deletedCount },
      metrics: { deleted_count: deletedCount },
    };
  },
});

// Send digest emails
registerTaskHandler({
  name: 'send_digest_emails',
  description: 'Send weekly/daily digest emails to users',
  execute: async (config) => {
    const supabase = await createServiceClient();
    const frequency = (config.frequency as string) || 'weekly';

    // Get users who want digest emails
    const { data: users } = await supabase
      .from('user_preferences')
      .select('user_id')
      .eq('email->email_digest', true)
      .eq('email->email_digest_frequency', frequency);

    let sentCount = 0;
    for (const user of users || []) {
      // Queue digest email
      await supabase.from('email_queue').insert({
        to_user_id: user.user_id,
        template: 'weekly-digest',
        data: { frequency },
        status: 'pending',
      });
      sentCount++;
    }

    return {
      success: true,
      data: { queued_count: sentCount },
      metrics: { emails_queued: sentCount },
    };
  },
});

// Process scheduled posts
registerTaskHandler({
  name: 'process_scheduled_posts',
  description: 'Publish posts that are scheduled for now',
  execute: async () => {
    const supabase = await createServiceClient();
    const now = new Date().toISOString();

    // Get posts scheduled for publication
    const { data: posts } = await supabase
      .from('posts')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    let publishedCount = 0;
    for (const post of posts || []) {
      await supabase
        .from('posts')
        .update({
          status: 'published',
          published_at: now,
        })
        .eq('id', post.id);
      publishedCount++;
    }

    return {
      success: true,
      data: { published_count: publishedCount },
      metrics: { posts_published: publishedCount },
    };
  },
});

// Aggregate analytics
registerTaskHandler({
  name: 'aggregate_analytics',
  description: 'Aggregate daily analytics data',
  execute: async () => {
    const supabase = await createServiceClient();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Get raw events for yesterday
    const { data: events } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', `${dateStr}T00:00:00.000Z`)
      .lt('created_at', `${dateStr}T23:59:59.999Z`);

    // Aggregate by type
    const aggregates: Record<string, number> = {};
    for (const event of events || []) {
      aggregates[event.event_type] = (aggregates[event.event_type] || 0) + 1;
    }

    // Store aggregates
    for (const [eventType, count] of Object.entries(aggregates)) {
      await supabase.from('analytics_daily').upsert({
        date: dateStr,
        event_type: eventType,
        count,
      });
    }

    return {
      success: true,
      data: { date: dateStr, event_types: Object.keys(aggregates).length },
      metrics: { events_processed: events?.length || 0 },
    };
  },
});

// Update search index
registerTaskHandler({
  name: 'update_search_index',
  description: 'Update search index with new/modified content',
  execute: async () => {
    const supabase = await createServiceClient();

    // Get posts modified in last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, content, excerpt')
      .eq('status', 'published')
      .gte('updated_at', oneHourAgo.toISOString());

    // Update search vectors (this would use PostgreSQL FTS)
    for (const post of posts || []) {
      await supabase.rpc('update_post_search_vector', { post_id: post.id });
    }

    return {
      success: true,
      data: { indexed_count: posts?.length || 0 },
      metrics: { posts_indexed: posts?.length || 0 },
    };
  },
});

// Expire sessions
registerTaskHandler({
  name: 'expire_sessions',
  description: 'Clean up expired sessions',
  execute: async () => {
    const supabase = await createServiceClient();

    const { count } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('*', { count: 'exact', head: true });

    return {
      success: true,
      data: { expired_count: count || 0 },
      metrics: { sessions_expired: count || 0 },
    };
  },
});

// ============================================================================
// TASK MANAGEMENT
// ============================================================================

/**
 * Create a scheduled task
 */
export async function createTask(
  input: Pick<ScheduledTask, 'name' | 'handler' | 'schedule'> &
    Partial<Pick<ScheduledTask, 'description' | 'config' | 'is_enabled'>>
): Promise<ScheduledTask> {
  const supabase = await createServiceClient();

  // Validate handler exists
  if (!taskHandlers.has(input.handler)) {
    throw new Error(`Unknown handler: ${input.handler}`);
  }

  const nextRun = getNextRunTime(input.schedule.expression, input.schedule.timezone);

  const taskData = {
    name: input.name,
    description: input.description || null,
    handler: input.handler,
    schedule: input.schedule,
    config: { ...DEFAULT_CONFIG, ...input.config },
    status: 'idle' as TaskStatus,
    last_run_at: null,
    last_run_status: null,
    last_run_duration_ms: null,
    last_run_error: null,
    next_run_at: nextRun.toISOString(),
    run_count: 0,
    failure_count: 0,
    is_enabled: input.is_enabled ?? true,
  };

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) {
    logger.error('[Scheduler] Failed to create task', error);
    throw error;
  }

  logger.info('[Scheduler] Task created', { task_id: data.id, name: input.name });
  return data as ScheduledTask;
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Pick<ScheduledTask, 'name' | 'description' | 'schedule' | 'config' | 'is_enabled'>>
): Promise<ScheduledTask> {
  const supabase = await createServiceClient();

  const updateData: Record<string, unknown> = { ...updates };

  // Recalculate next run if schedule changed
  if (updates.schedule) {
    const nextRun = getNextRunTime(updates.schedule.expression, updates.schedule.timezone);
    updateData.next_run_at = nextRun.toISOString();
  }

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    logger.error('[Scheduler] Failed to update task', error);
    throw error;
  }

  return data as ScheduledTask;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('scheduled_tasks').delete().eq('id', taskId);

  if (error) {
    logger.error('[Scheduler] Failed to delete task', error);
    throw error;
  }

  logger.info('[Scheduler] Task deleted', { task_id: taskId });
}

/**
 * Get task by ID
 */
export async function getTask(taskId: string): Promise<ScheduledTask | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as ScheduledTask;
}

/**
 * List all tasks
 */
export async function listTasks(): Promise<ScheduledTask[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .order('name');

  if (error) {
    logger.error('[Scheduler] Failed to list tasks', error);
    throw error;
  }

  return (data || []) as ScheduledTask[];
}

/**
 * Get tasks due to run
 */
export async function getDueTasks(): Promise<ScheduledTask[]> {
  const supabase = await createServiceClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('is_enabled', true)
    .neq('status', 'running')
    .lte('next_run_at', now)
    .order('config->priority', { ascending: true });

  if (error) {
    logger.error('[Scheduler] Failed to get due tasks', error);
    throw error;
  }

  return (data || []) as ScheduledTask[];
}

// ============================================================================
// TASK EXECUTION
// ============================================================================

/**
 * Execute a task
 */
export async function executeTask(taskId: string): Promise<TaskRun> {
  const supabase = await createServiceClient();
  const startTime = Date.now();

  // Get task
  const task = await getTask(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  // Get handler
  const handler = taskHandlers.get(task.handler);
  if (!handler) {
    throw new Error(`Handler not found: ${task.handler}`);
  }

  // Create run record
  const { data: run, error: runError } = await supabase
    .from('task_runs')
    .insert({
      task_id: taskId,
      status: 'running',
      started_at: new Date().toISOString(),
      attempt: 1,
    })
    .select()
    .single();

  if (runError) {
    throw runError;
  }

  // Update task status
  await supabase
    .from('scheduled_tasks')
    .update({ status: 'running' })
    .eq('id', taskId);

  try {
    // Execute with timeout
    const result = await Promise.race([
      handler.execute(task.config.metadata),
      new Promise<TaskResult>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), task.config.timeout_ms)
      ),
    ]);

    const duration = Date.now() - startTime;
    const nextRun = getNextRunTime(task.schedule.expression, task.schedule.timezone);

    // Update run record
    await supabase
      .from('task_runs')
      .update({
        status: result.success ? 'success' : 'failure',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        result: result.data,
        error: result.error || null,
      })
      .eq('id', run.id);

    // Update task
    await supabase
      .from('scheduled_tasks')
      .update({
        status: 'idle',
        last_run_at: new Date().toISOString(),
        last_run_status: result.success ? 'success' : 'failure',
        last_run_duration_ms: duration,
        last_run_error: result.error || null,
        next_run_at: nextRun.toISOString(),
        run_count: task.run_count + 1,
        failure_count: result.success ? task.failure_count : task.failure_count + 1,
      })
      .eq('id', taskId);

    logger.info('[Scheduler] Task executed', {
      task_id: taskId,
      run_id: run.id,
      success: result.success,
      duration_ms: duration,
    });

    return { ...run, status: result.success ? 'success' : 'failure', duration_ms: duration } as TaskRun;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage === 'Task timeout';

    // Update run record
    await supabase
      .from('task_runs')
      .update({
        status: isTimeout ? 'timeout' : 'failure',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        error: errorMessage,
      })
      .eq('id', run.id);

    // Update task
    const nextRun = getNextRunTime(task.schedule.expression, task.schedule.timezone);
    await supabase
      .from('scheduled_tasks')
      .update({
        status: 'idle',
        last_run_at: new Date().toISOString(),
        last_run_status: isTimeout ? 'timeout' : 'failure',
        last_run_duration_ms: duration,
        last_run_error: errorMessage,
        next_run_at: nextRun.toISOString(),
        run_count: task.run_count + 1,
        failure_count: task.failure_count + 1,
      })
      .eq('id', taskId);

    logger.error('[Scheduler] Task failed', { task_id: taskId, error: errorMessage });

    return { ...run, status: isTimeout ? 'timeout' : 'failure', duration_ms: duration, error: errorMessage } as TaskRun;
  }
}

/**
 * Get task run history
 */
export async function getTaskRuns(
  taskId: string,
  limit: number = 50
): Promise<TaskRun[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('task_runs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as TaskRun[];
}

/**
 * Process all due tasks
 */
export async function processDueTasks(): Promise<{ executed: number; failed: number }> {
  const dueTasks = await getDueTasks();
  let executed = 0;
  let failed = 0;

  for (const task of dueTasks) {
    try {
      const result = await executeTask(task.id);
      if (result.status === 'success') {
        executed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { executed, failed };
}
