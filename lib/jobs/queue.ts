/**
 * Job Queue System with BullMQ
 * Provides robust background job processing
 */

import { Queue, Worker, type Job, QueueEvents, type ConnectionOptions } from 'bullmq';

// Redis connection for BullMQ
const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10), // Separate DB for queues
};

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email',
  MEDIA: 'media',
  ANALYTICS: 'analytics',
  CLEANUP: 'cleanup',
  NOTIFICATIONS: 'notifications',
  SCHEDULED: 'scheduled',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Job data types
export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  templateData: Record<string, unknown>;
  replyTo?: string;
}

export interface MediaJobData {
  mediaId: string;
  userId: string;
  operation: 'resize' | 'compress' | 'convert' | 'thumbnail';
  options?: Record<string, unknown>;
}

export interface AnalyticsJobData {
  type: 'pageView' | 'event' | 'aggregation';
  data: Record<string, unknown>;
}

export interface CleanupJobData {
  type: 'sessions' | 'logs' | 'media' | 'notifications';
  olderThanDays: number;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ScheduledJobData {
  type: 'publish-post' | 'send-digest' | 'generate-sitemap';
  payload: Record<string, unknown>;
}

export type JobData = 
  | EmailJobData 
  | MediaJobData 
  | AnalyticsJobData 
  | CleanupJobData 
  | NotificationJobData
  | ScheduledJobData;

// Queue instances (lazy initialization)
const queues = new Map<QueueName, Queue>();
const workers = new Map<QueueName, Worker>();
const queueEvents = new Map<QueueName, QueueEvents>();

/**
 * Get or create a queue instance
 */
export function getQueue<T extends JobData>(name: QueueName): Queue<T> {
  if (!queues.has(name)) {
    const queue = new Queue<T>(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 24 * 60 * 60, // 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep more failed jobs for debugging
          age: 7 * 24 * 60 * 60, // 7 days
        },
      },
    });
    queues.set(name, queue as Queue);
  }
  return queues.get(name) as Queue<T>;
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(name: QueueName): QueueEvents {
  if (!queueEvents.has(name)) {
    const events = new QueueEvents(name, { connection });
    queueEvents.set(name, events);
  }
  return queueEvents.get(name)!;
}

/**
 * Add a job to a queue
 */
export async function addJob<T extends JobData>(
  queueName: QueueName,
  data: T,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
    repeat?: {
      pattern?: string;
      every?: number;
      limit?: number;
    };
  }
): Promise<Job<T>> {
  const queue = getQueue<T>(queueName);
  
  const jobOptions: Parameters<Queue<T>['add']>[2] = {
    ...(options?.priority && { priority: options.priority }),
    ...(options?.delay && { delay: options.delay }),
    ...(options?.jobId && { jobId: options.jobId }),
    ...(options?.repeat && { repeat: options.repeat }),
  };

   
  return (queue as Queue<any>).add(queueName, data, jobOptions) as Promise<Job<T>>;
}

/**
 * Register a worker for a queue
 */
export function registerWorker<T extends JobData>(
  queueName: QueueName,
  processor: (job: Job<T>) => Promise<void>,
  options?: {
    concurrency?: number;
    limiter?: {
      max: number;
      duration: number;
    };
  }
): Worker<T> {
  // Close existing worker if any
  const existing = workers.get(queueName);
  if (existing) {
    void existing.close();
  }

  const worker = new Worker<T>(
    queueName,
    async (job) => {
      console.log(`Processing ${queueName} job ${job.id}`);
      try {
        await processor(job);
        console.log(`Completed ${queueName} job ${job.id}`);
      } catch (error) {
        console.error(`Failed ${queueName} job ${job.id}:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: options?.concurrency || 5,
      limiter: options?.limiter,
    }
  );

  // Set up error handlers
  worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error(`Worker error for ${queueName}:`, error.message);
  });

  workers.set(queueName, worker as Worker);
  return worker;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: QueueName): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  return { waiting, active, completed, failed, delayed, paused: isPaused };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats(): Promise<Record<QueueName, Awaited<ReturnType<typeof getQueueStats>>>> {
  const stats: Record<string, Awaited<ReturnType<typeof getQueueStats>>> = {};
  
  for (const name of Object.values(QUEUE_NAMES)) {
    stats[name] = await getQueueStats(name);
  }
  
  return stats as Record<QueueName, Awaited<ReturnType<typeof getQueueStats>>>;
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs(queueName: QueueName): Promise<number> {
  const queue = getQueue(queueName);
  const failedJobs = await queue.getFailed();
  
  let retried = 0;
  for (const job of failedJobs) {
    await job.retry();
    retried++;
  }
  
  return retried;
}

/**
 * Clean old jobs
 */
export async function cleanJobs(
  queueName: QueueName,
  options: {
    completed?: boolean;
    failed?: boolean;
    olderThanMs?: number;
  }
): Promise<number> {
  const queue = getQueue(queueName);
  const grace = options.olderThanMs || 24 * 60 * 60 * 1000; // Default 24 hours
  
  let cleaned = 0;
  
  if (options.completed) {
    const removedCompleted = await queue.clean(grace, 1000, 'completed');
    cleaned += removedCompleted.length;
  }
  
  if (options.failed) {
    const removedFailed = await queue.clean(grace, 1000, 'failed');
    cleaned += removedFailed.length;
  }
  
  return cleaned;
}

/**
 * Close all queues and workers
 */
export async function closeAll(): Promise<void> {
  // Close workers first
  for (const worker of workers.values()) {
    await worker.close();
  }
  workers.clear();

  // Close queue events
  for (const events of queueEvents.values()) {
    await events.close();
  }
  queueEvents.clear();

  // Close queues
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing job queues...');
    await closeAll();
  });
}
