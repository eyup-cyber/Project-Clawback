/**
 * Content Versioning and Diff System
 * Phase 54: Version history, comparison, and restoration
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentVersion {
  id: string;
  content_type: ContentType;
  content_id: string;
  version_number: number;
  title: string;
  content: string;
  excerpt: string | null;
  metadata: VersionMetadata;
  created_by: string;
  created_at: string;
  change_summary: string | null;
  is_auto_save: boolean;
  is_published: boolean;
  word_count: number;
  character_count: number;
}

export type ContentType = 'post' | 'page' | 'draft';

export interface VersionMetadata {
  category_id?: string;
  tags?: string[];
  featured_image_url?: string;
  featured_image_alt?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  custom_fields?: Record<string, unknown>;
}

export interface VersionWithAuthor extends ContentVersion {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface DiffResult {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  lineNumber?: number;
}

export interface ContentDiff {
  title: TextDiff;
  content: LineDiff[];
  excerpt: TextDiff | null;
  metadata: MetadataDiff;
  stats: DiffStats;
}

export interface TextDiff {
  old: string;
  new: string;
  changed: boolean;
}

export interface LineDiff {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface MetadataDiff {
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  wordCountChange: number;
  characterCountChange: number;
}

export interface VersionQuery {
  content_type: ContentType;
  content_id: string;
  include_auto_saves?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// VERSION MANAGEMENT
// ============================================================================

/**
 * Create a new version
 */
export async function createVersion(
  contentType: ContentType,
  contentId: string,
  data: {
    title: string;
    content: string;
    excerpt?: string;
    metadata?: VersionMetadata;
    changeSummary?: string;
    isAutoSave?: boolean;
  }
): Promise<ContentVersion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get current version number
  const { data: latestVersion } = await supabase
    .from('content_versions')
    .select('version_number')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const versionNumber = (latestVersion?.version_number || 0) + 1;

  // Calculate stats
  const wordCount = data.content.split(/\s+/).filter(Boolean).length;
  const characterCount = data.content.length;

  // Check current published status
  const tableName = contentType === 'post' ? 'posts' : contentType === 'page' ? 'pages' : 'drafts';
  const { data: currentContent } = await supabase
    .from(tableName)
    .select('status')
    .eq('id', contentId)
    .single();

  const isPublished = currentContent?.status === 'published';

  const { data: version, error } = await supabase
    .from('content_versions')
    .insert({
      content_type: contentType,
      content_id: contentId,
      version_number: versionNumber,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || null,
      metadata: data.metadata || {},
      created_by: user.id,
      change_summary: data.changeSummary || null,
      is_auto_save: data.isAutoSave || false,
      is_published: isPublished,
      word_count: wordCount,
      character_count: characterCount,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Versioning] Failed to create version', error);
    throw error;
  }

  logger.info('[Versioning] Version created', {
    content_type: contentType,
    content_id: contentId,
    version_number: versionNumber,
  });

  return version as ContentVersion;
}

/**
 * Get versions for content
 */
export async function getVersions(
  query: VersionQuery
): Promise<{ versions: VersionWithAuthor[]; total: number }> {
  const supabase = await createClient();

  const {
    content_type,
    content_id,
    include_auto_saves = false,
    limit = 50,
    offset = 0,
  } = query;

  let queryBuilder = supabase
    .from('content_versions')
    .select(
      `
      *,
      author:profiles!content_versions_created_by_fkey (
        id, username, display_name, avatar_url
      )
    `,
      { count: 'exact' }
    )
    .eq('content_type', content_type)
    .eq('content_id', content_id);

  if (!include_auto_saves) {
    queryBuilder = queryBuilder.eq('is_auto_save', false);
  }

  queryBuilder = queryBuilder
    .order('version_number', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await queryBuilder;

  if (error) {
    logger.error('[Versioning] Failed to get versions', error);
    throw error;
  }

  return {
    versions: (data || []) as VersionWithAuthor[],
    total: count || 0,
  };
}

/**
 * Get a specific version
 */
export async function getVersion(versionId: string): Promise<VersionWithAuthor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_versions')
    .select(
      `
      *,
      author:profiles!content_versions_created_by_fkey (
        id, username, display_name, avatar_url
      )
    `
    )
    .eq('id', versionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as VersionWithAuthor;
}

/**
 * Get version by number
 */
export async function getVersionByNumber(
  contentType: ContentType,
  contentId: string,
  versionNumber: number
): Promise<VersionWithAuthor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_versions')
    .select(
      `
      *,
      author:profiles!content_versions_created_by_fkey (
        id, username, display_name, avatar_url
      )
    `
    )
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('version_number', versionNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as VersionWithAuthor;
}

/**
 * Restore a version
 */
export async function restoreVersion(versionId: string): Promise<ContentVersion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get the version to restore
  const version = await getVersion(versionId);
  if (!version) {
    throw new Error('Version not found');
  }

  // Update the content
  const tableName =
    version.content_type === 'post'
      ? 'posts'
      : version.content_type === 'page'
        ? 'pages'
        : 'drafts';

  const { error: updateError } = await supabase
    .from(tableName)
    .update({
      title: version.title,
      content: version.content,
      excerpt: version.excerpt,
      ...version.metadata,
    })
    .eq('id', version.content_id);

  if (updateError) {
    logger.error('[Versioning] Failed to restore version', updateError);
    throw updateError;
  }

  // Create a new version marking the restoration
  const newVersion = await createVersion(version.content_type, version.content_id, {
    title: version.title,
    content: version.content,
    excerpt: version.excerpt || undefined,
    metadata: version.metadata,
    changeSummary: `Restored from version ${version.version_number}`,
  });

  logger.info('[Versioning] Version restored', {
    restored_version: versionId,
    new_version: newVersion.id,
  });

  return newVersion;
}

/**
 * Delete old auto-save versions
 */
export async function cleanupAutoSaves(
  contentType: ContentType,
  contentId: string,
  keepCount: number = 5
): Promise<number> {
  const supabase = await createServiceClient();

  // Get auto-save versions to delete
  const { data: autoSaves } = await supabase
    .from('content_versions')
    .select('id')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('is_auto_save', true)
    .order('created_at', { ascending: false })
    .range(keepCount, 1000);

  if (!autoSaves || autoSaves.length === 0) {
    return 0;
  }

  const idsToDelete = autoSaves.map((v) => v.id);

  const { error } = await supabase
    .from('content_versions')
    .delete()
    .in('id', idsToDelete);

  if (error) {
    logger.error('[Versioning] Failed to cleanup auto-saves', error);
    throw error;
  }

  return idsToDelete.length;
}

// ============================================================================
// DIFF GENERATION
// ============================================================================

/**
 * Compare two versions
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string
): Promise<ContentDiff> {
  const [version1, version2] = await Promise.all([
    getVersion(versionId1),
    getVersion(versionId2),
  ]);

  if (!version1 || !version2) {
    throw new Error('One or both versions not found');
  }

  // Ensure version1 is older
  const [older, newer] =
    version1.version_number < version2.version_number
      ? [version1, version2]
      : [version2, version1];

  return generateDiff(older, newer);
}

/**
 * Generate diff between two versions
 */
function generateDiff(oldVersion: ContentVersion, newVersion: ContentVersion): ContentDiff {
  // Title diff
  const titleDiff: TextDiff = {
    old: oldVersion.title,
    new: newVersion.title,
    changed: oldVersion.title !== newVersion.title,
  };

  // Content diff (line by line)
  const contentDiff = generateLineDiff(oldVersion.content, newVersion.content);

  // Excerpt diff
  const excerptDiff: TextDiff | null =
    oldVersion.excerpt || newVersion.excerpt
      ? {
          old: oldVersion.excerpt || '',
          new: newVersion.excerpt || '',
          changed: oldVersion.excerpt !== newVersion.excerpt,
        }
      : null;

  // Metadata diff
  const metadataDiff = generateMetadataDiff(oldVersion.metadata, newVersion.metadata);

  // Calculate stats
  const stats = calculateDiffStats(contentDiff, oldVersion, newVersion);

  return {
    title: titleDiff,
    content: contentDiff,
    excerpt: excerptDiff,
    metadata: metadataDiff,
    stats,
  };
}

/**
 * Generate line-by-line diff
 */
function generateLineDiff(oldText: string, newText: string): LineDiff[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: LineDiff[] = [];

  // Simple LCS-based diff algorithm
  const lcs = computeLCS(oldLines, newLines);

  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (
      lcsIndex < lcs.length &&
      oldIndex < oldLines.length &&
      newIndex < newLines.length &&
      oldLines[oldIndex] === lcs[lcsIndex] &&
      newLines[newIndex] === lcs[lcsIndex]
    ) {
      // Unchanged line
      diff.push({
        type: 'unchanged',
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
      });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (
      oldIndex < oldLines.length &&
      (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])
    ) {
      // Removed line
      diff.push({
        type: 'removed',
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
        newLineNumber: null,
      });
      oldIndex++;
    } else if (
      newIndex < newLines.length &&
      (lcsIndex >= lcs.length || newLines[newIndex] !== lcs[lcsIndex])
    ) {
      // Added line
      diff.push({
        type: 'added',
        content: newLines[newIndex],
        oldLineNumber: null,
        newLineNumber: newIndex + 1,
      });
      newIndex++;
    }
  }

  return diff;
}

/**
 * Compute Longest Common Subsequence
 */
function computeLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Generate metadata diff
 */
function generateMetadataDiff(
  oldMeta: VersionMetadata,
  newMeta: VersionMetadata
): MetadataDiff {
  const changes: MetadataDiff['changes'] = [];

  // Compare all keys
  const allKeys = new Set([...Object.keys(oldMeta), ...Object.keys(newMeta)]);

  for (const key of allKeys) {
    const oldValue = oldMeta[key as keyof VersionMetadata];
    const newValue = newMeta[key as keyof VersionMetadata];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }

  return { changes };
}

/**
 * Calculate diff statistics
 */
function calculateDiffStats(
  contentDiff: LineDiff[],
  oldVersion: ContentVersion,
  newVersion: ContentVersion
): DiffStats {
  let additions = 0;
  let deletions = 0;

  for (const line of contentDiff) {
    if (line.type === 'added') additions++;
    if (line.type === 'removed') deletions++;
  }

  return {
    additions,
    deletions,
    modifications: Math.min(additions, deletions),
    wordCountChange: newVersion.word_count - oldVersion.word_count,
    characterCountChange: newVersion.character_count - oldVersion.character_count,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get the latest version for content
 */
export async function getLatestVersion(
  contentType: ContentType,
  contentId: string
): Promise<ContentVersion | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_versions')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('is_auto_save', false)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as ContentVersion;
}

/**
 * Get version count for content
 */
export async function getVersionCount(
  contentType: ContentType,
  contentId: string,
  includeAutoSaves: boolean = false
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from('content_versions')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', contentType)
    .eq('content_id', contentId);

  if (!includeAutoSaves) {
    query = query.eq('is_auto_save', false);
  }

  const { count } = await query;
  return count || 0;
}

/**
 * Check if content has unsaved changes
 */
export async function hasUnsavedChanges(
  contentType: ContentType,
  contentId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get latest published version
  const { data: publishedVersion } = await supabase
    .from('content_versions')
    .select('version_number')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('is_published', true)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  // Get latest version overall
  const { data: latestVersion } = await supabase
    .from('content_versions')
    .select('version_number')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  if (!publishedVersion || !latestVersion) {
    return false;
  }

  return latestVersion.version_number > publishedVersion.version_number;
}

/**
 * Format diff for display
 */
export function formatDiffForHTML(diff: LineDiff[]): string {
  return diff
    .map((line) => {
      const lineNum = line.oldLineNumber || line.newLineNumber || '';
      const prefix =
        line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
      const className =
        line.type === 'added'
          ? 'diff-added'
          : line.type === 'removed'
            ? 'diff-removed'
            : 'diff-unchanged';

      return `<div class="${className}"><span class="line-num">${lineNum}</span><span class="prefix">${prefix}</span><span class="content">${escapeHtml(line.content)}</span></div>`;
    })
    .join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
