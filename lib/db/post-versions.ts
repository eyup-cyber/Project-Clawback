/**
 * Post Versions Database Operations
 * Phase 1.2.4: Version history for posts
 */

import { createClient } from '@/lib/supabase/server';

export interface PostVersion {
  id: string;
  post_id: string;
  author_id: string;
  version_number: number;
  title: string;
  content: Record<string, unknown> | null;
  content_html: string | null;
  change_summary: string | null;
  created_at: string;
  author?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface PostVersionWithAuthor extends PostVersion {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// ============================================================================
// VERSION OPERATIONS
// ============================================================================

export async function createPostVersion(
  postId: string,
  authorId: string,
  changeSummary?: string
): Promise<PostVersion> {
  const supabase = await createClient();

  // Get current post data
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('title, content, content_html')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    throw new Error('Post not found');
  }

  // Insert version (version_number is auto-incremented by trigger)
  const { data: version, error } = await supabase
    .from('post_versions')
    .insert({
      post_id: postId,
      author_id: authorId,
      title: post.title,
      content: post.content,
      content_html: post.content_html,
      change_summary: changeSummary || null,
    })
    .select()
    .single();

  if (error) throw error;
  return version;
}

export async function getPostVersions(postId: string): Promise<PostVersionWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('post_versions')
    .select(
      `
      *,
      author:profiles!post_versions_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('post_id', postId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return (data || []) as PostVersionWithAuthor[];
}

export async function getPostVersion(versionId: string): Promise<PostVersionWithAuthor> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('post_versions')
    .select(
      `
      *,
      author:profiles!post_versions_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('id', versionId)
    .single();

  if (error || !data) {
    throw new Error('Version not found');
  }

  return data as PostVersionWithAuthor;
}

export async function restorePostVersion(versionId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Get version
  const { data: version, error: versionError } = await supabase
    .from('post_versions')
    .select('post_id, title, content, content_html, version_number')
    .eq('id', versionId)
    .single();

  if (versionError || !version) {
    throw new Error('Version not found');
  }

  // Create a version of current state before restoring
  await createPostVersion(
    version.post_id,
    userId,
    `Before restore to version ${version.version_number}`
  );

  // Restore the post
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      title: version.title,
      content: version.content,
      content_html: version.content_html,
      updated_at: new Date().toISOString(),
    })
    .eq('id', version.post_id);

  if (updateError) throw updateError;
}

export async function compareVersions(
  versionAId: string,
  versionBId: string
): Promise<{
  version_a: PostVersionWithAuthor;
  version_b: PostVersionWithAuthor;
}> {
  const [versionA, versionB] = await Promise.all([
    getPostVersion(versionAId),
    getPostVersion(versionBId),
  ]);

  return {
    version_a: versionA,
    version_b: versionB,
  };
}
