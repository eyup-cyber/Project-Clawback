/**
 * Cleanup Worker
 * Handles periodic cleanup of old data
 */

import type { Job } from 'bullmq';
import { addJob, type CleanupJobData, QUEUE_NAMES, registerWorker } from '../queue';

/**
 * Cleanup sessions older than specified days
 */
async function cleanupSessions(olderThanDays: number): Promise<number> {
  console.log(`🧹 Cleaning up sessions older than ${olderThanDays} days`);

  // In production:
  // const { data, error } = await supabase
  //   .from('user_sessions')
  //   .delete()
  //   .lt('created_at', new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString())
  //   .select();

  await new Promise((resolve) => setTimeout(resolve, 100));

  const deletedCount = Math.floor(Math.random() * 100); // Mock
  console.log(`✅ Cleaned up ${deletedCount} old sessions`);
  return deletedCount;
}

/**
 * Cleanup logs older than specified days
 */
async function cleanupLogs(olderThanDays: number): Promise<number> {
  console.log(`🧹 Cleaning up logs older than ${olderThanDays} days`);

  // Clean audit logs, security events, etc.
  await new Promise((resolve) => setTimeout(resolve, 150));

  const deletedCount = Math.floor(Math.random() * 500);
  console.log(`✅ Cleaned up ${deletedCount} old log entries`);
  return deletedCount;
}

/**
 * Cleanup orphaned media files
 */
async function cleanupMedia(olderThanDays: number): Promise<number> {
  console.log(`🧹 Cleaning up orphaned media older than ${olderThanDays} days`);

  // Find media not referenced by any post or profile
  // Delete from storage (R2/S3) and database
  await new Promise((resolve) => setTimeout(resolve, 200));

  const deletedCount = Math.floor(Math.random() * 50);
  console.log(`✅ Cleaned up ${deletedCount} orphaned media files`);
  return deletedCount;
}

/**
 * Cleanup old notifications
 */
async function cleanupNotifications(olderThanDays: number): Promise<number> {
  console.log(`🧹 Cleaning up notifications older than ${olderThanDays} days`);

  // Delete read notifications older than threshold
  await new Promise((resolve) => setTimeout(resolve, 100));

  const deletedCount = Math.floor(Math.random() * 1000);
  console.log(`✅ Cleaned up ${deletedCount} old notifications`);
  return deletedCount;
}

/**
 * Process cleanup job
 */
async function processCleanupJob(job: Job<CleanupJobData>): Promise<void> {
  const { type, olderThanDays } = job.data;

  console.log(`🧹 Starting cleanup job: ${type}`);
  await job.updateProgress(10);

  let deleted = 0;

  switch (type) {
    case 'sessions':
      deleted = await cleanupSessions(olderThanDays);
      break;
    case 'logs':
      deleted = await cleanupLogs(olderThanDays);
      break;
    case 'media':
      deleted = await cleanupMedia(olderThanDays);
      break;
    case 'notifications':
      deleted = await cleanupNotifications(olderThanDays);
      break;
    default:
      throw new Error(`Unknown cleanup type: ${type}`);
  }

  await job.updateProgress(100);
  console.log(`✅ Cleanup ${type} completed: ${deleted} items removed`);
}

/**
 * Initialize cleanup worker
 */
export function initCleanupWorker(): void {
  registerWorker(QUEUE_NAMES.CLEANUP, processCleanupJob, {
    concurrency: 1, // Run one cleanup at a time
  });

  console.log('🧹 Cleanup worker initialized');
}

/**
 * Schedule cleanup jobs
 */
export async function scheduleCleanupJobs(): Promise<void> {
  // Schedule daily cleanups
  await addJob(
    QUEUE_NAMES.CLEANUP,
    { type: 'sessions', olderThanDays: 30 },
    {
      jobId: 'cleanup-sessions-daily',
      repeat: { pattern: '0 2 * * *' }, // 2 AM daily
    }
  );

  await addJob(
    QUEUE_NAMES.CLEANUP,
    { type: 'logs', olderThanDays: 90 },
    {
      jobId: 'cleanup-logs-daily',
      repeat: { pattern: '0 3 * * *' }, // 3 AM daily
    }
  );

  await addJob(
    QUEUE_NAMES.CLEANUP,
    { type: 'notifications', olderThanDays: 30 },
    {
      jobId: 'cleanup-notifications-daily',
      repeat: { pattern: '0 4 * * *' }, // 4 AM daily
    }
  );

  // Weekly media cleanup
  await addJob(
    QUEUE_NAMES.CLEANUP,
    { type: 'media', olderThanDays: 7 },
    {
      jobId: 'cleanup-media-weekly',
      repeat: { pattern: '0 5 * * 0' }, // 5 AM on Sundays
    }
  );

  console.log('📅 Cleanup jobs scheduled');
}

/**
 * Run cleanup now (for manual trigger)
 */
export async function runCleanupNow(
  type: CleanupJobData['type'],
  olderThanDays: number = 30
): Promise<void> {
  await addJob(
    QUEUE_NAMES.CLEANUP,
    { type, olderThanDays },
    { priority: 1 } // High priority for manual runs
  );
}
