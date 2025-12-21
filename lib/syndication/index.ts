/**
 * Content Syndication System
 * Phase 57: Auto-publish to external platforms
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface SyndicationTarget {
  id: string;
  user_id: string;
  platform: SyndicationPlatform;
  name: string;
  config: PlatformConfig;
  is_active: boolean;
  auto_syndicate: boolean;
  syndication_delay_minutes: number;
  include_images: boolean;
  include_canonical_link: boolean;
  custom_footer: string | null;
  last_syndicated_at: string | null;
  total_syndicated: number;
  failed_syndications: number;
  created_at: string;
  updated_at: string;
}

export type SyndicationPlatform =
  | 'medium'
  | 'dev_to'
  | 'hashnode'
  | 'wordpress'
  | 'tumblr'
  | 'blogger'
  | 'linkedin'
  | 'mastodon'
  | 'bluesky';

export interface PlatformConfig {
  // OAuth tokens
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;

  // API keys
  api_key?: string;
  api_secret?: string;

  // Platform-specific
  publication_id?: string; // Medium, Hashnode
  organization_id?: string; // LinkedIn
  blog_url?: string; // WordPress, Blogger
  instance_url?: string; // Mastodon
  handle?: string; // Bluesky

  // Content options
  tags_prefix?: string;
  default_tags?: string[];
  content_format?: 'html' | 'markdown';
}

export interface SyndicationRecord {
  id: string;
  target_id: string;
  post_id: string;
  platform: SyndicationPlatform;
  external_id: string | null;
  external_url: string | null;
  status: SyndicationStatus;
  error_message: string | null;
  response_data: Record<string, unknown> | null;
  syndicated_at: string | null;
  created_at: string;
}

export type SyndicationStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';

export interface SyndicationPayload {
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  canonical_url?: string;
  featured_image_url?: string;
  author_name?: string;
  published_at?: string;
}

export interface SyndicationResult {
  success: boolean;
  external_id?: string;
  external_url?: string;
  error?: string;
}

// ============================================================================
// TARGET MANAGEMENT
// ============================================================================

/**
 * Create a syndication target
 */
export async function createSyndicationTarget(
  input: Pick<SyndicationTarget, 'platform' | 'name' | 'config'> &
    Partial<Pick<SyndicationTarget, 'auto_syndicate' | 'syndication_delay_minutes' | 'include_images' | 'include_canonical_link' | 'custom_footer'>>
): Promise<SyndicationTarget> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('syndication_targets')
    .insert({
      user_id: user.id,
      platform: input.platform,
      name: input.name,
      config: input.config,
      is_active: true,
      auto_syndicate: input.auto_syndicate ?? false,
      syndication_delay_minutes: input.syndication_delay_minutes ?? 0,
      include_images: input.include_images ?? true,
      include_canonical_link: input.include_canonical_link ?? true,
      custom_footer: input.custom_footer || null,
      total_syndicated: 0,
      failed_syndications: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Syndication] Failed to create target', error);
    throw error;
  }

  logger.info('[Syndication] Target created', { target_id: data.id, platform: input.platform });
  return data as SyndicationTarget;
}

/**
 * Update a syndication target
 */
export async function updateSyndicationTarget(
  targetId: string,
  updates: Partial<Pick<SyndicationTarget, 'name' | 'config' | 'is_active' | 'auto_syndicate' | 'syndication_delay_minutes' | 'include_images' | 'include_canonical_link' | 'custom_footer'>>
): Promise<SyndicationTarget> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('syndication_targets')
    .update(updates)
    .eq('id', targetId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('[Syndication] Failed to update target', error);
    throw error;
  }

  return data as SyndicationTarget;
}

/**
 * Delete a syndication target
 */
export async function deleteSyndicationTarget(targetId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('syndication_targets')
    .delete()
    .eq('id', targetId)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }
}

/**
 * List user's syndication targets
 */
export async function listSyndicationTargets(): Promise<SyndicationTarget[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('syndication_targets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');

  if (error) {
    throw error;
  }

  return (data || []) as SyndicationTarget[];
}

// ============================================================================
// SYNDICATION OPERATIONS
// ============================================================================

/**
 * Syndicate a post to a target
 */
export async function syndicatePost(
  postId: string,
  targetId: string
): Promise<SyndicationRecord> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get target
  const { data: target, error: targetError } = await supabase
    .from('syndication_targets')
    .select('*')
    .eq('id', targetId)
    .eq('user_id', user.id)
    .single();

  if (targetError || !target) {
    throw new Error('Target not found');
  }

  // Get post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey (display_name, username),
      category:categories (name, slug)
    `
    )
    .eq('id', postId)
    .eq('author_id', user.id)
    .single();

  if (postError || !post) {
    throw new Error('Post not found');
  }

  // Create record
  const { data: record, error: recordError } = await supabase
    .from('syndication_records')
    .insert({
      target_id: targetId,
      post_id: postId,
      platform: target.platform,
      status: 'processing',
    })
    .select()
    .single();

  if (recordError) {
    throw recordError;
  }

  // Build payload
  const payload = buildSyndicationPayload(post, target as SyndicationTarget);

  // Execute syndication
  try {
    const result = await executeSyndication(target as SyndicationTarget, payload);

    // Update record
    await supabase
      .from('syndication_records')
      .update({
        status: result.success ? 'success' : 'failed',
        external_id: result.external_id || null,
        external_url: result.external_url || null,
        error_message: result.error || null,
        syndicated_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', record.id);

    // Update target stats
    await supabase
      .from('syndication_targets')
      .update({
        last_syndicated_at: new Date().toISOString(),
        total_syndicated: target.total_syndicated + (result.success ? 1 : 0),
        failed_syndications: target.failed_syndications + (result.success ? 0 : 1),
      })
      .eq('id', targetId);

    logger.info('[Syndication] Post syndicated', {
      post_id: postId,
      target_id: targetId,
      platform: target.platform,
      success: result.success,
    });

    return { ...record, status: result.success ? 'success' : 'failed' } as SyndicationRecord;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase
      .from('syndication_records')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', record.id);

    await supabase
      .from('syndication_targets')
      .update({
        failed_syndications: target.failed_syndications + 1,
      })
      .eq('id', targetId);

    return { ...record, status: 'failed', error_message: errorMessage } as SyndicationRecord;
  }
}

/**
 * Syndicate to all active targets
 */
export async function syndicateToAll(postId: string): Promise<SyndicationRecord[]> {
  const targets = await listSyndicationTargets();
  const activeTargets = targets.filter((t) => t.is_active && t.auto_syndicate);

  const records: SyndicationRecord[] = [];

  for (const target of activeTargets) {
    // Check if already syndicated
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('syndication_records')
      .select('id')
      .eq('post_id', postId)
      .eq('target_id', target.id)
      .eq('status', 'success')
      .single();

    if (existing) continue;

    // Apply delay if configured
    if (target.syndication_delay_minutes > 0) {
      // Queue for later
      await queueSyndication(postId, target.id, target.syndication_delay_minutes);
    } else {
      const record = await syndicatePost(postId, target.id);
      records.push(record);
    }
  }

  return records;
}

/**
 * Queue syndication for later
 */
async function queueSyndication(
  postId: string,
  targetId: string,
  delayMinutes: number
): Promise<void> {
  const supabase = await createClient();

  const scheduledFor = new Date();
  scheduledFor.setMinutes(scheduledFor.getMinutes() + delayMinutes);

  await supabase.from('syndication_records').insert({
    target_id: targetId,
    post_id: postId,
    platform: 'pending' as SyndicationPlatform,
    status: 'pending',
    response_data: { scheduled_for: scheduledFor.toISOString() },
  });
}

/**
 * Get syndication records for a post
 */
export async function getPostSyndications(postId: string): Promise<SyndicationRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('syndication_records')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as SyndicationRecord[];
}

// ============================================================================
// PAYLOAD BUILDING
// ============================================================================

/**
 * Build syndication payload from post
 */
function buildSyndicationPayload(
  post: Record<string, unknown>,
  target: SyndicationTarget
): SyndicationPayload {
  let content = post.content as string;

  // Convert content format if needed
  if (target.config.content_format === 'markdown') {
    content = htmlToMarkdown(content);
  }

  // Add canonical link
  if (target.include_canonical_link) {
    const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/posts/${post.slug}`;
    const canonicalNote = `\n\n---\n*Originally published at [${process.env.NEXT_PUBLIC_SITE_NAME}](${canonicalUrl})*`;
    content += canonicalNote;
  }

  // Add custom footer
  if (target.custom_footer) {
    content += `\n\n${target.custom_footer}`;
  }

  // Build tags
  let tags = post.tags as string[] || [];
  if (target.config.default_tags) {
    tags = [...tags, ...target.config.default_tags];
  }
  if (target.config.tags_prefix) {
    tags = tags.map((tag) => `${target.config.tags_prefix}${tag}`);
  }

  return {
    title: post.title as string,
    content,
    excerpt: post.excerpt as string,
    tags,
    canonical_url: `${process.env.NEXT_PUBLIC_SITE_URL}/posts/${post.slug}`,
    featured_image_url: target.include_images ? (post.featured_image_url as string) : undefined,
    author_name: (post.author as Record<string, string>)?.display_name,
    published_at: post.published_at as string,
  };
}

// ============================================================================
// PLATFORM INTEGRATIONS
// ============================================================================

/**
 * Execute syndication to platform
 */
async function executeSyndication(
  target: SyndicationTarget,
  payload: SyndicationPayload
): Promise<SyndicationResult> {
  switch (target.platform) {
    case 'medium':
      return syndicateToMedium(target, payload);
    case 'dev_to':
      return syndicateToDevTo(target, payload);
    case 'hashnode':
      return syndicateToHashnode(target, payload);
    case 'linkedin':
      return syndicateToLinkedIn(target, payload);
    case 'mastodon':
      return syndicateToMastodon(target, payload);
    default:
      return { success: false, error: `Unsupported platform: ${target.platform}` };
  }
}

/**
 * Syndicate to Medium
 */
async function syndicateToMedium(
  target: SyndicationTarget,
  payload: SyndicationPayload
): Promise<SyndicationResult> {
  const { access_token } = target.config;
  if (!access_token) {
    return { success: false, error: 'Missing access token' };
  }

  try {
    // Get user ID
    const userResponse = await fetch('https://api.medium.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userData = await userResponse.json();

    // Create post
    const response = await fetch(
      `https://api.medium.com/v1/users/${userData.data.id}/posts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: payload.title,
          contentFormat: 'html',
          content: payload.content,
          canonicalUrl: payload.canonical_url,
          tags: payload.tags?.slice(0, 5),
          publishStatus: 'draft', // Let user review before publishing
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        external_id: result.data.id,
        external_url: result.data.url,
      };
    }

    return { success: false, error: result.errors?.[0]?.message || 'Failed to create post' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Syndicate to Dev.to
 */
async function syndicateToDevTo(
  target: SyndicationTarget,
  payload: SyndicationPayload
): Promise<SyndicationResult> {
  const { api_key } = target.config;
  if (!api_key) {
    return { success: false, error: 'Missing API key' };
  }

  try {
    const response = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: {
          title: payload.title,
          body_markdown: htmlToMarkdown(payload.content),
          canonical_url: payload.canonical_url,
          tags: payload.tags?.slice(0, 4),
          main_image: payload.featured_image_url,
          published: false, // Draft first
        },
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        external_id: String(result.id),
        external_url: result.url,
      };
    }

    return { success: false, error: result.error || 'Failed to create article' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Syndicate to Hashnode
 */
async function syndicateToHashnode(
  target: SyndicationTarget,
  payload: SyndicationPayload
): Promise<SyndicationResult> {
  const { api_key, publication_id } = target.config;
  if (!api_key || !publication_id) {
    return { success: false, error: 'Missing API key or publication ID' };
  }

  try {
    const response = await fetch('https://gql.hashnode.com/', {
      method: 'POST',
      headers: {
        Authorization: api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation CreateStory($input: CreateStoryInput!) {
            createStory(input: $input) {
              post {
                _id
                slug
                publication {
                  domain
                }
              }
            }
          }
        `,
        variables: {
          input: {
            title: payload.title,
            contentMarkdown: htmlToMarkdown(payload.content),
            publicationId: publication_id,
            tags: payload.tags?.map((tag) => ({ slug: tag.toLowerCase() })),
            originalArticleURL: payload.canonical_url,
            coverImageURL: payload.featured_image_url,
            isRepublished: true,
          },
        },
      }),
    });

    const result = await response.json();

    if (result.data?.createStory?.post) {
      const post = result.data.createStory.post;
      return {
        success: true,
        external_id: post._id,
        external_url: `https://${post.publication.domain}/${post.slug}`,
      };
    }

    return { success: false, error: result.errors?.[0]?.message || 'Failed to create story' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Syndicate to LinkedIn
 */
async function syndicateToLinkedIn(
  target: SyndicationTarget,
  payload: SyndicationPayload
): Promise<SyndicationResult> {
  const { access_token } = target.config;
  if (!access_token) {
    return { success: false, error: 'Missing access token' };
  }

  try {
    // Get user URN
    const meResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const meData = await meResponse.json();
    const authorUrn = `urn:li:person:${meData.id}`;

    // Create share
    const response = await fetch('https://api.linkedin.com/v2/shares', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        owner: authorUrn,
        text: {
          text: `${payload.title}\n\n${payload.excerpt || ''}\n\nRead more: ${payload.canonical_url}`,
        },
        content: {
          contentEntities: [
            {
              entityLocation: payload.canonical_url,
              thumbnails: payload.featured_image_url
                ? [{ resolvedUrl: payload.featured_image_url }]
                : [],
            },
          ],
          title: payload.title,
        },
        distribution: {
          linkedInDistributionTarget: {},
        },
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        external_id: result.id,
        external_url: `https://www.linkedin.com/feed/update/${result.id}`,
      };
    }

    return { success: false, error: result.message || 'Failed to create share' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Syndicate to Mastodon
 */
async function syndicateToMastodon(
  target: SyndicationTarget,
  payload: SyndicationPayload
): Promise<SyndicationResult> {
  const { access_token, instance_url } = target.config;
  if (!access_token || !instance_url) {
    return { success: false, error: 'Missing access token or instance URL' };
  }

  try {
    // Create status (toot)
    const statusText = `${payload.title}\n\n${payload.excerpt || ''}\n\n${payload.canonical_url}`;

    const response = await fetch(`${instance_url}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: statusText,
        visibility: 'public',
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        external_id: result.id,
        external_url: result.url,
      };
    }

    return { success: false, error: result.error || 'Failed to create toot' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert HTML to Markdown (basic)
 */
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_, content) =>
      content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    )
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, content) => {
      let counter = 0;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${++counter}. $1\n`);
    })
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) =>
      content
        .split('\n')
        .map((line: string) => `> ${line}`)
        .join('\n')
    )
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
