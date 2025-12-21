/**
 * Content Import/Export System
 * Phase 33: Import from Medium, WordPress, Substack; Export to various formats
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import TurndownService from 'turndown';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportSource {
  type: 'medium' | 'wordpress' | 'substack' | 'ghost' | 'markdown' | 'html';
  data: string | File | ArrayBuffer;
  options?: ImportOptions;
}

export interface ImportOptions {
  preserveImages?: boolean;
  preserveDates?: boolean;
  defaultCategory?: string;
  defaultStatus?: 'draft' | 'published';
  importComments?: boolean;
}

export interface ImportResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  source_type: ImportSource['type'];
  total_items: number;
  imported_items: number;
  failed_items: number;
  skipped_items: number;
  errors: ImportError[];
  started_at: string;
  completed_at: string | null;
  user_id: string;
}

export interface ImportError {
  item: string;
  error: string;
  details?: Record<string, unknown>;
}

export interface ExportOptions {
  format: ExportFormat;
  includeImages?: boolean;
  includeMetadata?: boolean;
  includeDrafts?: boolean;
  dateRange?: { from?: Date; to?: Date };
  postIds?: string[];
}

export type ExportFormat = 'markdown' | 'html' | 'json' | 'wordpress' | 'jekyll' | 'hugo';

export interface ExportResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: ExportFormat;
  total_posts: number;
  download_url: string | null;
  expires_at: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface ParsedPost {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  published_at?: string;
  tags?: string[];
  featured_image_url?: string;
  author?: string;
  canonical_url?: string;
}

// ============================================================================
// HTML TO MARKDOWN CONVERTER
// ============================================================================

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**',
});

// Add rules for common elements
turndownService.addRule('figure', {
  filter: 'figure',
  replacement: function (content, node) {
    const img = (node as Element).querySelector('img');
    const figcaption = (node as Element).querySelector('figcaption');
    
    if (img) {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      const caption = figcaption?.textContent || alt;
      return `\n![${caption}](${src})\n${caption ? `*${caption}*\n` : ''}`;
    }
    return content;
  },
});

turndownService.addRule('codeBlock', {
  filter: function (node) {
    return node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE';
  },
  replacement: function (_content, node) {
    const code = (node as Element).querySelector('code');
    const className = code?.getAttribute('class') || '';
    const language = className.match(/language-(\w+)/)?.[1] || '';
    const text = code?.textContent || '';
    return `\n\`\`\`${language}\n${text}\n\`\`\`\n`;
  },
});

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Start an import job
 */
export async function startImport(
  userId: string,
  source: ImportSource
): Promise<ImportResult> {
  const supabase = await createClient();

  // Create import record
  const { data: importRecord, error } = await supabase
    .from('import_jobs')
    .insert({
      user_id: userId,
      source_type: source.type,
      status: 'pending',
      total_items: 0,
      imported_items: 0,
      failed_items: 0,
      skipped_items: 0,
      errors: [],
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('[Import] Failed to create import job', error);
    throw error;
  }

  logger.info('[Import] Import job created', { importId: importRecord.id, type: source.type });

  // Process import asynchronously
  processImport(importRecord.id, userId, source).catch((err) => {
    logger.error('[Import] Background import failed', { importId: importRecord.id, error: err });
  });

  return importRecord as ImportResult;
}

/**
 * Process an import job
 */
async function processImport(
  importId: string,
  userId: string,
  source: ImportSource
): Promise<void> {
  const supabase = await createServiceClient();

  // Update status
  await supabase
    .from('import_jobs')
    .update({ status: 'processing' })
    .eq('id', importId);

  const errors: ImportError[] = [];
  let imported = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Parse content based on source type
    const posts = await parseImportSource(source);

    await supabase
      .from('import_jobs')
      .update({ total_items: posts.length })
      .eq('id', importId);

    // Import each post
    for (const post of posts) {
      try {
        await importPost(userId, post, source.options);
        imported++;
      } catch (err) {
        failed++;
        errors.push({
          item: post.title,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      // Update progress
      await supabase
        .from('import_jobs')
        .update({
          imported_items: imported,
          failed_items: failed,
          skipped_items: skipped,
          errors,
        })
        .eq('id', importId);
    }

    // Mark as completed
    await supabase
      .from('import_jobs')
      .update({
        status: failed === posts.length ? 'failed' : failed > 0 ? 'partial' : 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', importId);

    logger.info('[Import] Import completed', { importId, imported, failed, skipped });
  } catch (error) {
    await supabase
      .from('import_jobs')
      .update({
        status: 'failed',
        errors: [{ item: 'General', error: error instanceof Error ? error.message : 'Unknown error' }],
        completed_at: new Date().toISOString(),
      })
      .eq('id', importId);

    logger.error('[Import] Import failed', { importId, error });
  }
}

/**
 * Parse import source into posts
 */
async function parseImportSource(source: ImportSource): Promise<ParsedPost[]> {
  const dataString = typeof source.data === 'string' ? source.data : '';

  switch (source.type) {
    case 'medium':
      return parseMediumExport(dataString);
    case 'wordpress':
      return parseWordPressExport(dataString);
    case 'substack':
      return parseSubstackExport(dataString);
    case 'ghost':
      return parseGhostExport(dataString);
    case 'markdown':
      return parseMarkdownFiles(dataString);
    case 'html':
      return [parseHTMLContent(dataString)];
    default:
      throw new Error(`Unsupported import source: ${source.type}`);
  }
}

/**
 * Parse Medium export (HTML files)
 */
function parseMediumExport(html: string): ParsedPost[] {
  const posts: ParsedPost[] = [];
  
  // Parse Medium's HTML format
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const articles = doc.querySelectorAll('article');
  
  articles.forEach((article) => {
    const title = article.querySelector('h1')?.textContent || 'Untitled';
    const content = article.innerHTML;
    const publishedTime = article.querySelector('time')?.getAttribute('datetime');
    
    posts.push({
      title,
      content: turndownService.turndown(content),
      published_at: publishedTime || undefined,
    });
  });

  return posts;
}

/**
 * Parse WordPress export (WXR XML)
 */
function parseWordPressExport(xml: string): ParsedPost[] {
  const posts: ParsedPost[] = [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  
  const items = doc.querySelectorAll('item');
  
  items.forEach((item) => {
    const postType = item.querySelector('wp\\:post_type')?.textContent;
    if (postType !== 'post') return;
    
    const title = item.querySelector('title')?.textContent || 'Untitled';
    const content = item.querySelector('content\\:encoded')?.textContent || '';
    const excerpt = item.querySelector('excerpt\\:encoded')?.textContent || '';
    const slug = item.querySelector('wp\\:post_name')?.textContent;
    const pubDate = item.querySelector('pubDate')?.textContent;
    
    const tags: string[] = [];
    item.querySelectorAll('category[domain="post_tag"]').forEach((tag) => {
      tags.push(tag.textContent || '');
    });

    posts.push({
      title,
      content: turndownService.turndown(content),
      excerpt: excerpt ? turndownService.turndown(excerpt) : undefined,
      slug: slug || undefined,
      published_at: pubDate ? new Date(pubDate).toISOString() : undefined,
      tags,
    });
  });

  return posts;
}

/**
 * Parse Substack export (usually HTML or JSON)
 */
function parseSubstackExport(data: string): ParsedPost[] {
  // Try parsing as JSON first
  try {
    const jsonData = JSON.parse(data);
    if (Array.isArray(jsonData)) {
      return jsonData.map((item) => ({
        title: item.title || 'Untitled',
        content: turndownService.turndown(item.body_html || item.content || ''),
        excerpt: item.subtitle || item.description,
        slug: item.slug,
        published_at: item.post_date || item.published_at,
        canonical_url: item.canonical_url,
      }));
    }
  } catch {
    // Not JSON, try HTML
  }

  // Parse as HTML
  return [parseHTMLContent(data)];
}

/**
 * Parse Ghost export (JSON)
 */
function parseGhostExport(json: string): ParsedPost[] {
  const data = JSON.parse(json);
  const posts: ParsedPost[] = [];

  const ghostPosts = data.db?.[0]?.data?.posts || data.posts || [];

  ghostPosts.forEach((post: Record<string, unknown>) => {
    posts.push({
      title: (post.title as string) || 'Untitled',
      content: turndownService.turndown((post.html as string) || (post.mobiledoc as string) || ''),
      excerpt: (post.custom_excerpt as string) || (post.meta_description as string),
      slug: post.slug as string,
      published_at: (post.published_at as string) || undefined,
      featured_image_url: post.feature_image as string,
    });
  });

  return posts;
}

/**
 * Parse Markdown files
 */
function parseMarkdownFiles(markdown: string): ParsedPost[] {
  // Extract front matter if present
  const frontMatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (frontMatterMatch) {
    const frontMatter = frontMatterMatch[1];
    const content = frontMatterMatch[2];
    
    // Parse YAML front matter
    const metadata: Record<string, string> = {};
    frontMatter.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        metadata[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
      }
    });

    return [{
      title: metadata.title || 'Untitled',
      content,
      excerpt: metadata.description || metadata.excerpt,
      slug: metadata.slug,
      published_at: metadata.date || metadata.published,
      tags: metadata.tags?.split(',').map((t) => t.trim()),
    }];
  }

  // No front matter - try to extract title from first heading
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] || 'Untitled';
  const content = titleMatch ? markdown.replace(/^#\s+.+\n/, '') : markdown;

  return [{ title, content }];
}

/**
 * Parse HTML content
 */
function parseHTMLContent(html: string): ParsedPost {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const title = doc.querySelector('h1')?.textContent || 
                doc.querySelector('title')?.textContent || 
                'Untitled';
  
  const content = doc.body?.innerHTML || html;

  return {
    title,
    content: turndownService.turndown(content),
  };
}

/**
 * Import a single post
 */
async function importPost(
  userId: string,
  post: ParsedPost,
  options?: ImportOptions
): Promise<void> {
  const supabase = await createServiceClient();

  const slug = post.slug || generateSlug(post.title);

  const { error } = await supabase
    .from('posts')
    .insert({
      title: post.title,
      slug,
      content: post.content,
      excerpt: post.excerpt || post.content.substring(0, 200),
      author_id: userId,
      status: options?.defaultStatus || 'draft',
      published_at: options?.preserveDates && post.published_at ? post.published_at : null,
      canonical_url: post.canonical_url || null,
      featured_image_url: options?.preserveImages ? post.featured_image_url : null,
      category_id: options?.defaultCategory || null,
    });

  if (error) throw error;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Start an export job
 */
export async function startExport(
  userId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const supabase = await createClient();

  const { data: exportRecord, error } = await supabase
    .from('export_jobs')
    .insert({
      user_id: userId,
      format: options.format,
      status: 'pending',
      total_posts: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('[Export] Failed to create export job', error);
    throw error;
  }

  logger.info('[Export] Export job created', { exportId: exportRecord.id, format: options.format });

  // Process export asynchronously
  processExport(exportRecord.id, userId, options).catch((err) => {
    logger.error('[Export] Background export failed', { exportId: exportRecord.id, error: err });
  });

  return exportRecord as ExportResult;
}

/**
 * Process an export job
 */
async function processExport(
  exportId: string,
  userId: string,
  options: ExportOptions
): Promise<void> {
  const supabase = await createServiceClient();

  await supabase
    .from('export_jobs')
    .update({ status: 'processing' })
    .eq('id', exportId);

  try {
    // Fetch posts
    let query = supabase
      .from('posts')
      .select('*')
      .eq('author_id', userId)
      .order('published_at', { ascending: false });

    if (!options.includeDrafts) {
      query = query.eq('status', 'published');
    }

    if (options.postIds?.length) {
      query = query.in('id', options.postIds);
    }

    if (options.dateRange?.from) {
      query = query.gte('published_at', options.dateRange.from.toISOString());
    }

    if (options.dateRange?.to) {
      query = query.lte('published_at', options.dateRange.to.toISOString());
    }

    const { data: posts, error } = await query;

    if (error) throw error;

    await supabase
      .from('export_jobs')
      .update({ total_posts: posts?.length || 0 })
      .eq('id', exportId);

    // Generate export file
    const exportContent = generateExport(posts || [], options);

    // Upload to storage
    const fileName = `exports/${userId}/${exportId}.${getExportExtension(options.format)}`;
    const { error: uploadError } = await supabase.storage
      .from('private')
      .upload(fileName, exportContent, {
        contentType: getExportMimeType(options.format),
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Generate signed URL
    const { data: signedUrl } = await supabase.storage
      .from('private')
      .createSignedUrl(fileName, 7 * 24 * 60 * 60);

    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        download_url: signedUrl?.signedUrl,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportId);

    logger.info('[Export] Export completed', { exportId, postsExported: posts?.length });
  } catch (error) {
    await supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportId);

    logger.error('[Export] Export failed', { exportId, error });
  }
}

/**
 * Generate export content
 */
function generateExport(posts: Record<string, unknown>[], options: ExportOptions): string {
  switch (options.format) {
    case 'json':
      return JSON.stringify(posts, null, 2);

    case 'markdown':
      return posts.map((post) => {
        const frontMatter = options.includeMetadata ? `---
title: "${post.title}"
slug: "${post.slug}"
date: "${post.published_at || post.created_at}"
excerpt: "${post.excerpt || ''}"
---

` : '';
        return `${frontMatter}# ${post.title}\n\n${post.content}`;
      }).join('\n\n---\n\n');

    case 'html':
      return posts.map((post) => `
<!DOCTYPE html>
<html>
<head>
  <title>${post.title}</title>
  <meta charset="utf-8">
</head>
<body>
  <article>
    <h1>${post.title}</h1>
    <time datetime="${post.published_at}">${post.published_at}</time>
    <div>${post.content}</div>
  </article>
</body>
</html>
      `).join('\n');

    case 'wordpress':
      return generateWordPressXML(posts);

    case 'jekyll':
      return posts.map((post) => `---
layout: post
title: "${post.title}"
date: ${post.published_at || post.created_at}
---

${post.content}
      `).join('\n');

    case 'hugo':
      return posts.map((post) => `+++
title = "${post.title}"
date = "${post.published_at || post.created_at}"
draft = ${post.status !== 'published'}
+++

${post.content}
      `).join('\n');

    default:
      return JSON.stringify(posts, null, 2);
  }
}

function generateWordPressXML(posts: Record<string, unknown>[]): string {
  const items = posts.map((post) => `
    <item>
      <title>${escapeXML(post.title as string)}</title>
      <link>${post.canonical_url || ''}</link>
      <pubDate>${post.published_at || ''}</pubDate>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <excerpt:encoded><![CDATA[${post.excerpt || ''}]]></excerpt:encoded>
      <wp:post_name>${post.slug}</wp:post_name>
      <wp:post_type>post</wp:post_type>
      <wp:status>${post.status === 'published' ? 'publish' : 'draft'}</wp:status>
    </item>
  `).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wp="http://wordpress.org/export/1.2/">
  <channel>
    <title>Exported Posts</title>
    <generator>Scroungers Multimedia Export</generator>
    ${items}
  </channel>
</rss>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getExportExtension(format: ExportFormat): string {
  switch (format) {
    case 'json': return 'json';
    case 'markdown': return 'md';
    case 'html': return 'html';
    case 'wordpress': return 'xml';
    case 'jekyll': return 'md';
    case 'hugo': return 'md';
    default: return 'txt';
  }
}

function getExportMimeType(format: ExportFormat): string {
  switch (format) {
    case 'json': return 'application/json';
    case 'markdown': return 'text/markdown';
    case 'html': return 'text/html';
    case 'wordpress': return 'application/xml';
    case 'jekyll': return 'text/markdown';
    case 'hugo': return 'text/markdown';
    default: return 'text/plain';
  }
}

/**
 * Get import job status
 */
export async function getImportStatus(importId: string): Promise<ImportResult | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('id', importId)
    .single();

  return data as ImportResult | null;
}

/**
 * Get export job status
 */
export async function getExportStatus(exportId: string): Promise<ExportResult | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', exportId)
    .single();

  return data as ExportResult | null;
}

export default {
  startImport,
  getImportStatus,
  startExport,
  getExportStatus,
};
