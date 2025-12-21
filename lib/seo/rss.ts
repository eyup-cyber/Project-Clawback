/**
 * RSS Feed Generation System
 * Phase 46: Generate RSS, Atom, and JSON feeds for various content types
 */

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface FeedConfig {
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  siteLanguage: string;
  copyright: string;
  author: {
    name: string;
    email: string;
    uri?: string;
  };
  image?: {
    url: string;
    title: string;
    link: string;
    width?: number;
    height?: number;
  };
  ttl?: number; // Time to live in minutes
  itemsPerFeed?: number;
}

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  author?: {
    name: string;
    email?: string;
    uri?: string;
  };
  pubDate: Date;
  updated?: Date;
  categories?: string[];
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
  image?: string;
  guid?: string;
}

export type FeedFormat = 'rss' | 'atom' | 'json';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: FeedConfig = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://scroungersmultimedia.com',
  siteName: 'Scroungers Multimedia',
  siteDescription: 'Your source for multimedia content, reviews, and more',
  siteLanguage: 'en-US',
  copyright: `© ${new Date().getFullYear()} Scroungers Multimedia. All rights reserved.`,
  author: {
    name: 'Scroungers Multimedia',
    email: 'contact@scroungersmultimedia.com',
  },
  ttl: 60,
  itemsPerFeed: 20,
};

// ============================================================================
// RSS 2.0 GENERATION
// ============================================================================

/**
 * Generate RSS 2.0 feed
 */
export function generateRSS(
  items: FeedItem[],
  config: Partial<FeedConfig> = {},
  options: {
    feedPath?: string;
    title?: string;
    description?: string;
  } = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const feedTitle = options.title || cfg.siteName;
  const feedDescription = options.description || cfg.siteDescription;
  const feedUrl = `${cfg.siteUrl}${options.feedPath || '/feed.xml'}`;

  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const formatDate = (date: Date): string => {
    return date.toUTCString();
  };

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${cfg.siteUrl}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>${cfg.siteLanguage}</language>
    <copyright>${escapeXml(cfg.copyright)}</copyright>
    <lastBuildDate>${formatDate(new Date())}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <ttl>${cfg.ttl}</ttl>
    <generator>Scroungers Multimedia RSS Generator</generator>`;

  // Add channel image if provided
  if (cfg.image) {
    rss += `
    <image>
      <url>${escapeXml(cfg.image.url)}</url>
      <title>${escapeXml(cfg.image.title)}</title>
      <link>${escapeXml(cfg.image.link)}</link>
      ${cfg.image.width ? `<width>${cfg.image.width}</width>` : ''}
      ${cfg.image.height ? `<height>${cfg.image.height}</height>` : ''}
    </image>`;
  }

  // Add items
  for (const item of items) {
    const itemUrl = item.link.startsWith('http') ? item.link : `${cfg.siteUrl}${item.link}`;
    const guid = item.guid || itemUrl;

    rss += `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="${!item.guid}">${guid}</guid>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${formatDate(item.pubDate)}</pubDate>`;

    // Add full content if available
    if (item.content) {
      rss += `
      <content:encoded><![CDATA[${item.content}]]></content:encoded>`;
    }

    // Add author
    if (item.author) {
      rss += `
      <dc:creator>${escapeXml(item.author.name)}</dc:creator>`;
      if (item.author.email) {
        rss += `
      <author>${escapeXml(item.author.email)} (${escapeXml(item.author.name)})</author>`;
      }
    }

    // Add categories
    if (item.categories) {
      for (const category of item.categories) {
        rss += `
      <category>${escapeXml(category)}</category>`;
      }
    }

    // Add enclosure (media)
    if (item.enclosure) {
      rss += `
      <enclosure url="${escapeXml(item.enclosure.url)}" type="${item.enclosure.type}"${item.enclosure.length ? ` length="${item.enclosure.length}"` : ''}/>`;
    }

    // Add media thumbnail
    if (item.image) {
      rss += `
      <media:thumbnail url="${escapeXml(item.image)}"/>`;
    }

    rss += `
    </item>`;
  }

  rss += `
  </channel>
</rss>`;

  return rss;
}

// ============================================================================
// ATOM FEED GENERATION
// ============================================================================

/**
 * Generate Atom feed
 */
export function generateAtom(
  items: FeedItem[],
  config: Partial<FeedConfig> = {},
  options: {
    feedPath?: string;
    title?: string;
    description?: string;
  } = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const feedTitle = options.title || cfg.siteName;
  const feedDescription = options.description || cfg.siteDescription;
  const feedUrl = `${cfg.siteUrl}${options.feedPath || '/feed.atom'}`;

  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const formatDate = (date: Date): string => {
    return date.toISOString();
  };

  let atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feedTitle)}</title>
  <subtitle>${escapeXml(feedDescription)}</subtitle>
  <link href="${cfg.siteUrl}" rel="alternate"/>
  <link href="${feedUrl}" rel="self" type="application/atom+xml"/>
  <id>${cfg.siteUrl}/</id>
  <updated>${formatDate(new Date())}</updated>
  <rights>${escapeXml(cfg.copyright)}</rights>
  <generator uri="https://scroungersmultimedia.com" version="1.0">Scroungers Multimedia</generator>
  <author>
    <name>${escapeXml(cfg.author.name)}</name>
    ${cfg.author.email ? `<email>${escapeXml(cfg.author.email)}</email>` : ''}
    ${cfg.author.uri ? `<uri>${escapeXml(cfg.author.uri)}</uri>` : ''}
  </author>`;

  // Add logo if provided
  if (cfg.image) {
    atom += `
  <logo>${escapeXml(cfg.image.url)}</logo>`;
  }

  // Add entries
  for (const item of items) {
    const itemUrl = item.link.startsWith('http') ? item.link : `${cfg.siteUrl}${item.link}`;
    const entryId = item.guid || itemUrl;

    atom += `
  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${itemUrl}" rel="alternate"/>
    <id>${entryId}</id>
    <published>${formatDate(item.pubDate)}</published>
    <updated>${formatDate(item.updated || item.pubDate)}</updated>
    <summary type="html"><![CDATA[${item.description}]]></summary>`;

    // Add full content if available
    if (item.content) {
      atom += `
    <content type="html"><![CDATA[${item.content}]]></content>`;
    }

    // Add author
    if (item.author) {
      atom += `
    <author>
      <name>${escapeXml(item.author.name)}</name>
      ${item.author.email ? `<email>${escapeXml(item.author.email)}</email>` : ''}
      ${item.author.uri ? `<uri>${escapeXml(item.author.uri)}</uri>` : ''}
    </author>`;
    }

    // Add categories
    if (item.categories) {
      for (const category of item.categories) {
        atom += `
    <category term="${escapeXml(category)}"/>`;
      }
    }

    // Add media
    if (item.enclosure) {
      atom += `
    <link rel="enclosure" href="${escapeXml(item.enclosure.url)}" type="${item.enclosure.type}"${item.enclosure.length ? ` length="${item.enclosure.length}"` : ''}/>`;
    }

    atom += `
  </entry>`;
  }

  atom += `
</feed>`;

  return atom;
}

// ============================================================================
// JSON FEED GENERATION
// ============================================================================

/**
 * Generate JSON Feed (version 1.1)
 */
export function generateJSONFeed(
  items: FeedItem[],
  config: Partial<FeedConfig> = {},
  options: {
    feedPath?: string;
    title?: string;
    description?: string;
  } = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const feedTitle = options.title || cfg.siteName;
  const feedDescription = options.description || cfg.siteDescription;
  const feedUrl = `${cfg.siteUrl}${options.feedPath || '/feed.json'}`;

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: feedTitle,
    description: feedDescription,
    home_page_url: cfg.siteUrl,
    feed_url: feedUrl,
    language: cfg.siteLanguage,
    icon: cfg.image?.url,
    authors: [
      {
        name: cfg.author.name,
        url: cfg.author.uri,
      },
    ],
    items: items.map((item) => {
      const itemUrl = item.link.startsWith('http') ? item.link : `${cfg.siteUrl}${item.link}`;

      const jsonItem: Record<string, unknown> = {
        id: item.guid || itemUrl,
        url: itemUrl,
        title: item.title,
        summary: item.description,
        date_published: item.pubDate.toISOString(),
      };

      if (item.updated) {
        jsonItem.date_modified = item.updated.toISOString();
      }

      if (item.content) {
        jsonItem.content_html = item.content;
      }

      if (item.author) {
        jsonItem.authors = [
          {
            name: item.author.name,
            url: item.author.uri,
          },
        ];
      }

      if (item.categories && item.categories.length > 0) {
        jsonItem.tags = item.categories;
      }

      if (item.image) {
        jsonItem.image = item.image;
      }

      if (item.enclosure) {
        jsonItem.attachments = [
          {
            url: item.enclosure.url,
            mime_type: item.enclosure.type,
            size_in_bytes: item.enclosure.length,
          },
        ];
      }

      return jsonItem;
    }),
  };

  return JSON.stringify(feed, null, 2);
}

// ============================================================================
// FEED DATA FETCHING
// ============================================================================

/**
 * Get feed items from posts
 */
export async function getPostFeedItems(options: {
  limit?: number;
  categorySlug?: string;
  authorId?: string;
  tagSlug?: string;
}): Promise<FeedItem[]> {
  const supabase = await createServiceClient();
  const { limit = 20, categorySlug, authorId, tagSlug } = options;

  let query = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      content,
      published_at,
      updated_at,
      featured_image_url,
      author:profiles!posts_author_id_fkey (
        id,
        username,
        display_name,
        email
      ),
      category:categories (
        id,
        name,
        slug
      ),
      tags
    `
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  // Filter by category
  if (categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (category) {
      query = query.eq('category_id', category.id);
    }
  }

  // Filter by author
  if (authorId) {
    query = query.eq('author_id', authorId);
  }

  // Filter by tag
  if (tagSlug) {
    query = query.contains('tags', [tagSlug]);
  }

  const { data: posts, error } = await query;

  if (error) {
    logger.error('[RSS] Failed to fetch posts for feed', error);
    throw error;
  }

  return (posts || []).map((post) => {
    const author = post.author as { display_name: string; username: string; email?: string } | null;
    const category = post.category as { name: string } | null;

    const feedItem: FeedItem = {
      id: post.id,
      title: post.title,
      link: `/posts/${post.slug}`,
      description: post.excerpt || '',
      content: post.content,
      pubDate: new Date(post.published_at),
      updated: post.updated_at ? new Date(post.updated_at) : undefined,
      categories: [
        ...(category ? [category.name] : []),
        ...(post.tags || []),
      ],
      image: post.featured_image_url || undefined,
    };

    if (author) {
      feedItem.author = {
        name: author.display_name || author.username,
        email: author.email,
        uri: `/@${author.username}`,
      };
    }

    return feedItem;
  });
}

/**
 * Get category list for feed discovery
 */
export async function getCategoryFeeds(): Promise<
  { name: string; slug: string; feedUrl: string; postCount: number }[]
> {
  const supabase = await createServiceClient();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('name, slug, post_count')
    .gt('post_count', 0)
    .order('post_count', { ascending: false });

  if (error) {
    logger.error('[RSS] Failed to fetch categories for feeds', error);
    throw error;
  }

  return (categories || []).map((cat) => ({
    name: cat.name,
    slug: cat.slug,
    feedUrl: `/categories/${cat.slug}/feed.xml`,
    postCount: cat.post_count,
  }));
}

/**
 * Get author list for feed discovery
 */
export async function getAuthorFeeds(): Promise<
  { name: string; username: string; feedUrl: string; postCount: number }[]
> {
  const supabase = await createServiceClient();

  const { data: authors, error } = await supabase
    .from('profiles')
    .select('username, display_name, post_count')
    .gt('post_count', 0)
    .order('post_count', { ascending: false })
    .limit(50);

  if (error) {
    logger.error('[RSS] Failed to fetch authors for feeds', error);
    throw error;
  }

  return (authors || []).map((author) => ({
    name: author.display_name || author.username,
    username: author.username,
    feedUrl: `/@${author.username}/feed.xml`,
    postCount: author.post_count,
  }));
}

/**
 * Get tag list for feed discovery
 */
export async function getTagFeeds(): Promise<
  { name: string; slug: string; feedUrl: string; postCount: number }[]
> {
  const supabase = await createServiceClient();

  const { data: tags, error } = await supabase
    .from('tags')
    .select('name, slug, post_count')
    .gt('post_count', 0)
    .order('post_count', { ascending: false })
    .limit(50);

  if (error) {
    logger.error('[RSS] Failed to fetch tags for feeds', error);
    throw error;
  }

  return (tags || []).map((tag) => ({
    name: tag.name,
    slug: tag.slug,
    feedUrl: `/tags/${tag.slug}/feed.xml`,
    postCount: tag.post_count,
  }));
}

// ============================================================================
// FEED GENERATION HELPERS
// ============================================================================

/**
 * Generate main site feed
 */
export async function generateMainFeed(
  format: FeedFormat = 'rss',
  config?: Partial<FeedConfig>
): Promise<string> {
  const items = await getPostFeedItems({ limit: config?.itemsPerFeed || 20 });

  switch (format) {
    case 'atom':
      return generateAtom(items, config, { feedPath: '/feed.atom' });
    case 'json':
      return generateJSONFeed(items, config, { feedPath: '/feed.json' });
    default:
      return generateRSS(items, config, { feedPath: '/feed.xml' });
  }
}

/**
 * Generate category feed
 */
export async function generateCategoryFeed(
  categorySlug: string,
  format: FeedFormat = 'rss',
  config?: Partial<FeedConfig>
): Promise<string> {
  const supabase = await createServiceClient();

  // Get category info
  const { data: category } = await supabase
    .from('categories')
    .select('name, description')
    .eq('slug', categorySlug)
    .single();

  if (!category) {
    throw new Error(`Category not found: ${categorySlug}`);
  }

  const items = await getPostFeedItems({
    limit: config?.itemsPerFeed || 20,
    categorySlug,
  });

  const feedOptions = {
    feedPath: `/categories/${categorySlug}/feed.${format === 'json' ? 'json' : format === 'atom' ? 'atom' : 'xml'}`,
    title: `${category.name} - ${config?.siteName || DEFAULT_CONFIG.siteName}`,
    description: category.description || `Latest posts in ${category.name}`,
  };

  switch (format) {
    case 'atom':
      return generateAtom(items, config, feedOptions);
    case 'json':
      return generateJSONFeed(items, config, feedOptions);
    default:
      return generateRSS(items, config, feedOptions);
  }
}

/**
 * Generate author feed
 */
export async function generateAuthorFeed(
  authorUsername: string,
  format: FeedFormat = 'rss',
  config?: Partial<FeedConfig>
): Promise<string> {
  const supabase = await createServiceClient();

  // Get author info
  const { data: author } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio')
    .eq('username', authorUsername)
    .single();

  if (!author) {
    throw new Error(`Author not found: ${authorUsername}`);
  }

  const items = await getPostFeedItems({
    limit: config?.itemsPerFeed || 20,
    authorId: author.id,
  });

  const feedOptions = {
    feedPath: `/@${authorUsername}/feed.${format === 'json' ? 'json' : format === 'atom' ? 'atom' : 'xml'}`,
    title: `${author.display_name || author.username} - ${config?.siteName || DEFAULT_CONFIG.siteName}`,
    description: author.bio || `Latest posts by ${author.display_name || author.username}`,
  };

  switch (format) {
    case 'atom':
      return generateAtom(items, config, feedOptions);
    case 'json':
      return generateJSONFeed(items, config, feedOptions);
    default:
      return generateRSS(items, config, feedOptions);
  }
}

/**
 * Generate tag feed
 */
export async function generateTagFeed(
  tagSlug: string,
  format: FeedFormat = 'rss',
  config?: Partial<FeedConfig>
): Promise<string> {
  const supabase = await createServiceClient();

  // Get tag info
  const { data: tag } = await supabase
    .from('tags')
    .select('name, description')
    .eq('slug', tagSlug)
    .single();

  if (!tag) {
    throw new Error(`Tag not found: ${tagSlug}`);
  }

  const items = await getPostFeedItems({
    limit: config?.itemsPerFeed || 20,
    tagSlug,
  });

  const feedOptions = {
    feedPath: `/tags/${tagSlug}/feed.${format === 'json' ? 'json' : format === 'atom' ? 'atom' : 'xml'}`,
    title: `#${tag.name} - ${config?.siteName || DEFAULT_CONFIG.siteName}`,
    description: tag.description || `Latest posts tagged with #${tag.name}`,
  };

  switch (format) {
    case 'atom':
      return generateAtom(items, config, feedOptions);
    case 'json':
      return generateJSONFeed(items, config, feedOptions);
    default:
      return generateRSS(items, config, feedOptions);
  }
}
