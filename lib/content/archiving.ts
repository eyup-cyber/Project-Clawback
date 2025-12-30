/**
 * Content Archiving System
 * Phase 44: Archive old content, restore, permanent deletion
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface ArchivedContent {
  id: string;
  original_id: string;
  content_type: ContentType;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  metadata: ContentMetadata;
  author_id: string;
  category_id: string | null;
  tags: string[];
  original_created_at: string;
  original_published_at: string | null;
  archived_at: string;
  archived_by: string;
  archive_reason: ArchiveReason;
  archive_note: string | null;
  retention_until: string | null;
  is_permanently_deleted: boolean;
  deleted_at: string | null;
}

export type ContentType = 'post' | 'comment' | 'page' | 'draft';

export type ArchiveReason =
  | 'author_request'
  | 'admin_action'
  | 'policy_violation'
  | 'outdated'
  | 'duplicate'
  | 'legal'
  | 'automated'
  | 'other';

export interface ContentMetadata {
  featured_image_url?: string;
  featured_image_alt?: string;
  reading_time?: number;
  word_count?: number;
  view_count?: number;
  comment_count?: number;
  reaction_count?: number;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  additional?: Record<string, unknown>;
}

export interface ArchiveOptions {
  reason: ArchiveReason;
  note?: string;
  retention_days?: number;
  notify_author?: boolean;
}

export interface ArchiveQuery {
  content_type?: ContentType | ContentType[];
  author_id?: string;
  archived_by?: string;
  reason?: ArchiveReason | ArchiveReason[];
  date_from?: Date;
  date_to?: Date;
  search?: string;
  include_deleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface ArchiveStats {
  total_archived: number;
  by_type: Record<ContentType, number>;
  by_reason: Record<ArchiveReason, number>;
  pending_deletion: number;
  storage_saved_bytes: number;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  content_types: ContentType[];
  conditions: RetentionCondition[];
  retention_days: number;
  auto_archive: boolean;
  auto_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RetentionCondition {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  value: string | number | boolean;
}

// ============================================================================
// ARCHIVE OPERATIONS
// ============================================================================

/**
 * Archive a piece of content
 */
export async function archiveContent(
  contentType: ContentType,
  contentId: string,
  options: ArchiveOptions
): Promise<ArchivedContent> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get the original content
  const tableName = getTableName(contentType);
  const { data: content, error: fetchError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', contentId)
    .single();

  if (fetchError || !content) {
    throw new Error(`Content not found: ${fetchError?.message || 'Unknown error'}`);
  }

  // Calculate retention date
  let retentionUntil: string | null = null;
  if (options.retention_days) {
    const retention = new Date();
    retention.setDate(retention.getDate() + options.retention_days);
    retentionUntil = retention.toISOString();
  }

  // Create archive record
  const archiveData: Omit<ArchivedContent, 'id'> = {
    original_id: content.id,
    content_type: contentType,
    title: content.title || content.content?.substring(0, 100) || 'Untitled',
    slug: content.slug || '',
    content: content.content || content.body || '',
    excerpt: content.excerpt || null,
    metadata: extractMetadata(content, contentType),
    author_id: content.author_id || content.user_id,
    category_id: content.category_id || null,
    tags: content.tags || [],
    original_created_at: content.created_at,
    original_published_at: content.published_at || null,
    archived_at: new Date().toISOString(),
    archived_by: user.id,
    archive_reason: options.reason,
    archive_note: options.note || null,
    retention_until: retentionUntil,
    is_permanently_deleted: false,
    deleted_at: null,
  };

  const { data: archived, error: archiveError } = await supabase
    .from('archived_content')
    .insert(archiveData)
    .select()
    .single();

  if (archiveError) {
    logger.error('[Archiving] Failed to create archive record', archiveError);
    throw archiveError;
  }

  // Delete original content (soft delete or hard delete based on type)
  if (contentType === 'post') {
    await supabase
      .from(tableName)
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', contentId);
  } else {
    await supabase.from(tableName).delete().eq('id', contentId);
  }

  // Notify author if requested
  if (options.notify_author && content.author_id !== user.id) {
    await notifyArchive(content.author_id, archived as ArchivedContent, options);
  }

  logger.info('[Archiving] Content archived', {
    content_type: contentType,
    content_id: contentId,
    archive_id: archived.id,
    reason: options.reason,
  });

  return archived as ArchivedContent;
}

/**
 * Restore archived content
 */
export async function restoreContent(archiveId: string): Promise<{ restored_id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get archived content
  const { data: archived, error: fetchError } = await supabase
    .from('archived_content')
    .select('*')
    .eq('id', archiveId)
    .eq('is_permanently_deleted', false)
    .single();

  if (fetchError || !archived) {
    throw new Error('Archived content not found or already deleted');
  }

  // Restore to original table
  const tableName = getTableName(archived.content_type);
  const restoreData = buildRestoreData(archived);

  const { data: restored, error: restoreError } = await supabase
    .from(tableName)
    .insert(restoreData)
    .select('id')
    .single();

  if (restoreError) {
    logger.error('[Archiving] Failed to restore content', restoreError);
    throw restoreError;
  }

  // Delete archive record
  await supabase.from('archived_content').delete().eq('id', archiveId);

  logger.info('[Archiving] Content restored', {
    archive_id: archiveId,
    restored_id: restored.id,
    content_type: archived.content_type,
  });

  return { restored_id: restored.id };
}

/**
 * Permanently delete archived content
 */
export async function permanentlyDelete(archiveId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Mark as permanently deleted
  const { error } = await supabase
    .from('archived_content')
    .update({
      is_permanently_deleted: true,
      deleted_at: new Date().toISOString(),
      content: '[PERMANENTLY DELETED]',
      metadata: {},
    })
    .eq('id', archiveId);

  if (error) {
    logger.error('[Archiving] Failed to permanently delete', error);
    throw error;
  }

  logger.info('[Archiving] Content permanently deleted', {
    archive_id: archiveId,
  });
}

/**
 * Query archived content
 */
export async function queryArchive(
  query: ArchiveQuery
): Promise<{ items: ArchivedContent[]; total: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const {
    content_type,
    author_id,
    archived_by,
    reason,
    date_from,
    date_to,
    search,
    include_deleted = false,
    limit = 50,
    offset = 0,
  } = query;

  let queryBuilder = supabase.from('archived_content').select('*', { count: 'exact' });

  // Filter by deletion status
  if (!include_deleted) {
    queryBuilder = queryBuilder.eq('is_permanently_deleted', false);
  }

  // Filter by content type
  if (content_type) {
    if (Array.isArray(content_type)) {
      queryBuilder = queryBuilder.in('content_type', content_type);
    } else {
      queryBuilder = queryBuilder.eq('content_type', content_type);
    }
  }

  // Filter by author
  if (author_id) {
    queryBuilder = queryBuilder.eq('author_id', author_id);
  }

  // Filter by archiver
  if (archived_by) {
    queryBuilder = queryBuilder.eq('archived_by', archived_by);
  }

  // Filter by reason
  if (reason) {
    if (Array.isArray(reason)) {
      queryBuilder = queryBuilder.in('archive_reason', reason);
    } else {
      queryBuilder = queryBuilder.eq('archive_reason', reason);
    }
  }

  // Date filters
  if (date_from) {
    queryBuilder = queryBuilder.gte('archived_at', date_from.toISOString());
  }
  if (date_to) {
    queryBuilder = queryBuilder.lte('archived_at', date_to.toISOString());
  }

  // Search
  if (search) {
    queryBuilder = queryBuilder.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  // Pagination and sorting
  queryBuilder = queryBuilder
    .order('archived_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await queryBuilder;

  if (error) {
    logger.error('[Archiving] Failed to query archive', error);
    throw error;
  }

  return {
    items: (data || []) as ArchivedContent[],
    total: count || 0,
  };
}

/**
 * Get a single archived item
 */
export async function getArchivedContent(archiveId: string): Promise<ArchivedContent | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('archived_content')
    .select('*')
    .eq('id', archiveId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('[Archiving] Failed to get archived content', error);
    throw error;
  }

  return data as ArchivedContent;
}

// ============================================================================
// RETENTION POLICIES
// ============================================================================

/**
 * Create a retention policy
 */
export async function createRetentionPolicy(
  policy: Omit<RetentionPolicy, 'id' | 'created_at' | 'updated_at'>
): Promise<RetentionPolicy> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('retention_policies')
    .insert(policy)
    .select()
    .single();

  if (error) {
    logger.error('[Archiving] Failed to create retention policy', error);
    throw error;
  }

  logger.info('[Archiving] Retention policy created', {
    policy_id: data.id,
    name: policy.name,
  });
  return data as RetentionPolicy;
}

/**
 * Get all retention policies
 */
export async function getRetentionPolicies(): Promise<RetentionPolicy[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.from('retention_policies').select('*').order('name');

  if (error) {
    logger.error('[Archiving] Failed to get retention policies', error);
    throw error;
  }

  return (data || []) as RetentionPolicy[];
}

/**
 * Execute retention policies (automated archiving and deletion)
 */
export async function executeRetentionPolicies(): Promise<{
  archived: number;
  deleted: number;
  errors: string[];
}> {
  const supabase = await createServiceClient();
  const result = { archived: 0, deleted: 0, errors: [] as string[] };

  // Get active policies
  const policies = await getRetentionPolicies();
  const activePolicies = policies.filter((p) => p.is_active);

  for (const policy of activePolicies) {
    try {
      if (policy.auto_archive) {
        const archived = await executeAutoArchive(policy);
        result.archived += archived;
      }

      if (policy.auto_delete) {
        const deleted = await executeAutoDelete(policy);
        result.deleted += deleted;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Policy ${policy.name}: ${errorMessage}`);
    }
  }

  // Also delete expired archived content
  const { count: expiredDeleted } = await supabase
    .from('archived_content')
    .update({
      is_permanently_deleted: true,
      deleted_at: new Date().toISOString(),
      content: '[PERMANENTLY DELETED - RETENTION EXPIRED]',
      metadata: {},
    })
    .lt('retention_until', new Date().toISOString())
    .eq('is_permanently_deleted', false)
    .select('*');

  result.deleted += expiredDeleted || 0;

  logger.info('[Archiving] Retention policies executed', result);
  return result;
}

/**
 * Execute auto-archive for a policy
 */
async function executeAutoArchive(policy: RetentionPolicy): Promise<number> {
  const supabase = await createServiceClient();
  let archived = 0;

  for (const contentType of policy.content_types) {
    const tableName = getTableName(contentType);

    // Build query based on conditions
    let query = supabase.from(tableName).select('id');

    for (const condition of policy.conditions) {
      switch (condition.operator) {
        case 'gt':
          query = query.gt(condition.field, condition.value);
          break;
        case 'lt':
          query = query.lt(condition.field, condition.value);
          break;
        case 'gte':
          query = query.gte(condition.field, condition.value);
          break;
        case 'lte':
          query = query.lte(condition.field, condition.value);
          break;
        case 'eq':
          query = query.eq(condition.field, condition.value);
          break;
        case 'neq':
          query = query.neq(condition.field, condition.value);
          break;
      }
    }

    const { data: items } = await query;

    for (const item of items || []) {
      try {
        await archiveContent(contentType, item.id, {
          reason: 'automated',
          note: `Auto-archived by policy: ${policy.name}`,
          retention_days: policy.retention_days,
          notify_author: true,
        });
        archived++;
      } catch {
        // Continue with other items
      }
    }
  }

  return archived;
}

/**
 * Execute auto-delete for a policy
 */
async function executeAutoDelete(policy: RetentionPolicy): Promise<number> {
  const supabase = await createServiceClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

  const { count } = await supabase
    .from('archived_content')
    .update({
      is_permanently_deleted: true,
      deleted_at: new Date().toISOString(),
      content: '[PERMANENTLY DELETED - AUTO POLICY]',
      metadata: {},
    })
    .in('content_type', policy.content_types)
    .lte('archived_at', cutoffDate.toISOString())
    .eq('is_permanently_deleted', false)
    .select('*');

  return count || 0;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get archive statistics
 */
export async function getArchiveStats(): Promise<ArchiveStats> {
  const supabase = await createServiceClient();

  const { data: items } = await supabase
    .from('archived_content')
    .select('content_type, archive_reason, is_permanently_deleted, retention_until, content');

  const allItems = items || [];

  const byType: Record<ContentType, number> = {
    post: 0,
    comment: 0,
    page: 0,
    draft: 0,
  };

  const byReason: Record<ArchiveReason, number> = {
    author_request: 0,
    admin_action: 0,
    policy_violation: 0,
    outdated: 0,
    duplicate: 0,
    legal: 0,
    automated: 0,
    other: 0,
  };

  let pendingDeletion = 0;
  let storageSaved = 0;

  const now = new Date();

  for (const item of allItems) {
    if (!item.is_permanently_deleted) {
      byType[item.content_type as ContentType]++;
      byReason[item.archive_reason as ArchiveReason]++;

      if (item.retention_until && new Date(item.retention_until) <= now) {
        pendingDeletion++;
      }
    }

    // Estimate storage saved
    storageSaved += new Blob([item.content || '']).size;
  }

  return {
    total_archived: allItems.filter((i) => !i.is_permanently_deleted).length,
    by_type: byType,
    by_reason: byReason,
    pending_deletion: pendingDeletion,
    storage_saved_bytes: storageSaved,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTableName(contentType: ContentType): string {
  const tables: Record<ContentType, string> = {
    post: 'posts',
    comment: 'comments',
    page: 'pages',
    draft: 'drafts',
  };
  return tables[contentType];
}

function extractMetadata(
  content: Record<string, unknown>,
  contentType: ContentType
): ContentMetadata {
  const metadata: ContentMetadata = {};

  if (contentType === 'post') {
    metadata.featured_image_url = content.featured_image_url as string | undefined;
    metadata.featured_image_alt = content.featured_image_alt as string | undefined;
    metadata.reading_time = content.reading_time as number | undefined;
    metadata.word_count = content.word_count as number | undefined;
    metadata.view_count = content.view_count as number | undefined;
    metadata.comment_count = content.comment_count as number | undefined;
    metadata.reaction_count = content.reaction_count as number | undefined;

    if (content.seo_title || content.seo_description) {
      metadata.seo = {
        title: content.seo_title as string | undefined,
        description: content.seo_description as string | undefined,
      };
    }
  }

  return metadata;
}

function buildRestoreData(archived: ArchivedContent): Record<string, unknown> {
  const baseData: Record<string, unknown> = {
    title: archived.title,
    slug: archived.slug,
    content: archived.content,
    excerpt: archived.excerpt,
    author_id: archived.author_id,
    category_id: archived.category_id,
    tags: archived.tags,
    created_at: archived.original_created_at,
    published_at: archived.original_published_at,
  };

  // Add metadata back
  if (archived.metadata) {
    if (archived.metadata.featured_image_url) {
      baseData.featured_image_url = archived.metadata.featured_image_url;
    }
    if (archived.metadata.featured_image_alt) {
      baseData.featured_image_alt = archived.metadata.featured_image_alt;
    }
    if (archived.metadata.reading_time) {
      baseData.reading_time = archived.metadata.reading_time;
    }
    if (archived.metadata.word_count) {
      baseData.word_count = archived.metadata.word_count;
    }
  }

  return baseData;
}

async function notifyArchive(
  authorId: string,
  archived: ArchivedContent,
  options: ArchiveOptions
): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('notifications').insert({
    user_id: authorId,
    type: 'content_archived',
    title: 'Content Archived',
    message: `Your ${archived.content_type} "${archived.title}" has been archived.`,
    data: {
      archive_id: archived.id,
      content_type: archived.content_type,
      reason: options.reason,
      note: options.note,
      retention_days: options.retention_days,
    },
    is_read: false,
  });
}
