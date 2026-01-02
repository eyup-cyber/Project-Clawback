/**
 * Backup and Restore System
 * Phase 29: Database backups, point-in-time recovery, restore operations
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface BackupRecord {
  id: string;
  name: string;
  description: string | null;
  type: BackupType;
  status: BackupStatus;
  size_bytes: number | null;
  tables_included: string[];
  storage_path: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export type BackupType = 'full' | 'incremental' | 'selective';
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';

export interface RestoreRecord {
  id: string;
  backup_id: string;
  status: RestoreStatus;
  tables_restored: string[];
  records_restored: number;
  started_at: string;
  completed_at: string | null;
  initiated_by: string;
  error_message: string | null;
}

export type RestoreStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';

export interface BackupConfig {
  tables: string[];
  includeMedia?: boolean;
  retention: number; // Days
  encryption?: boolean;
  compression?: boolean;
}

// ============================================================================
// BACKUP TABLES
// ============================================================================

const CORE_TABLES = ['profiles', 'posts', 'comments', 'reactions', 'categories', 'tags'];

const EXTENDED_TABLES = [
  ...CORE_TABLES,
  'follows',
  'bookmarks',
  'bookmark_folders',
  'reading_history',
  'notifications',
  'user_badges',
  'badges',
  'feature_flags',
  'site_settings',
];

const ALL_TABLES = [
  ...EXTENDED_TABLES,
  'analytics_events',
  'analytics_aggregates',
  'content_reports',
  'moderation_log',
  'admin_logs',
  'webhooks',
  'webhook_deliveries',
  'email_queue',
  'scheduled_jobs',
];

// ============================================================================
// BACKUP OPERATIONS
// ============================================================================

/**
 * Create a new backup
 */
export async function createBackup(
  createdBy: string,
  options: {
    name?: string;
    description?: string;
    type?: BackupType;
    tables?: string[];
    retention?: number;
  } = {}
): Promise<BackupRecord> {
  const {
    name = `backup-${new Date().toISOString().split('T')[0]}`,
    description,
    type = 'full',
    tables = type === 'full' ? ALL_TABLES : CORE_TABLES,
    retention = 30,
  } = options;

  const supabase = await createServiceClient();

  // Create backup record
  const { data: backup, error } = await supabase
    .from('backups')
    .insert({
      name,
      description,
      type,
      status: 'pending',
      tables_included: tables,
      created_by: createdBy,
      expires_at: new Date(Date.now() + retention * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { retention },
    })
    .select()
    .single();

  if (error) {
    logger.error('[Backup] Failed to create backup record', error);
    throw error;
  }

  logger.info('[Backup] Backup initiated', {
    backupId: backup.id,
    type,
    tables,
  });

  // Start backup process asynchronously
  processBackup(backup.id).catch((err) => {
    logger.error('[Backup] Background backup failed', {
      backupId: backup.id,
      error: err,
    });
  });

  return backup as BackupRecord;
}

/**
 * Process a backup
 */
async function processBackup(backupId: string): Promise<void> {
  const supabase = await createServiceClient();

  // Update status
  await supabase.from('backups').update({ status: 'in_progress' }).eq('id', backupId);

  try {
    // Get backup details
    const { data: backup } = await supabase.from('backups').select('*').eq('id', backupId).single();

    if (!backup) throw new Error('Backup not found');

    const backupData: Record<string, unknown[]> = {};
    let totalSize = 0;

    // Export each table
    for (const table of backup.tables_included) {
      const { data, error } = await supabase.from(table).select('*').limit(100000); // Limit for safety

      if (error) {
        logger.warn('[Backup] Failed to export table', { table, error });
        continue;
      }

      backupData[table] = data || [];
      totalSize += JSON.stringify(data).length;
    }

    // Create backup file
    const backupContent = JSON.stringify({
      version: '1.0',
      created_at: new Date().toISOString(),
      tables: Object.keys(backupData),
      data: backupData,
    });

    // Upload to storage
    const storagePath = `backups/${backupId}.json`;
    const { error: uploadError } = await supabase.storage
      .from('private')
      .upload(storagePath, backupContent, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Update backup record
    await supabase
      .from('backups')
      .update({
        status: 'completed',
        size_bytes: totalSize,
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', backupId);

    logger.info('[Backup] Backup completed', {
      backupId,
      tables: Object.keys(backupData).length,
      sizeBytes: totalSize,
    });
  } catch (error) {
    await supabase
      .from('backups')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', backupId);

    logger.error('[Backup] Backup failed', { backupId, error });
    throw error;
  }
}

/**
 * List backups
 */
export async function listBackups(options: {
  status?: BackupStatus;
  type?: BackupType;
  limit?: number;
  offset?: number;
}): Promise<{ backups: BackupRecord[]; total: number }> {
  const { status, type, limit = 20, offset = 0 } = options;
  const supabase = await createServiceClient();

  let query = supabase
    .from('backups')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  const { data, count, error } = await query;

  if (error) {
    logger.error('[Backup] Failed to list backups', error);
    throw error;
  }

  return {
    backups: (data || []) as BackupRecord[],
    total: count || 0,
  };
}

/**
 * Get a backup
 */
export async function getBackup(backupId: string): Promise<BackupRecord | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.from('backups').select('*').eq('id', backupId).single();

  if (error) return null;
  return data as BackupRecord;
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string): Promise<void> {
  const supabase = await createServiceClient();

  // Get backup to find storage path
  const backup = await getBackup(backupId);

  if (backup?.storage_path) {
    await supabase.storage.from('private').remove([backup.storage_path]);
  }

  await supabase.from('backups').delete().eq('id', backupId);

  logger.info('[Backup] Backup deleted', { backupId });
}

// ============================================================================
// RESTORE OPERATIONS
// ============================================================================

/**
 * Restore from a backup
 */
export async function restoreFromBackup(
  backupId: string,
  initiatedBy: string,
  options: {
    tables?: string[];
    dryRun?: boolean;
  } = {}
): Promise<RestoreRecord> {
  const { tables, dryRun = false } = options;
  const supabase = await createServiceClient();

  // Get backup
  const backup = await getBackup(backupId);
  if (!backup || backup.status !== 'completed') {
    throw new Error('Backup not found or not completed');
  }

  // Create restore record
  const { data: restore, error } = await supabase
    .from('restores')
    .insert({
      backup_id: backupId,
      status: 'pending',
      tables_restored: tables || backup.tables_included,
      initiated_by: initiatedBy,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Backup] Failed to create restore record', error);
    throw error;
  }

  if (!dryRun) {
    processRestore(restore.id).catch((err) => {
      logger.error('[Backup] Background restore failed', {
        restoreId: restore.id,
        error: err,
      });
    });
  }

  return restore as RestoreRecord;
}

/**
 * Process a restore
 */
async function processRestore(restoreId: string): Promise<void> {
  const supabase = await createServiceClient();

  // Update status
  await supabase
    .from('restores')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', restoreId);

  try {
    // Get restore details
    const { data: restore } = await supabase
      .from('restores')
      .select('*, backup:backups(*)')
      .eq('id', restoreId)
      .single();

    if (!restore) throw new Error('Restore not found');

    const backup = restore.backup as BackupRecord;

    // Download backup file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('private')
      .download(backup.storage_path!);

    if (downloadError || !fileData) {
      throw new Error('Failed to download backup file');
    }

    const backupContent = JSON.parse(await fileData.text());
    let recordsRestored = 0;

    // Restore each table
    for (const table of restore.tables_restored) {
      const tableData = backupContent.data[table];
      if (!tableData || tableData.length === 0) continue;

      // Delete existing data
      await supabase.from(table).delete().neq('id', '');

      // Insert backup data in batches
      const batchSize = 100;
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize);
        const { error: insertError } = await supabase.from(table).insert(batch);

        if (insertError) {
          logger.warn('[Backup] Failed to restore batch', {
            table,
            error: insertError,
          });
        } else {
          recordsRestored += batch.length;
        }
      }
    }

    // Update restore record
    await supabase
      .from('restores')
      .update({
        status: 'completed',
        records_restored: recordsRestored,
        completed_at: new Date().toISOString(),
      })
      .eq('id', restoreId);

    logger.info('[Backup] Restore completed', {
      restoreId,
      recordsRestored,
    });
  } catch (error) {
    await supabase
      .from('restores')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', restoreId);

    logger.error('[Backup] Restore failed', { restoreId, error });
    throw error;
  }
}

// ============================================================================
// SCHEDULED BACKUPS
// ============================================================================

/**
 * Run scheduled backup cleanup (delete expired)
 */
export async function cleanupExpiredBackups(): Promise<number> {
  const supabase = await createServiceClient();

  const { data: expired } = await supabase
    .from('backups')
    .select('id')
    .eq('status', 'completed')
    .lt('expires_at', new Date().toISOString());

  let deleted = 0;
  for (const backup of expired || []) {
    try {
      await deleteBackup(backup.id);
      deleted++;
    } catch (error) {
      logger.warn('[Backup] Failed to delete expired backup', {
        backupId: backup.id,
        error,
      });
    }
  }

  logger.info('[Backup] Cleanup completed', { deleted });
  return deleted;
}

/**
 * Create scheduled backup (for cron job)
 */
export async function runScheduledBackup(): Promise<BackupRecord> {
  return createBackup('system', {
    name: `scheduled-${new Date().toISOString().split('T')[0]}`,
    description: 'Automated daily backup',
    type: 'full',
    retention: 30,
  });
}

export default {
  createBackup,
  listBackups,
  getBackup,
  deleteBackup,
  restoreFromBackup,
  cleanupExpiredBackups,
  runScheduledBackup,
  CORE_TABLES,
  EXTENDED_TABLES,
  ALL_TABLES,
};
