/**
 * Social Sharing and Open Graph Optimization
 * Phase 56: Share buttons, OG tags, and social previews
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OpenGraphData {
  // Basic metadata
  title: string;
  type: OGType;
  url: string;
  description: string;

  // Images
  image?: OGImage;
  images?: OGImage[];

  // Site info
  site_name?: string;
  locale?: string;

  // Article specific
  article?: OGArticle;

  // Profile specific
  profile?: OGProfile;

  // Audio
  audio?: OGAudio;

  // Video
  video?: OGVideo;
}

export type OGType =
  | 'website'
  | 'article'
  | 'profile'
  | 'book'
  | 'music.song'
  | 'music.album'
  | 'video.movie'
  | 'video.episode';

export interface OGImage {
  url: string;
  secure_url?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface OGArticle {
  published_time?: string;
  modified_time?: string;
  expiration_time?: string;
  author?: string | string[];
  section?: string;
  tag?: string[];
}

export interface OGProfile {
  first_name?: string;
  last_name?: string;
  username?: string;
  gender?: string;
}

export interface OGAudio {
  url: string;
  secure_url?: string;
  type?: string;
}

export interface OGVideo {
  url: string;
  secure_url?: string;
  type?: string;
  width?: number;
  height?: number;
}

export interface TwitterCardData {
  card: TwitterCardType;
  site?: string;
  site_id?: string;
  creator?: string;
  creator_id?: string;
  title: string;
  description: string;
  image?: string;
  image_alt?: string;
  player?: TwitterPlayer;
}

export type TwitterCardType = 'summary' | 'summary_large_image' | 'player' | 'app';

export interface TwitterPlayer {
  url: string;
  width: number;
  height: number;
  stream?: string;
}

export interface ShareUrls {
  facebook: string;
  twitter: string;
  linkedin: string;
  pinterest: string;
  reddit: string;
  whatsapp: string;
  telegram: string;
  email: string;
  copy: string;
  native: boolean;
}

export interface ShareConfig {
  url: string;
  title: string;
  description?: string;
  image?: string;
  hashtags?: string[];
  via?: string;
}

export interface SocialPreview {
  platform: 'facebook' | 'twitter' | 'linkedin' | 'discord';
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  url?: string;
}

// ============================================================================
// OPEN GRAPH TAG GENERATION
// ============================================================================

/**
 * Generate Open Graph meta tags
 */
export function generateOpenGraphTags(data: OpenGraphData): string {
  const tags: string[] = [];

  // Basic OG tags
  tags.push(ogTag('og:title', data.title));
  tags.push(ogTag('og:type', data.type));
  tags.push(ogTag('og:url', data.url));
  tags.push(ogTag('og:description', data.description));

  if (data.site_name) {
    tags.push(ogTag('og:site_name', data.site_name));
  }

  if (data.locale) {
    tags.push(ogTag('og:locale', data.locale));
  }

  // Image tags
  if (data.image) {
    tags.push(...generateOGImageTags(data.image));
  }
  if (data.images) {
    for (const image of data.images) {
      tags.push(...generateOGImageTags(image));
    }
  }

  // Article specific
  if (data.article) {
    if (data.article.published_time) {
      tags.push(ogTag('article:published_time', data.article.published_time));
    }
    if (data.article.modified_time) {
      tags.push(ogTag('article:modified_time', data.article.modified_time));
    }
    if (data.article.expiration_time) {
      tags.push(ogTag('article:expiration_time', data.article.expiration_time));
    }
    if (data.article.author) {
      const authors = Array.isArray(data.article.author)
        ? data.article.author
        : [data.article.author];
      for (const author of authors) {
        tags.push(ogTag('article:author', author));
      }
    }
    if (data.article.section) {
      tags.push(ogTag('article:section', data.article.section));
    }
    if (data.article.tag) {
      for (const tag of data.article.tag) {
        tags.push(ogTag('article:tag', tag));
      }
    }
  }

  // Profile specific
  if (data.profile) {
    if (data.profile.first_name) {
      tags.push(ogTag('profile:first_name', data.profile.first_name));
    }
    if (data.profile.last_name) {
      tags.push(ogTag('profile:last_name', data.profile.last_name));
    }
    if (data.profile.username) {
      tags.push(ogTag('profile:username', data.profile.username));
    }
    if (data.profile.gender) {
      tags.push(ogTag('profile:gender', data.profile.gender));
    }
  }

  // Audio
  if (data.audio) {
    tags.push(ogTag('og:audio', data.audio.url));
    if (data.audio.secure_url) {
      tags.push(ogTag('og:audio:secure_url', data.audio.secure_url));
    }
    if (data.audio.type) {
      tags.push(ogTag('og:audio:type', data.audio.type));
    }
  }

  // Video
  if (data.video) {
    tags.push(ogTag('og:video', data.video.url));
    if (data.video.secure_url) {
      tags.push(ogTag('og:video:secure_url', data.video.secure_url));
    }
    if (data.video.type) {
      tags.push(ogTag('og:video:type', data.video.type));
    }
    if (data.video.width) {
      tags.push(ogTag('og:video:width', String(data.video.width)));
    }
    if (data.video.height) {
      tags.push(ogTag('og:video:height', String(data.video.height)));
    }
  }

  return tags.filter(Boolean).join('\n');
}

/**
 * Generate OG image tags
 */
function generateOGImageTags(image: OGImage): string[] {
  const tags: string[] = [];

  tags.push(ogTag('og:image', image.url));
  if (image.secure_url) {
    tags.push(ogTag('og:image:secure_url', image.secure_url));
  }
  if (image.type) {
    tags.push(ogTag('og:image:type', image.type));
  }
  if (image.width) {
    tags.push(ogTag('og:image:width', String(image.width)));
  }
  if (image.height) {
    tags.push(ogTag('og:image:height', String(image.height)));
  }
  if (image.alt) {
    tags.push(ogTag('og:image:alt', image.alt));
  }

  return tags;
}

/**
 * Create single OG tag
 */
function ogTag(property: string, content: string): string {
  return `<meta property="${property}" content="${escapeHtml(content)}" />`;
}

// ============================================================================
// TWITTER CARD TAG GENERATION
// ============================================================================

/**
 * Generate Twitter Card meta tags
 */
export function generateTwitterTags(data: TwitterCardData): string {
  const tags: string[] = [];

  tags.push(twitterTag('twitter:card', data.card));
  tags.push(twitterTag('twitter:title', data.title));
  tags.push(twitterTag('twitter:description', data.description));

  if (data.site) {
    tags.push(twitterTag('twitter:site', data.site));
  }
  if (data.site_id) {
    tags.push(twitterTag('twitter:site:id', data.site_id));
  }
  if (data.creator) {
    tags.push(twitterTag('twitter:creator', data.creator));
  }
  if (data.creator_id) {
    tags.push(twitterTag('twitter:creator:id', data.creator_id));
  }
  if (data.image) {
    tags.push(twitterTag('twitter:image', data.image));
  }
  if (data.image_alt) {
    tags.push(twitterTag('twitter:image:alt', data.image_alt));
  }

  // Player card
  if (data.player) {
    tags.push(twitterTag('twitter:player', data.player.url));
    tags.push(twitterTag('twitter:player:width', String(data.player.width)));
    tags.push(twitterTag('twitter:player:height', String(data.player.height)));
    if (data.player.stream) {
      tags.push(twitterTag('twitter:player:stream', data.player.stream));
    }
  }

  return tags.filter(Boolean).join('\n');
}

/**
 * Create single Twitter tag
 */
function twitterTag(name: string, content: string): string {
  return `<meta name="${name}" content="${escapeHtml(content)}" />`;
}

// ============================================================================
// SHARE URL GENERATION
// ============================================================================

/**
 * Generate share URLs for all platforms
 */
export function generateShareUrls(config: ShareConfig): ShareUrls {
  const { url, title, description, image, hashtags, via } = config;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const _encodedDesc = encodeURIComponent(description || ''); // Reserved for future use
  const _hashtagString = hashtags?.length ? hashtags.join(',') : ''; // Used in buildTwitterShareUrl

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,

    twitter: buildTwitterShareUrl(url, title, hashtags, via),

    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,

    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${image ? `&media=${encodeURIComponent(image)}` : ''}`,

    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,

    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,

    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,

    email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,

    copy: url,

    native: typeof navigator !== 'undefined' && !!navigator.share,
  };
}

/**
 * Build Twitter share URL
 */
function buildTwitterShareUrl(
  url: string,
  text: string,
  hashtags?: string[],
  via?: string
): string {
  const params = new URLSearchParams({
    url,
    text,
  });

  if (hashtags?.length) {
    params.set('hashtags', hashtags.join(','));
  }
  if (via) {
    params.set('via', via.replace('@', ''));
  }

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Share using Web Share API
 */
export async function nativeShare(config: ShareConfig): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: config.title,
      text: config.description,
      url: config.url,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy link to clipboard
 */
export async function copyToClipboard(url: string): Promise<boolean> {
  if (typeof navigator === 'undefined') {
    return false;
  }

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// SOCIAL PREVIEW GENERATION
// ============================================================================

/**
 * Generate preview data for different platforms
 */
export function generateSocialPreviews(
  data: OpenGraphData,
  twitterData?: TwitterCardData
): SocialPreview[] {
  const previews: SocialPreview[] = [];

  // Facebook preview
  previews.push({
    platform: 'facebook',
    title: truncate(data.title, 60),
    description: truncate(data.description, 155),
    image: data.image?.url,
    siteName: data.site_name,
    url: new URL(data.url).hostname,
  });

  // Twitter preview
  if (twitterData) {
    previews.push({
      platform: 'twitter',
      title: truncate(twitterData.title, 70),
      description: truncate(twitterData.description, 200),
      image: twitterData.image,
      siteName: twitterData.site,
    });
  }

  // LinkedIn preview
  previews.push({
    platform: 'linkedin',
    title: truncate(data.title, 200),
    description: truncate(data.description, 256),
    image: data.image?.url,
    url: new URL(data.url).hostname,
  });

  // Discord preview
  previews.push({
    platform: 'discord',
    title: truncate(data.title, 256),
    description: truncate(data.description, 350),
    image: data.image?.url,
    siteName: data.site_name,
  });

  return previews;
}

/**
 * Validate OG image dimensions
 */
export function validateOGImage(
  width: number,
  height: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Recommended: 1200x630 for Facebook
  if (width < 600 || height < 315) {
    warnings.push('Image is smaller than minimum size (600x315)');
  }

  if (width > 1200 || height > 630) {
    warnings.push('Image is larger than recommended (1200x630), may be cropped');
  }

  const aspectRatio = width / height;
  if (aspectRatio < 1.5 || aspectRatio > 2) {
    warnings.push('Aspect ratio should be close to 1.91:1 for best display');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Get optimal OG image size for platform
 */
export function getOptimalImageSize(
  platform: 'facebook' | 'twitter' | 'linkedin'
): { width: number; height: number } {
  switch (platform) {
    case 'facebook':
      return { width: 1200, height: 630 };
    case 'twitter':
      return { width: 1200, height: 675 };
    case 'linkedin':
      return { width: 1200, height: 627 };
    default:
      return { width: 1200, height: 630 };
  }
}

// ============================================================================
// STRUCTURED DATA FOR SOCIAL
// ============================================================================

/**
 * Generate JSON-LD for social sharing
 */
export function generateSocialJsonLd(data: {
  type: 'article' | 'profile' | 'website';
  url: string;
  title: string;
  description: string;
  image?: string;
  author?: { name: string; url?: string };
  datePublished?: string;
  dateModified?: string;
  publisher?: { name: string; logo?: string };
}): string {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': data.type === 'article' ? 'Article' : data.type === 'profile' ? 'Person' : 'WebSite',
    name: data.title,
    headline: data.title,
    description: data.description,
    url: data.url,
  };

  if (data.image) {
    jsonLd.image = {
      '@type': 'ImageObject',
      url: data.image,
    };
  }

  if (data.author) {
    jsonLd.author = {
      '@type': 'Person',
      name: data.author.name,
      url: data.author.url,
    };
  }

  if (data.datePublished) {
    jsonLd.datePublished = data.datePublished;
  }

  if (data.dateModified) {
    jsonLd.dateModified = data.dateModified;
  }

  if (data.publisher) {
    jsonLd.publisher = {
      '@type': 'Organization',
      name: data.publisher.name,
      logo: data.publisher.logo
        ? {
            '@type': 'ImageObject',
            url: data.publisher.logo,
          }
        : undefined,
    };
  }

  return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Escape HTML entities
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
 * Truncate string to length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Create metadata object for Next.js
 */
export function createMetadataObject(
  og: OpenGraphData,
  twitter?: TwitterCardData
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    title: og.title,
    description: og.description,
    openGraph: {
      title: og.title,
      description: og.description,
      type: og.type,
      url: og.url,
      siteName: og.site_name,
      locale: og.locale,
      images: og.images || (og.image ? [og.image] : []),
    },
  };

  if (twitter) {
    metadata.twitter = {
      card: twitter.card,
      title: twitter.title,
      description: twitter.description,
      site: twitter.site,
      creator: twitter.creator,
      images: twitter.image ? [twitter.image] : [],
    };
  }

  return metadata;
}

/**
 * Generate all social meta tags
 */
export function generateAllSocialTags(
  og: OpenGraphData,
  twitter?: TwitterCardData
): string {
  let tags = generateOpenGraphTags(og);

  if (twitter) {
    tags += '\n' + generateTwitterTags(twitter);
  }

  return tags;
}
