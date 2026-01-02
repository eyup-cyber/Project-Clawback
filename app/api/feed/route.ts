export const runtime = 'edge';

/**
 * RSS Feed API
 * Generates RSS and Atom feeds for content
 */

import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://scroungers.media';
const SITE_NAME = 'Scroungers Multimedia';
const SITE_DESCRIPTION = 'Voices from the margins. Stories that matter.';

interface FeedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_type: string;
  featured_image_url?: string;
  published_at: string;
  author: {
    username: string;
    display_name?: string;
  };
  category?: {
    name: string;
    slug: string;
  };
  tags?: string[];
}

/**
 * GET /api/feed
 * Generate RSS/Atom feed
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'rss';
  const category = searchParams.get('category');
  const author = searchParams.get('author');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  const supabase = await createServiceClient();

  // Build query
  let query = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      content,
      content_type,
      featured_image_url,
      published_at,
      tags,
      author:profiles!author_id(username, display_name),
      category:categories(name, slug)
    `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (category) {
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single();

    if (categoryData) {
      query = query.eq('category_id', categoryData.id);
    }
  }

  if (author) {
    const { data: authorData } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', author)
      .single();

    if (authorData) {
      query = query.eq('author_id', authorData.id);
    }
  }

  const { data: posts, error } = await query;

  if (error) {
    return new Response('Failed to generate feed', { status: 500 });
  }

  const feedPosts = (posts || []) as unknown as FeedPost[];

  // Generate appropriate format
  if (format === 'atom') {
    const atomFeed = generateAtomFeed(feedPosts, { category, author });
    return new Response(atomFeed, {
      status: 200,
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  if (format === 'json') {
    const jsonFeed = generateJSONFeed(feedPosts, { category, author });
    return new Response(JSON.stringify(jsonFeed, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/feed+json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Default: RSS 2.0
  const rssFeed = generateRSSFeed(feedPosts, { category, author });
  return new Response(rssFeed, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function generateRSSFeed(
  posts: FeedPost[],
  filters: { category?: string | null; author?: string | null }
): string {
  const feedTitle = filters.category
    ? `${SITE_NAME} - ${filters.category}`
    : filters.author
      ? `${SITE_NAME} - Posts by ${filters.author}`
      : SITE_NAME;

  const lastBuildDate =
    posts.length > 0 ? new Date(posts[0].published_at).toUTCString() : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const authorName = post.author?.display_name || post.author?.username || 'Anonymous';
      const categories = [post.category?.name, ...(post.tags || [])].filter(Boolean);

      return `
    <item>
      <title><![CDATA[${escapeXml(post.title)}]]></title>
      <link>${SITE_URL}/articles/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/articles/${post.slug}</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <author>${escapeXml(authorName)}</author>
      <description><![CDATA[${escapeXml(post.excerpt || '')}]]></description>
      ${post.featured_image_url ? `<enclosure url="${escapeXml(post.featured_image_url)}" type="image/jpeg" />` : ''}
      ${categories.map((cat) => `<category>${escapeXml(cat || '')}</category>`).join('\n      ')}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/feed" rel="self" type="application/rss+xml"/>
    <generator>Scroungers Multimedia</generator>
    ${items}
  </channel>
</rss>`;
}

function generateAtomFeed(
  posts: FeedPost[],
  filters: { category?: string | null; author?: string | null }
): string {
  const feedTitle = filters.category
    ? `${SITE_NAME} - ${filters.category}`
    : filters.author
      ? `${SITE_NAME} - Posts by ${filters.author}`
      : SITE_NAME;

  const updated =
    posts.length > 0 ? new Date(posts[0].published_at).toISOString() : new Date().toISOString();

  const entries = posts
    .map((post) => {
      const authorName = post.author?.display_name || post.author?.username || 'Anonymous';
      const categories = [post.category?.name, ...(post.tags || [])].filter(Boolean);

      return `
  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${SITE_URL}/articles/${post.slug}" />
    <id>urn:uuid:${post.id}</id>
    <published>${new Date(post.published_at).toISOString()}</published>
    <updated>${new Date(post.published_at).toISOString()}</updated>
    <author>
      <name>${escapeXml(authorName)}</name>
    </author>
    <summary type="html"><![CDATA[${escapeXml(post.excerpt || '')}]]></summary>
    ${categories.map((cat) => `<category term="${escapeXml(cat || '')}" />`).join('\n    ')}
  </entry>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feedTitle)}</title>
  <link href="${SITE_URL}" />
  <link href="${SITE_URL}/api/feed?format=atom" rel="self" />
  <id>${SITE_URL}/</id>
  <updated>${updated}</updated>
  <subtitle>${escapeXml(SITE_DESCRIPTION)}</subtitle>
  <generator>Scroungers Multimedia</generator>
  ${entries}
</feed>`;
}

function generateJSONFeed(
  posts: FeedPost[],
  filters: { category?: string | null; author?: string | null }
): object {
  const feedTitle = filters.category
    ? `${SITE_NAME} - ${filters.category}`
    : filters.author
      ? `${SITE_NAME} - Posts by ${filters.author}`
      : SITE_NAME;

  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: feedTitle,
    home_page_url: SITE_URL,
    feed_url: `${SITE_URL}/api/feed?format=json`,
    description: SITE_DESCRIPTION,
    language: 'en-US',
    items: posts.map((post) => ({
      id: post.id,
      url: `${SITE_URL}/articles/${post.slug}`,
      title: post.title,
      content_text: post.excerpt || '',
      summary: post.excerpt || '',
      image: post.featured_image_url,
      date_published: new Date(post.published_at).toISOString(),
      authors: [
        {
          name: post.author?.display_name || post.author?.username || 'Anonymous',
        },
      ],
      tags: [post.category?.name, ...(post.tags || [])].filter(Boolean),
    })),
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
