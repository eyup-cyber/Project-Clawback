// @ts-nocheck
/**
 * Content Versioning Library
 * CRUD operations for post versions
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface PostVersion {
  id: string;
  postId: string;
  versionNumber: number;
  title: string;
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  contentType: string;
  metadata?: Record<string, unknown>;
  changeSummary?: string;
  changeType: 'create' | 'edit' | 'publish' | 'revert' | 'autosave';
  createdBy: string;
  createdAt: string;
  wordCount?: number;
  characterCount?: number;
  // Joined data
  createdByProfile?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface VersionComparison {
  fieldName: string;
  versionAValue: string | null;
  versionBValue: string | null;
  hasChanged: boolean;
}

export interface CreateVersionInput {
  postId: string;
  changeType?: 'create' | 'edit' | 'publish' | 'revert' | 'autosave';
  changeSummary?: string;
}

/**
 * Get all versions for a post
 */
export async function getPostVersions(
  postId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ versions: PostVersion[]; total: number }> {
  const supabase = await createServiceClient();
  const { limit = 50, offset = 0 } = options || {};

  const { data, error, count } = await supabase
    .from('post_versions')
    .select(
      `
      id,
      post_id,
      version_number,
      title,
      content,
      excerpt,
      featured_image_url,
      content_type,
      metadata,
      change_summary,
      change_type,
      created_by,
      created_at,
      word_count,
      character_count,
      created_by_profile:profiles!created_by(username, display_name, avatar_url)
    `,
      { count: 'exact' }
    )
    .eq('post_id', postId)
    .order('version_number', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching versions:', error);
    return { versions: [], total: 0 };
  }

  const versions: PostVersion[] = (data || []).map((v) => ({
    id: v.id,
    postId: v.post_id,
    versionNumber: v.version_number,
    title: v.title,
    content: v.content,
    excerpt: v.excerpt,
    featuredImageUrl: v.featured_image_url,
    contentType: v.content_type,
    metadata: v.metadata as Record<string, unknown>,
    changeSummary: v.change_summary,
    changeType: v.change_type,
    createdBy: v.created_by,
    createdAt: v.created_at,
    wordCount: v.word_count,
    characterCount: v.character_count,
    createdByProfile: v.created_by_profile
      ? {
          username: (
            (Array.isArray(v.created_by_profile)
              ? v.created_by_profile[0]
              : v.created_by_profile) as { username: string } | undefined
          ).username,
          displayName: (v.created_by_profile as { display_name?: string }).display_name,
          avatarUrl: (v.created_by_profile as { avatar_url?: string }).avatar_url,
        }
      : undefined,
  }));

  return { versions, total: count || 0 };
}

/**
 * Get a specific version
 */
export async function getVersion(
  postId: string,
  versionNumber: number
): Promise<PostVersion | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('post_versions')
    .select(
      `
      id,
      post_id,
      version_number,
      title,
      content,
      excerpt,
      featured_image_url,
      content_type,
      metadata,
      change_summary,
      change_type,
      created_by,
      created_at,
      word_count,
      character_count,
      created_by_profile:profiles!created_by(username, display_name, avatar_url)
    `
    )
    .eq('post_id', postId)
    .eq('version_number', versionNumber)
    .single();

  if (error || !data) {
    console.error('Error fetching version:', error);
    return null;
  }

  return {
    id: data.id,
    postId: data.post_id,
    versionNumber: data.version_number,
    title: data.title,
    content: data.content,
    excerpt: data.excerpt,
    featuredImageUrl: data.featured_image_url,
    contentType: data.content_type,
    metadata: data.metadata as Record<string, unknown>,
    changeSummary: data.change_summary,
    changeType: data.change_type,
    createdBy: data.created_by,
    createdAt: data.created_at,
    wordCount: data.word_count,
    characterCount: data.character_count,
    createdByProfile: data.created_by_profile
      ? {
          username: (
            (Array.isArray(data.created_by_profile)
              ? data.created_by_profile[0]
              : data.created_by_profile) as { username: string } | undefined
          ).username,
          displayName: (data.created_by_profile as { display_name?: string }).display_name,
          avatarUrl: (data.created_by_profile as { avatar_url?: string }).avatar_url,
        }
      : undefined,
  };
}

/**
 * Create a new version snapshot
 */
export async function createVersion(
  input: CreateVersionInput,
  userId: string
): Promise<string | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.rpc('create_post_version', {
    p_post_id: input.postId,
    p_created_by: userId,
    p_change_type: input.changeType || 'edit',
    p_change_summary: input.changeSummary || null,
  });

  if (error) {
    console.error('Error creating version:', error);
    return null;
  }

  return data as string;
}

/**
 * Restore a post to a previous version
 */
export async function restoreVersion(
  postId: string,
  versionNumber: number,
  userId: string
): Promise<string | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.rpc('restore_post_version', {
    p_post_id: postId,
    p_version_number: versionNumber,
    p_restored_by: userId,
  });

  if (error) {
    console.error('Error restoring version:', error);
    return null;
  }

  return data as string;
}

/**
 * Compare two versions
 */
export async function compareVersions(
  postId: string,
  versionA: number,
  versionB: number
): Promise<VersionComparison[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.rpc('compare_post_versions', {
    p_post_id: postId,
    p_version_a: versionA,
    p_version_b: versionB,
  });

  if (error) {
    console.error('Error comparing versions:', error);
    return [];
  }

  return (
    data as Array<{
      field_name: string;
      version_a_value: string | null;
      version_b_value: string | null;
      has_changed: boolean;
    }>
  ).map((row) => ({
    fieldName: row.field_name,
    versionAValue: row.version_a_value,
    versionBValue: row.version_b_value,
    hasChanged: row.has_changed,
  }));
}

/**
 * Get the latest version number for a post
 */
export async function getLatestVersionNumber(postId: string): Promise<number> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('post_versions')
    .select('version_number')
    .eq('post_id', postId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.version_number;
}

/**
 * Save autosave draft
 */
export async function saveAutosave(
  postId: string,
  title: string,
  content: string,
  excerpt?: string,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.rpc('save_post_autosave', {
    p_post_id: postId,
    p_title: title,
    p_content: content,
    p_excerpt: excerpt || null,
    p_metadata: metadata || {},
  });

  if (error) {
    console.error('Error saving autosave:', error);
    return null;
  }

  return data as string;
}

/**
 * Get autosave for a post
 */
export async function getAutosave(
  postId: string,
  userId: string
): Promise<{
  title: string;
  content: string;
  excerpt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
} | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('post_autosaves')
    .select('title, content, excerpt, metadata, created_at')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    title: data.title,
    content: data.content,
    excerpt: data.excerpt,
    metadata: data.metadata as Record<string, unknown>,
    createdAt: data.created_at,
  };
}

/**
 * Delete autosave
 */
export async function deleteAutosave(postId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('post_autosaves')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  return !error;
}

/**
 * Get version statistics for a post
 */
export async function getVersionStats(postId: string): Promise<{
  totalVersions: number;
  firstVersion: string | null;
  latestVersion: string | null;
  totalEditors: number;
}> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('post_versions')
    .select('created_at, created_by')
    .eq('post_id', postId)
    .order('version_number', { ascending: true });

  if (error || !data || data.length === 0) {
    return {
      totalVersions: 0,
      firstVersion: null,
      latestVersion: null,
      totalEditors: 0,
    };
  }

  const uniqueEditors = new Set(data.map((v) => v.created_by));

  return {
    totalVersions: data.length,
    firstVersion: data[0].created_at,
    latestVersion: data[data.length - 1].created_at,
    totalEditors: uniqueEditors.size,
  };
}
