/**
 * Static Page Builder System
 * Phase 51: Page creation, management, and rendering
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: PageContent;
  excerpt: string | null;
  featured_image_url: string | null;
  status: PageStatus;
  visibility: PageVisibility;
  template: PageTemplate;
  seo: PageSEO;
  author_id: string;
  parent_id: string | null;
  menu_order: number;
  show_in_navigation: boolean;
  custom_css: string | null;
  custom_js: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PageStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type PageVisibility = 'public' | 'private' | 'password_protected';
export type PageTemplate =
  | 'default'
  | 'full_width'
  | 'sidebar_left'
  | 'sidebar_right'
  | 'landing'
  | 'blank';

export interface PageContent {
  type: 'blocks' | 'html' | 'markdown';
  blocks?: PageBlock[];
  html?: string;
  markdown?: string;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  data: BlockData;
  settings: BlockSettings;
}

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'gallery'
  | 'video'
  | 'embed'
  | 'button'
  | 'columns'
  | 'spacer'
  | 'divider'
  | 'quote'
  | 'list'
  | 'code'
  | 'table'
  | 'accordion'
  | 'tabs'
  | 'cta'
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'pricing'
  | 'team'
  | 'contact_form'
  | 'newsletter'
  | 'html'
  | 'custom';

export interface BlockData {
  // Heading
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text?: string;

  // Paragraph/Quote
  content?: string;
  citation?: string;

  // Image
  src?: string;
  alt?: string;
  caption?: string;
  link?: string;

  // Gallery
  images?: { src: string; alt: string; caption?: string }[];
  layout?: 'grid' | 'masonry' | 'carousel';
  columns?: number;

  // Video/Embed
  url?: string;
  provider?: string;
  autoplay?: boolean;

  // Button
  label?: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';

  // Columns
  children?: PageBlock[][];
  columnCount?: number;
  gap?: string;

  // Spacer
  height?: string;

  // List
  items?: string[];
  listType?: 'bullet' | 'number' | 'check';

  // Code
  language?: string;

  // Table
  rows?: string[][];
  hasHeader?: boolean;

  // Accordion/Tabs
  sections?: { title: string; content: string }[];

  // CTA/Hero
  title?: string;
  subtitle?: string;
  description?: string;
  backgroundImage?: string;
  buttons?: { label: string; href: string; variant: string }[];

  // Features
  features?: { icon: string; title: string; description: string }[];

  // Testimonials
  testimonials?: {
    quote: string;
    author: string;
    role?: string;
    avatar?: string;
  }[];

  // Pricing
  plans?: {
    name: string;
    price: string;
    period?: string;
    features: string[];
    cta: string;
    ctaLink: string;
    highlighted?: boolean;
  }[];

  // Team
  members?: {
    name: string;
    role: string;
    bio?: string;
    avatar?: string;
    social?: { platform: string; url: string }[];
  }[];

  // Contact Form
  formFields?: {
    name: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }[];
  submitLabel?: string;
  successMessage?: string;

  // Newsletter
  placeholder?: string;
  buttonText?: string;

  // HTML/Custom
  html?: string;
}

export interface BlockSettings {
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  animation?: string;
  className?: string;
  id?: string;
}

export interface PageSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  noindex?: boolean;
  nofollow?: boolean;
  schema?: Record<string, unknown>;
}

export interface PageWithChildren extends Page {
  children: PageWithChildren[];
}

export interface PageQuery {
  status?: PageStatus | PageStatus[];
  visibility?: PageVisibility;
  template?: PageTemplate;
  parent_id?: string | null;
  search?: string;
  include_children?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// PAGE OPERATIONS
// ============================================================================

/**
 * Create a new page
 */
export async function createPage(
  input: Pick<Page, 'title' | 'slug' | 'content'> &
    Partial<Omit<Page, 'id' | 'author_id' | 'created_at' | 'updated_at'>>
): Promise<Page> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('pages')
    .select('id')
    .eq('slug', input.slug)
    .single();

  if (existing) {
    throw new Error('A page with this slug already exists');
  }

  const pageData = {
    title: input.title,
    slug: input.slug,
    content: input.content,
    excerpt: input.excerpt || null,
    featured_image_url: input.featured_image_url || null,
    status: input.status || 'draft',
    visibility: input.visibility || 'public',
    template: input.template || 'default',
    seo: input.seo || {},
    author_id: user.id,
    parent_id: input.parent_id || null,
    menu_order: input.menu_order || 0,
    show_in_navigation: input.show_in_navigation ?? false,
    custom_css: input.custom_css || null,
    custom_js: input.custom_js || null,
    published_at: input.status === 'published' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase.from('pages').insert(pageData).select().single();

  if (error) {
    logger.error('[Pages] Failed to create page', error);
    throw error;
  }

  logger.info('[Pages] Page created', { page_id: data.id, slug: input.slug });
  return data as Page;
}

/**
 * Update a page
 */
export async function updatePage(
  pageId: string,
  updates: Partial<Omit<Page, 'id' | 'author_id' | 'created_at' | 'updated_at'>>
): Promise<Page> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check slug uniqueness if changing
  if (updates.slug) {
    const { data: existing } = await supabase
      .from('pages')
      .select('id')
      .eq('slug', updates.slug)
      .neq('id', pageId)
      .single();

    if (existing) {
      throw new Error('A page with this slug already exists');
    }
  }

  // Handle publishing
  if (updates.status === 'published') {
    const { data: current } = await supabase
      .from('pages')
      .select('published_at')
      .eq('id', pageId)
      .single();

    if (!current?.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('pages')
    .update(updates)
    .eq('id', pageId)
    .select()
    .single();

  if (error) {
    logger.error('[Pages] Failed to update page', error);
    throw error;
  }

  logger.info('[Pages] Page updated', { page_id: pageId });
  return data as Page;
}

/**
 * Delete a page
 */
export async function deletePage(pageId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check for child pages
  const { count } = await supabase
    .from('pages')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', pageId);

  if (count && count > 0) {
    throw new Error('Cannot delete page with child pages. Delete or move children first.');
  }

  const { error } = await supabase.from('pages').delete().eq('id', pageId);

  if (error) {
    logger.error('[Pages] Failed to delete page', error);
    throw error;
  }

  logger.info('[Pages] Page deleted', { page_id: pageId });
}

/**
 * Get a page by ID or slug
 */
export async function getPage(idOrSlug: string): Promise<Page | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('[Pages] Failed to get page', error);
    throw error;
  }

  return data as Page;
}

/**
 * Get published page by slug (for public access)
 */
export async function getPublishedPage(slug: string): Promise<Page | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('[Pages] Failed to get published page', error);
    throw error;
  }

  return data as Page;
}

/**
 * Query pages
 */
export async function queryPages(query: PageQuery = {}): Promise<{ pages: Page[]; total: number }> {
  const supabase = await createClient();

  const { status, visibility, template, parent_id, search, limit = 50, offset = 0 } = query;

  let queryBuilder = supabase.from('pages').select('*', { count: 'exact' });

  // Status filter
  if (status) {
    if (Array.isArray(status)) {
      queryBuilder = queryBuilder.in('status', status);
    } else {
      queryBuilder = queryBuilder.eq('status', status);
    }
  }

  // Visibility filter
  if (visibility) {
    queryBuilder = queryBuilder.eq('visibility', visibility);
  }

  // Template filter
  if (template) {
    queryBuilder = queryBuilder.eq('template', template);
  }

  // Parent filter
  if (parent_id !== undefined) {
    if (parent_id === null) {
      queryBuilder = queryBuilder.is('parent_id', null);
    } else {
      queryBuilder = queryBuilder.eq('parent_id', parent_id);
    }
  }

  // Search filter
  if (search) {
    queryBuilder = queryBuilder.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  // Sorting and pagination
  queryBuilder = queryBuilder
    .order('menu_order', { ascending: true })
    .order('title', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await queryBuilder;

  if (error) {
    logger.error('[Pages] Failed to query pages', error);
    throw error;
  }

  return {
    pages: (data || []) as Page[],
    total: count || 0,
  };
}

/**
 * Get page tree (hierarchical)
 */
export async function getPageTree(): Promise<PageWithChildren[]> {
  const supabase = await createClient();

  const { data: pages, error } = await supabase
    .from('pages')
    .select('*')
    .order('menu_order')
    .order('title');

  if (error) {
    logger.error('[Pages] Failed to get page tree', error);
    throw error;
  }

  // Build tree
  const pageMap = new Map<string, PageWithChildren>();
  const roots: PageWithChildren[] = [];

  // First pass: create all nodes
  for (const page of pages || []) {
    pageMap.set(page.id, { ...page, children: [] } as PageWithChildren);
  }

  // Second pass: build tree
  for (const page of pages || []) {
    const node = pageMap.get(page.id)!;
    if (page.parent_id && pageMap.has(page.parent_id)) {
      pageMap.get(page.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Get navigation menu items
 */
export async function getNavigationPages(): Promise<Page[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('pages')
    .select('id, title, slug, parent_id, menu_order')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .eq('show_in_navigation', true)
    .order('menu_order')
    .order('title');

  if (error) {
    logger.error('[Pages] Failed to get navigation pages', error);
    throw error;
  }

  return (data || []) as Page[];
}

/**
 * Reorder pages
 */
export async function reorderPages(
  pageOrders: { id: string; menu_order: number; parent_id?: string | null }[]
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Update each page
  for (const { id, menu_order, parent_id } of pageOrders) {
    await supabase
      .from('pages')
      .update({ menu_order, parent_id: parent_id ?? null })
      .eq('id', id);
  }

  logger.info('[Pages] Pages reordered', { count: pageOrders.length });
}

/**
 * Duplicate a page
 */
export async function duplicatePage(pageId: string): Promise<Page> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get original page
  const original = await getPage(pageId);
  if (!original) {
    throw new Error('Page not found');
  }

  // Generate unique slug
  let newSlug = `${original.slug}-copy`;
  let counter = 1;

  while (true) {
    const { data: existing } = await supabase
      .from('pages')
      .select('id')
      .eq('slug', newSlug)
      .single();

    if (!existing) break;
    newSlug = `${original.slug}-copy-${counter++}`;
  }

  // Create duplicate
  return createPage({
    title: `${original.title} (Copy)`,
    slug: newSlug,
    content: original.content,
    excerpt: original.excerpt,
    featured_image_url: original.featured_image_url,
    template: original.template,
    seo: original.seo,
    parent_id: original.parent_id,
    show_in_navigation: false,
    custom_css: original.custom_css,
    custom_js: original.custom_js,
    status: 'draft',
  });
}

// ============================================================================
// BLOCK RENDERING
// ============================================================================

/**
 * Render blocks to HTML
 */
export function renderBlocks(blocks: PageBlock[]): string {
  return blocks.map((block) => renderBlock(block)).join('\n');
}

/**
 * Render a single block to HTML
 */
function renderBlock(block: PageBlock): string {
  const { type, data, settings } = block;
  const style = buildBlockStyle(settings);
  const className = settings.className || '';
  const id = settings.id ? `id="${settings.id}"` : '';

  switch (type) {
    case 'heading': {
      const level = data.level || 2;
      return `<h${level} ${id} class="${className}" style="${style}">${escapeHtml(data.text || '')}</h${level}>`;
    }

    case 'paragraph':
      return `<p ${id} class="${className}" style="${style}">${data.content || ''}</p>`;

    case 'image': {
      const imgCaption = data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : '';
      const imgContent = `<img src="${data.src || ''}" alt="${escapeHtml(data.alt || '')}" loading="lazy" />`;
      const imgLink = data.link ? `<a href="${data.link}">${imgContent}</a>` : imgContent;
      return `<figure ${id} class="${className}" style="${style}">${imgLink}${imgCaption}</figure>`;
    }

    case 'video':
      return `<div ${id} class="video-container ${className}" style="${style}">
        <iframe src="${data.url || ''}" frameborder="0" allowfullscreen ${data.autoplay ? 'autoplay' : ''}></iframe>
      </div>`;

    case 'button':
      return `<a ${id} href="${data.href || '#'}" class="btn btn-${data.variant || 'primary'} btn-${data.size || 'md'} ${className}" style="${style}">${escapeHtml(data.label || 'Button')}</a>`;

    case 'spacer':
      return `<div ${id} class="${className}" style="height: ${data.height || '2rem'}; ${style}"></div>`;

    case 'divider':
      return `<hr ${id} class="${className}" style="${style}" />`;

    case 'quote': {
      const citation = data.citation ? `<cite>${escapeHtml(data.citation)}</cite>` : '';
      return `<blockquote ${id} class="${className}" style="${style}">${data.content || ''}${citation}</blockquote>`;
    }

    case 'list': {
      const listTag = data.listType === 'number' ? 'ol' : 'ul';
      const listItems = (data.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
      return `<${listTag} ${id} class="${className}" style="${style}">${listItems}</${listTag}>`;
    }

    case 'code':
      return `<pre ${id} class="${className}" style="${style}"><code class="language-${data.language || 'text'}">${escapeHtml(data.content || '')}</code></pre>`;

    case 'columns': {
      const columnContent = (data.children || [])
        .map((col) => `<div class="column">${renderBlocks(col)}</div>`)
        .join('');
      return `<div ${id} class="columns columns-${data.columnCount || 2} ${className}" style="gap: ${data.gap || '1rem'}; ${style}">${columnContent}</div>`;
    }

    case 'accordion': {
      const accordionItems = (data.sections || [])
        .map(
          (section, i) => `
          <details class="accordion-item" ${i === 0 ? 'open' : ''}>
            <summary>${escapeHtml(section.title)}</summary>
            <div class="accordion-content">${section.content}</div>
          </details>
        `
        )
        .join('');
      return `<div ${id} class="accordion ${className}" style="${style}">${accordionItems}</div>`;
    }

    case 'hero': {
      const heroBg = data.backgroundImage
        ? `background-image: url('${data.backgroundImage}'); background-size: cover;`
        : '';
      const heroButtons = (data.buttons || [])
        .map(
          (btn) =>
            `<a href="${btn.href}" class="btn btn-${btn.variant || 'primary'}">${escapeHtml(btn.label)}</a>`
        )
        .join(' ');
      return `<section ${id} class="hero ${className}" style="${heroBg} ${style}">
        ${data.title ? `<h1>${escapeHtml(data.title)}</h1>` : ''}
        ${data.subtitle ? `<p class="subtitle">${escapeHtml(data.subtitle)}</p>` : ''}
        ${data.description ? `<p>${escapeHtml(data.description)}</p>` : ''}
        ${heroButtons ? `<div class="hero-buttons">${heroButtons}</div>` : ''}
      </section>`;
    }

    case 'cta': {
      const ctaButtons = (data.buttons || [])
        .map(
          (btn) =>
            `<a href="${btn.href}" class="btn btn-${btn.variant || 'primary'}">${escapeHtml(btn.label)}</a>`
        )
        .join(' ');
      return `<section ${id} class="cta ${className}" style="${style}">
        ${data.title ? `<h2>${escapeHtml(data.title)}</h2>` : ''}
        ${data.description ? `<p>${escapeHtml(data.description)}</p>` : ''}
        <div class="cta-buttons">${ctaButtons}</div>
      </section>`;
    }

    case 'html':
      return data.html || '';

    default:
      return `<!-- Unknown block type: ${type} -->`;
  }
}

/**
 * Build inline styles from settings
 */
function buildBlockStyle(settings: BlockSettings): string {
  const styles: string[] = [];

  if (settings.backgroundColor) {
    styles.push(`background-color: ${settings.backgroundColor}`);
  }
  if (settings.textColor) {
    styles.push(`color: ${settings.textColor}`);
  }
  if (settings.padding) {
    styles.push(`padding: ${settings.padding}`);
  }
  if (settings.margin) {
    styles.push(`margin: ${settings.margin}`);
  }
  if (settings.borderRadius) {
    styles.push(`border-radius: ${settings.borderRadius}`);
  }
  if (settings.alignment) {
    styles.push(`text-align: ${settings.alignment}`);
  }

  return styles.join('; ');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate page metadata for SEO
 */
export function generatePageMetadata(page: Page): {
  title: string;
  description: string;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
} {
  const seo = page.seo || {};

  return {
    title: seo.title || page.title,
    description: seo.description || page.excerpt || '',
    openGraph: {
      title: seo.og_title || seo.title || page.title,
      description: seo.og_description || seo.description || page.excerpt || '',
      image: seo.og_image || page.featured_image_url || '',
      url: seo.canonical_url || '',
    },
    twitter: {
      title: seo.twitter_title || seo.title || page.title,
      description: seo.twitter_description || seo.description || page.excerpt || '',
      image: seo.twitter_image || seo.og_image || page.featured_image_url || '',
    },
  };
}
