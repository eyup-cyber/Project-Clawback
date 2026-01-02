/**
 * Dynamic Sitemap Generation
 * Phase 40: Generate XML sitemaps for posts, categories, authors, and pages
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: ChangeFrequency;
  priority?: number;
  images?: SitemapImage[];
  videos?: SitemapVideo[];
  news?: SitemapNews;
  alternates?: SitemapAlternate[];
}

export type ChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface SitemapImage {
  loc: string;
  caption?: string;
  title?: string;
  geo_location?: string;
  license?: string;
}

export interface SitemapVideo {
  thumbnail_loc: string;
  title: string;
  description: string;
  content_loc?: string;
  player_loc?: string;
  duration?: number;
  publication_date?: string;
}

export interface SitemapNews {
  publication: {
    name: string;
    language: string;
  };
  publication_date: string;
  title: string;
  keywords?: string[];
  genres?: string[];
}

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface SitemapIndex {
  sitemaps: {
    loc: string;
    lastmod?: string;
  }[];
}

export interface SitemapConfig {
  baseUrl: string;
  defaultChangefreq: ChangeFrequency;
  defaultPriority: number;
  maxUrlsPerSitemap: number;
  includeImages: boolean;
  includeVideos: boolean;
  includeNews: boolean;
  includeAlternates: boolean;
  supportedLocales: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SitemapConfig = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://scroungersmultimedia.com',
  defaultChangefreq: 'weekly',
  defaultPriority: 0.5,
  maxUrlsPerSitemap: 50000,
  includeImages: true,
  includeVideos: false,
  includeNews: true,
  includeAlternates: true,
  supportedLocales: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
};

// ============================================================================
// XML GENERATION HELPERS
// ============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function generateUrlXml(url: SitemapUrl, config: SitemapConfig): string {
  let xml = '  <url>\n';
  xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;

  if (url.lastmod) {
    xml += `    <lastmod>${formatDate(url.lastmod)}</lastmod>\n`;
  }

  if (url.changefreq) {
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
  }

  if (url.priority !== undefined) {
    xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
  }

  // Image sitemap extension
  if (config.includeImages && url.images?.length) {
    url.images.forEach((image) => {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${escapeXml(image.loc)}</image:loc>\n`;
      if (image.caption) {
        xml += `      <image:caption>${escapeXml(image.caption)}</image:caption>\n`;
      }
      if (image.title) {
        xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
      }
      xml += '    </image:image>\n';
    });
  }

  // Video sitemap extension
  if (config.includeVideos && url.videos?.length) {
    url.videos.forEach((video) => {
      xml += '    <video:video>\n';
      xml += `      <video:thumbnail_loc>${escapeXml(video.thumbnail_loc)}</video:thumbnail_loc>\n`;
      xml += `      <video:title>${escapeXml(video.title)}</video:title>\n`;
      xml += `      <video:description>${escapeXml(video.description)}</video:description>\n`;
      if (video.content_loc) {
        xml += `      <video:content_loc>${escapeXml(video.content_loc)}</video:content_loc>\n`;
      }
      if (video.duration) {
        xml += `      <video:duration>${video.duration}</video:duration>\n`;
      }
      xml += '    </video:video>\n';
    });
  }

  // News sitemap extension
  if (config.includeNews && url.news) {
    xml += '    <news:news>\n';
    xml += '      <news:publication>\n';
    xml += `        <news:name>${escapeXml(url.news.publication.name)}</news:name>\n`;
    xml += `        <news:language>${url.news.publication.language}</news:language>\n`;
    xml += '      </news:publication>\n';
    xml += `      <news:publication_date>${url.news.publication_date}</news:publication_date>\n`;
    xml += `      <news:title>${escapeXml(url.news.title)}</news:title>\n`;
    if (url.news.keywords?.length) {
      xml += `      <news:keywords>${escapeXml(url.news.keywords.join(', '))}</news:keywords>\n`;
    }
    xml += '    </news:news>\n';
  }

  // Alternate language versions
  if (config.includeAlternates && url.alternates?.length) {
    url.alternates.forEach((alt) => {
      xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}" />\n`;
    });
  }

  xml += '  </url>\n';
  return xml;
}

function generateSitemapXml(urls: SitemapUrl[], config: SitemapConfig): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

  if (config.includeImages) {
    xml += '\n  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
  }
  if (config.includeVideos) {
    xml += '\n  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
  }
  if (config.includeNews) {
    xml += '\n  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"';
  }
  if (config.includeAlternates) {
    xml += '\n  xmlns:xhtml="http://www.w3.org/1999/xhtml"';
  }

  xml += '>\n';

  urls.forEach((url) => {
    xml += generateUrlXml(url, config);
  });

  xml += '</urlset>';
  return xml;
}

function generateSitemapIndexXml(sitemaps: SitemapIndex['sitemaps']): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  sitemaps.forEach((sitemap) => {
    xml += '  <sitemap>\n';
    xml += `    <loc>${escapeXml(sitemap.loc)}</loc>\n`;
    if (sitemap.lastmod) {
      xml += `    <lastmod>${formatDate(sitemap.lastmod)}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';
  });

  xml += '</sitemapindex>';
  return xml;
}

// ============================================================================
// SITEMAP GENERATORS
// ============================================================================

/**
 * Generate posts sitemap
 */
export async function generatePostsSitemap(
  page: number = 1,
  config: SitemapConfig = DEFAULT_CONFIG
): Promise<string> {
  const supabase = await createServiceClient();
  const offset = (page - 1) * config.maxUrlsPerSitemap;

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      'slug, updated_at, published_at, title, featured_image_url, featured_image_alt, category:categories(name)'
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + config.maxUrlsPerSitemap - 1);

  if (error) {
    logger.error('[Sitemap] Failed to fetch posts', error);
    throw error;
  }

  const urls: SitemapUrl[] = (posts || []).map((post) => {
    const url: SitemapUrl = {
      loc: `${config.baseUrl}/posts/${post.slug}`,
      lastmod: post.updated_at || post.published_at,
      changefreq: 'monthly',
      priority: 0.8,
    };

    // Add featured image
    if (config.includeImages && post.featured_image_url) {
      url.images = [
        {
          loc: post.featured_image_url,
          caption: post.featured_image_alt || post.title,
          title: post.title,
        },
      ];
    }

    // Add news metadata for recent posts (last 2 days)
    if (config.includeNews) {
      const publishedAt = new Date(post.published_at);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      if (publishedAt > twoDaysAgo) {
        url.news = {
          publication: {
            name: 'Scroungers Multimedia',
            language: 'en',
          },
          publication_date: post.published_at,
          title: post.title,
          keywords: [(post.category as { name?: string })?.name || 'general'].filter(Boolean),
        };
      }
    }

    // Add alternate language versions
    if (config.includeAlternates) {
      url.alternates = config.supportedLocales.map((locale) => ({
        hreflang: locale,
        href: `${config.baseUrl}/${locale}/posts/${post.slug}`,
      }));
      url.alternates.push({
        hreflang: 'x-default',
        href: url.loc,
      });
    }

    return url;
  });

  return generateSitemapXml(urls, config);
}

/**
 * Generate categories sitemap
 */
export async function generateCategoriesSitemap(
  config: SitemapConfig = DEFAULT_CONFIG
): Promise<string> {
  const supabase = await createServiceClient();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('slug, updated_at, image_url, name')
    .order('name', { ascending: true });

  if (error) {
    logger.error('[Sitemap] Failed to fetch categories', error);
    throw error;
  }

  const urls: SitemapUrl[] = (categories || []).map((category) => ({
    loc: `${config.baseUrl}/categories/${category.slug}`,
    lastmod: category.updated_at,
    changefreq: 'weekly' as ChangeFrequency,
    priority: 0.7,
    images: category.image_url
      ? [
          {
            loc: category.image_url,
            title: category.name,
          },
        ]
      : undefined,
  }));

  return generateSitemapXml(urls, config);
}

/**
 * Generate authors sitemap
 */
export async function generateAuthorsSitemap(
  config: SitemapConfig = DEFAULT_CONFIG
): Promise<string> {
  const supabase = await createServiceClient();

  const { data: authors, error } = await supabase
    .from('profiles')
    .select('username, updated_at, avatar_url, display_name')
    .gt('article_count', 0)
    .order('article_count', { ascending: false });

  if (error) {
    logger.error('[Sitemap] Failed to fetch authors', error);
    throw error;
  }

  const urls: SitemapUrl[] = (authors || []).map((author) => ({
    loc: `${config.baseUrl}/u/${author.username}`,
    lastmod: author.updated_at,
    changefreq: 'weekly' as ChangeFrequency,
    priority: 0.6,
    images: author.avatar_url
      ? [
          {
            loc: author.avatar_url,
            title: author.display_name || author.username,
          },
        ]
      : undefined,
  }));

  return generateSitemapXml(urls, config);
}

/**
 * Generate tags sitemap
 */
export async function generateTagsSitemap(config: SitemapConfig = DEFAULT_CONFIG): Promise<string> {
  const supabase = await createServiceClient();

  const { data: tags, error } = await supabase
    .from('tags')
    .select('slug, updated_at, name')
    .gt('post_count', 0)
    .order('post_count', { ascending: false })
    .limit(1000);

  if (error) {
    logger.error('[Sitemap] Failed to fetch tags', error);
    throw error;
  }

  const urls: SitemapUrl[] = (tags || []).map((tag) => ({
    loc: `${config.baseUrl}/tags/${tag.slug}`,
    lastmod: tag.updated_at,
    changefreq: 'weekly' as ChangeFrequency,
    priority: 0.5,
  }));

  return generateSitemapXml(urls, config);
}

/**
 * Generate static pages sitemap
 */
export async function generatePagesSitemap(
  config: SitemapConfig = DEFAULT_CONFIG
): Promise<string> {
  const staticPages: SitemapUrl[] = [
    { loc: `${config.baseUrl}`, changefreq: 'daily', priority: 1.0 },
    { loc: `${config.baseUrl}/about`, changefreq: 'monthly', priority: 0.7 },
    { loc: `${config.baseUrl}/contact`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${config.baseUrl}/privacy`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${config.baseUrl}/terms`, changefreq: 'yearly', priority: 0.3 },
    {
      loc: `${config.baseUrl}/categories`,
      changefreq: 'weekly',
      priority: 0.8,
    },
    { loc: `${config.baseUrl}/tags`, changefreq: 'weekly', priority: 0.6 },
    { loc: `${config.baseUrl}/authors`, changefreq: 'weekly', priority: 0.6 },
    { loc: `${config.baseUrl}/search`, changefreq: 'monthly', priority: 0.5 },
  ];

  return generateSitemapXml(staticPages, config);
}

/**
 * Generate sitemap index
 */
export async function generateSitemapIndex(
  config: SitemapConfig = DEFAULT_CONFIG
): Promise<string> {
  const supabase = await createServiceClient();

  // Get total posts count for pagination
  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  const postSitemapCount = Math.ceil((postCount || 0) / config.maxUrlsPerSitemap);

  const sitemaps: SitemapIndex['sitemaps'] = [];

  // Static pages sitemap
  sitemaps.push({
    loc: `${config.baseUrl}/sitemap-pages.xml`,
    lastmod: new Date().toISOString(),
  });

  // Posts sitemaps
  for (let i = 1; i <= postSitemapCount; i++) {
    sitemaps.push({
      loc: `${config.baseUrl}/sitemap-posts-${i}.xml`,
      lastmod: new Date().toISOString(),
    });
  }

  // Categories sitemap
  sitemaps.push({
    loc: `${config.baseUrl}/sitemap-categories.xml`,
    lastmod: new Date().toISOString(),
  });

  // Authors sitemap
  sitemaps.push({
    loc: `${config.baseUrl}/sitemap-authors.xml`,
    lastmod: new Date().toISOString(),
  });

  // Tags sitemap
  sitemaps.push({
    loc: `${config.baseUrl}/sitemap-tags.xml`,
    lastmod: new Date().toISOString(),
  });

  return generateSitemapIndexXml(sitemaps);
}

/**
 * Get posts count for sitemap pagination
 */
export async function getPostsCount(): Promise<number> {
  const supabase = await createServiceClient();

  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  if (error) {
    logger.error('[Sitemap] Failed to count posts', error);
    throw error;
  }

  return count || 0;
}

/**
 * Ping search engines about sitemap update
 */
export async function pingSearchEngines(sitemapUrl: string): Promise<void> {
  const pingUrls = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];

  await Promise.all(
    pingUrls.map(async (url) => {
      try {
        await fetch(url, { method: 'GET' });
        logger.info('[Sitemap] Pinged search engine', { url });
      } catch (error) {
        logger.warn('[Sitemap] Failed to ping search engine', { url, error });
      }
    })
  );
}

export default {
  generatePostsSitemap,
  generateCategoriesSitemap,
  generateAuthorsSitemap,
  generateTagsSitemap,
  generatePagesSitemap,
  generateSitemapIndex,
  getPostsCount,
  pingSearchEngines,
  DEFAULT_CONFIG,
};
