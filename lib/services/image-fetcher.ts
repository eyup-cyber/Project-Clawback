/**
 * Image Fetcher Service
 * Fetches images from Patreon and X (Twitter) posts
 */

export interface ImageInfo {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

interface ImageFetchResult {
  success: boolean;
  images: ImageInfo[];
  error?: string;
}

/**
 * Extract images from a Patreon post URL
 * Note: Patreon doesn't have a public API, so we'll need to use their RSS feed or web scraping
 */
export async function fetchPatreonImages(postUrl: string): Promise<ImageFetchResult> {
  try {
    // Patreon post URLs typically look like:
    // https://www.patreon.com/posts/[post-id]
    
    // Since Patreon requires authentication for API access,
    // we'll need to either:
    // 1. Use their RSS feed (if public)
    // 2. Scrape the page (may violate ToS)
    // 3. Use manual image URLs
    
    // For now, we'll return a structure that allows manual URL input
    // In production, you'd want to:
    // - Set up Patreon API integration
    // - Or use a service like Zapier/Make to sync images
    // - Or manually provide image URLs
    
    return {
      success: false,
      images: [],
      error: 'Patreon API integration required. Please provide image URLs manually or set up Patreon API access.',
    };
  } catch (error) {
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Failed to fetch Patreon images',
    };
  }
}

/**
 * Extract images from an X (Twitter) post URL
 * Uses Twitter's oEmbed API which doesn't require authentication
 */
export async function fetchXImages(postUrl: string): Promise<ImageFetchResult> {
  try {
    // Twitter/X oEmbed endpoint
    // Format: https://publish.twitter.com/oembed?url=[tweet-url]
    
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(postUrl)}`;
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScroungersMedia/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tweet: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract images from the HTML
    const html = data.html || '';
    const imageRegex = /<img[^>]+src="([^"]+)"/g;
    const images: ImageInfo[] = [];
    
    let match;
    while ((match = imageRegex.exec(html)) !== null) {
      const imageUrl = match[1];
      // Twitter CDN URLs
      if (imageUrl.includes('pbs.twimg.com') || imageUrl.includes('twimg.com')) {
        // Get full-size image (remove size parameters)
        const fullSizeUrl = imageUrl.replace(/:[a-z]+\d+x\d+/g, '').replace(/&name=\w+/g, '');
        images.push({
          url: fullSizeUrl,
          alt: `Image from X post`,
        });
      }
    }

    // Also check for media entities in the response if available
    if (data.media && Array.isArray(data.media)) {
      data.media.forEach((media: any) => {
        if (media.type === 'photo' && media.media_url_https) {
          images.push({
            url: media.media_url_https,
            alt: media.alt_text || `Image from X post`,
            width: media.sizes?.large?.w,
            height: media.sizes?.large?.h,
          });
        }
      });
    }

    return {
      success: images.length > 0,
      images: images.length > 0 ? images : [],
      error: images.length === 0 ? 'No images found in this post' : undefined,
    };
  } catch (error) {
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Failed to fetch X images',
    };
  }
}

/**
 * Fetch images from a URL (detects platform automatically)
 */
export async function fetchImagesFromUrl(url: string): Promise<ImageFetchResult> {
  if (url.includes('patreon.com')) {
    return fetchPatreonImages(url);
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    return fetchXImages(url);
  } else {
    // Try to extract images from any URL
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ScroungersMedia/1.0)',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const html = await response.text();
      const imageRegex = /<img[^>]+src="([^"]+)"/gi;
      const images: ImageInfo[] = [];
      
      let match;
      while ((match = imageRegex.exec(html)) !== null) {
        const imageUrl = match[1];
        // Convert relative URLs to absolute
        const absoluteUrl = imageUrl.startsWith('http') 
          ? imageUrl 
          : new URL(imageUrl, url).toString();
        
        images.push({
          url: absoluteUrl,
          alt: match[0].match(/alt="([^"]*)"/)?.[1] || 'Image',
        });
      }

      return {
        success: images.length > 0,
        images,
        error: images.length === 0 ? 'No images found' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        images: [],
        error: error instanceof Error ? error.message : 'Failed to fetch images',
      };
    }
  }
}

/**
 * Download an image and return its data URL or blob
 */
export async function downloadImage(imageUrl: string): Promise<Blob> {
  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (compatible; ScroungersMedia/1.0)',
  };
  
  if (imageUrl.includes('twitter.com') || imageUrl.includes('x.com')) {
    headers['Referer'] = 'https://twitter.com';
  }

  const response = await fetch(imageUrl, { headers });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Get image dimensions from a URL
 */
export async function getImageDimensions(imageUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      resolve(null);
    };
    
    img.src = imageUrl;
  });
}

