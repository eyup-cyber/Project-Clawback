/**
 * Rich Content Embeds System
 * Phase 59: Support for embedding tweets, videos, and other external content
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EmbedProvider {
  name: string;
  patterns: RegExp[];
  transform: (url: string, match: RegExpMatchArray) => Promise<EmbedData>;
  render: (data: EmbedData) => string;
}

export interface EmbedData {
  provider: string;
  type: EmbedType;
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  html?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  author?: {
    name: string;
    url?: string;
    avatar?: string;
  };
  metadata?: Record<string, unknown>;
}

export type EmbedType =
  | 'video'
  | 'tweet'
  | 'post'
  | 'image'
  | 'audio'
  | 'document'
  | 'code'
  | 'link'
  | 'rich';

export interface OEmbedResponse {
  type: string;
  version: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  cache_age?: number;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  width?: number;
  height?: number;
}

// ============================================================================
// EMBED PROVIDERS
// ============================================================================

export const embedProviders: EmbedProvider[] = [
  // YouTube
  {
    name: 'youtube',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    ],
    transform: async (url, match) => {
      const videoId = match[1];
      return {
        provider: 'youtube',
        type: 'video',
        url,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        aspectRatio: '16:9',
        metadata: { videoId },
      };
    },
    render: (data) => {
      const videoId = data.metadata?.videoId;
      return `
        <div class="embed-container embed-youtube" style="aspect-ratio: 16/9">
          <iframe 
            src="https://www.youtube.com/embed/${videoId}?rel=0" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
      `;
    },
  },

  // Vimeo
  {
    name: 'vimeo',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
      /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/,
    ],
    transform: async (url, match) => {
      const videoId = match[1];
      // Fetch oEmbed for additional data
      const oembed = await fetchOEmbed(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
      return {
        provider: 'vimeo',
        type: 'video',
        url,
        title: oembed?.title,
        thumbnail: oembed?.thumbnail_url,
        aspectRatio: '16:9',
        metadata: { videoId },
      };
    },
    render: (data) => {
      const videoId = data.metadata?.videoId;
      return `
        <div class="embed-container embed-vimeo" style="aspect-ratio: 16/9">
          <iframe 
            src="https://player.vimeo.com/video/${videoId}?dnt=1" 
            frameborder="0" 
            allow="autoplay; fullscreen; picture-in-picture" 
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
      `;
    },
  },

  // Twitter/X
  {
    name: 'twitter',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)/,
    ],
    transform: async (url, match) => {
      const tweetId = match[1];
      return {
        provider: 'twitter',
        type: 'tweet',
        url: url.replace('x.com', 'twitter.com'),
        metadata: { tweetId },
      };
    },
    render: (data) => {
      return `
        <div class="embed-container embed-twitter">
          <blockquote class="twitter-tweet" data-dnt="true">
            <a href="${data.url}">Loading tweet...</a>
          </blockquote>
          <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
        </div>
      `;
    },
  },

  // Instagram
  {
    name: 'instagram',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/,
    ],
    transform: async (url, match) => {
      const postId = match[1];
      return {
        provider: 'instagram',
        type: 'post',
        url,
        metadata: { postId },
      };
    },
    render: (data) => {
      return `
        <div class="embed-container embed-instagram">
          <blockquote 
            class="instagram-media" 
            data-instgrm-captioned 
            data-instgrm-permalink="${data.url}"
          >
            <a href="${data.url}">View on Instagram</a>
          </blockquote>
          <script async src="//www.instagram.com/embed.js"></script>
        </div>
      `;
    },
  },

  // TikTok
  {
    name: 'tiktok',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
      /(?:https?:\/\/)?(?:vm\.)?tiktok\.com\/([a-zA-Z0-9]+)/,
    ],
    transform: async (url, match) => {
      const videoId = match[1];
      return {
        provider: 'tiktok',
        type: 'video',
        url,
        aspectRatio: '9:16',
        metadata: { videoId },
      };
    },
    render: (data) => {
      return `
        <div class="embed-container embed-tiktok">
          <blockquote 
            class="tiktok-embed" 
            cite="${data.url}" 
            data-video-id="${data.metadata?.videoId}"
          >
            <a href="${data.url}">View on TikTok</a>
          </blockquote>
          <script async src="https://www.tiktok.com/embed.js"></script>
        </div>
      `;
    },
  },

  // Spotify
  {
    name: 'spotify',
    patterns: [
      /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/,
    ],
    transform: async (url, match) => {
      const [, type, id] = match;
      return {
        provider: 'spotify',
        type: 'audio',
        url,
        metadata: { spotifyType: type, spotifyId: id },
      };
    },
    render: (data) => {
      const { spotifyType, spotifyId } = data.metadata || {};
      const height = spotifyType === 'track' ? 152 : 352;
      return `
        <div class="embed-container embed-spotify">
          <iframe 
            src="https://open.spotify.com/embed/${spotifyType}/${spotifyId}?utm_source=generator&theme=0" 
            width="100%" 
            height="${height}" 
            frameBorder="0" 
            allowfullscreen="" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          ></iframe>
        </div>
      `;
    },
  },

  // SoundCloud
  {
    name: 'soundcloud',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/,
    ],
    transform: async (url) => {
      const oembed = await fetchOEmbed(
        `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`
      );
      return {
        provider: 'soundcloud',
        type: 'audio',
        url,
        title: oembed?.title,
        thumbnail: oembed?.thumbnail_url,
        html: oembed?.html,
      };
    },
    render: (data) => {
      if (data.html) {
        return `<div class="embed-container embed-soundcloud">${data.html}</div>`;
      }
      return `
        <div class="embed-container embed-soundcloud">
          <a href="${data.url}">Listen on SoundCloud</a>
        </div>
      `;
    },
  },

  // CodePen
  {
    name: 'codepen',
    patterns: [
      /(?:https?:\/\/)?codepen\.io\/([\w-]+)\/pen\/([\w-]+)/,
    ],
    transform: async (url, match) => {
      const [, user, penId] = match;
      return {
        provider: 'codepen',
        type: 'code',
        url,
        aspectRatio: '16:9',
        metadata: { user, penId },
      };
    },
    render: (data) => {
      const { user, penId } = data.metadata || {};
      return `
        <div class="embed-container embed-codepen" style="aspect-ratio: 16/9">
          <iframe 
            src="https://codepen.io/${user}/embed/${penId}?default-tab=result&theme-id=dark" 
            frameborder="0" 
            loading="lazy" 
            allowfullscreen="true"
          ></iframe>
        </div>
      `;
    },
  },

  // CodeSandbox
  {
    name: 'codesandbox',
    patterns: [
      /(?:https?:\/\/)?codesandbox\.io\/s\/([\w-]+)/,
      /(?:https?:\/\/)?codesandbox\.io\/p\/sandbox\/([\w-]+)/,
    ],
    transform: async (url, match) => {
      const sandboxId = match[1];
      return {
        provider: 'codesandbox',
        type: 'code',
        url,
        aspectRatio: '16:9',
        metadata: { sandboxId },
      };
    },
    render: (data) => {
      const { sandboxId } = data.metadata || {};
      return `
        <div class="embed-container embed-codesandbox" style="aspect-ratio: 16/9">
          <iframe 
            src="https://codesandbox.io/embed/${sandboxId}?fontsize=14&hidenavigation=1&theme=dark" 
            frameborder="0" 
            loading="lazy"
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          ></iframe>
        </div>
      `;
    },
  },

  // GitHub Gist
  {
    name: 'gist',
    patterns: [
      /(?:https?:\/\/)?gist\.github\.com\/([\w-]+)\/([\w]+)/,
    ],
    transform: async (url, match) => {
      const [, user, gistId] = match;
      return {
        provider: 'gist',
        type: 'code',
        url,
        metadata: { user, gistId },
      };
    },
    render: (data) => {
      const { gistId } = data.metadata || {};
      return `
        <div class="embed-container embed-gist">
          <script src="https://gist.github.com/${gistId}.js"></script>
        </div>
      `;
    },
  },

  // Figma
  {
    name: 'figma',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?figma\.com\/(file|proto)\/([a-zA-Z0-9]+)/,
    ],
    transform: async (url, match) => {
      const [, type, fileId] = match;
      return {
        provider: 'figma',
        type: 'rich',
        url,
        aspectRatio: '16:9',
        metadata: { figmaType: type, fileId },
      };
    },
    render: (data) => {
      return `
        <div class="embed-container embed-figma" style="aspect-ratio: 16/9">
          <iframe 
            src="https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(data.url)}" 
            frameborder="0"
            loading="lazy"
            allowfullscreen
          ></iframe>
        </div>
      `;
    },
  },

  // Loom
  {
    name: 'loom',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?loom\.com\/share\/([a-zA-Z0-9]+)/,
    ],
    transform: async (url, match) => {
      const videoId = match[1];
      return {
        provider: 'loom',
        type: 'video',
        url,
        aspectRatio: '16:9',
        metadata: { videoId },
      };
    },
    render: (data) => {
      const { videoId } = data.metadata || {};
      return `
        <div class="embed-container embed-loom" style="aspect-ratio: 16/9">
          <iframe 
            src="https://www.loom.com/embed/${videoId}" 
            frameborder="0" 
            webkitallowfullscreen 
            mozallowfullscreen 
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
      `;
    },
  },

  // Google Maps
  {
    name: 'google-maps',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?google\.com\/maps\/embed\?pb=([^&\s]+)/,
      /(?:https?:\/\/)?(?:www\.)?google\.com\/maps\/place\/([^?\s]+)/,
    ],
    transform: async (url) => {
      return {
        provider: 'google-maps',
        type: 'rich',
        url,
        aspectRatio: '4:3',
      };
    },
    render: (data) => {
      // If it's an embed URL, use directly
      if (data.url.includes('/maps/embed')) {
        return `
          <div class="embed-container embed-google-maps" style="aspect-ratio: 4/3">
            <iframe 
              src="${data.url}" 
              frameborder="0" 
              allowfullscreen="" 
              loading="lazy"
            ></iframe>
          </div>
        `;
      }
      // Otherwise create embed URL
      return `
        <div class="embed-container embed-google-maps" style="aspect-ratio: 4/3">
          <iframe 
            src="https://maps.google.com/maps?q=${encodeURIComponent(data.url)}&output=embed" 
            frameborder="0" 
            allowfullscreen="" 
            loading="lazy"
          ></iframe>
        </div>
      `;
    },
  },

  // Generic link preview
  {
    name: 'link',
    patterns: [/^https?:\/\/.+/],
    transform: async (url) => {
      const metadata = await fetchLinkMetadata(url);
      return {
        provider: 'link',
        type: 'link',
        url,
        title: metadata?.title,
        description: metadata?.description,
        thumbnail: metadata?.image,
      };
    },
    render: (data) => {
      return `
        <a href="${data.url}" class="embed-link" target="_blank" rel="noopener noreferrer">
          ${data.thumbnail ? `<img src="${data.thumbnail}" alt="" class="embed-link-image" loading="lazy" />` : ''}
          <div class="embed-link-content">
            <div class="embed-link-title">${escapeHtml(data.title || data.url)}</div>
            ${data.description ? `<div class="embed-link-description">${escapeHtml(data.description)}</div>` : ''}
            <div class="embed-link-url">${new URL(data.url).hostname}</div>
          </div>
        </a>
      `;
    },
  },
];

// ============================================================================
// EMBED FUNCTIONS
// ============================================================================

/**
 * Parse URL and get embed data
 */
export async function parseEmbed(url: string): Promise<EmbedData | null> {
  for (const provider of embedProviders) {
    for (const pattern of provider.patterns) {
      const match = url.match(pattern);
      if (match) {
        try {
          const data = await provider.transform(url, match);
          return data;
        } catch (error) {
          console.error(`Error parsing embed for ${provider.name}:`, error);
        }
      }
    }
  }
  return null;
}

/**
 * Render embed to HTML
 */
export function renderEmbed(data: EmbedData): string {
  const provider = embedProviders.find((p) => p.name === data.provider);
  if (provider) {
    return provider.render(data);
  }
  return `<a href="${data.url}" target="_blank">${data.title || data.url}</a>`;
}

/**
 * Parse and render embed in one step
 */
export async function processEmbed(url: string): Promise<string | null> {
  const data = await parseEmbed(url);
  if (data) {
    return renderEmbed(data);
  }
  return null;
}

/**
 * Process content and replace URLs with embeds
 */
export async function processContentEmbeds(content: string): Promise<string> {
  // Find URLs on their own line
  const urlPattern = /^(https?:\/\/[^\s]+)$/gm;
  const matches = [...content.matchAll(urlPattern)];

  for (const match of matches) {
    const url = match[1];
    const embed = await processEmbed(url);
    if (embed) {
      content = content.replace(match[0], embed);
    }
  }

  return content;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch oEmbed data
 */
async function fetchOEmbed(endpoint: string): Promise<OEmbedResponse | null> {
  try {
    const response = await fetch(endpoint);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Silently fail
  }
  return null;
}

/**
 * Fetch link metadata
 */
async function fetchLinkMetadata(url: string): Promise<{
  title?: string;
  description?: string;
  image?: string;
} | null> {
  try {
    // In a real implementation, this would use a server-side API
    // to fetch and parse the HTML for Open Graph/meta tags
    return {
      title: url,
    };
  } catch {
    return null;
  }
}

/**
 * Escape HTML
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
 * Get embed styles CSS
 */
export function getEmbedStyles(): string {
  return `
    .embed-container {
      width: 100%;
      margin: 1rem 0;
      border-radius: 8px;
      overflow: hidden;
    }

    .embed-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .embed-twitter,
    .embed-instagram {
      max-width: 550px;
      margin-left: auto;
      margin-right: auto;
    }

    .embed-link {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.2s;
    }

    .embed-link:hover {
      border-color: var(--primary-color, #3b82f6);
    }

    .embed-link-image {
      width: 120px;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .embed-link-content {
      flex: 1;
      min-width: 0;
    }

    .embed-link-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .embed-link-description {
      font-size: 0.875rem;
      color: var(--text-muted, #6b7280);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .embed-link-url {
      font-size: 0.75rem;
      color: var(--text-muted, #6b7280);
      margin-top: 0.5rem;
    }
  `;
}

/**
 * Check if URL is embeddable
 */
export function isEmbeddable(url: string): boolean {
  return embedProviders.some((provider) =>
    provider.patterns.some((pattern) => pattern.test(url))
  );
}

/**
 * Get provider name for URL
 */
export function getProviderName(url: string): string | null {
  for (const provider of embedProviders) {
    for (const pattern of provider.patterns) {
      if (pattern.test(url)) {
        return provider.name;
      }
    }
  }
  return null;
}
