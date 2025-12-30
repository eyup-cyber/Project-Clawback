// @ts-nocheck
/**
 * Performance Optimization Utilities
 * Phase 25: Lazy loading, prefetching, image optimization, bundle analysis
 */

// ============================================================================
// LAZY LOADING UTILITIES
// ============================================================================

/**
 * Create an intersection observer for lazy loading
 */
export function createLazyLoader(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, defaultOptions);
}

/**
 * Prefetch a route
 */
export function prefetchRoute(href: string): void {
  if (typeof window === 'undefined') return;

  // Check if already prefetched
  const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = 'document';
  document.head.appendChild(link);
}

/**
 * Preload critical resources
 */
export function preloadResource(
  href: string,
  as: 'script' | 'style' | 'image' | 'font' | 'fetch',
  options: {
    crossOrigin?: 'anonymous' | 'use-credentials';
    type?: string;
  } = {}
): void {
  if (typeof window === 'undefined') return;

  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;

  if (options.crossOrigin) {
    link.crossOrigin = options.crossOrigin;
  }
  if (options.type) {
    link.type = options.type;
  }

  document.head.appendChild(link);
}

// ============================================================================
// IMAGE OPTIMIZATION
// ============================================================================

export interface OptimizedImageSrc {
  src: string;
  srcSet: string;
  sizes: string;
  placeholder?: string;
}

/**
 * Generate optimized image sources
 */
export function getOptimizedImageSrc(
  src: string,
  options: {
    widths?: number[];
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  } = {}
): OptimizedImageSrc {
  const { widths = [320, 640, 1024, 1280, 1920], quality = 80, format = 'auto' } = options;

  // If using external CDN, construct URLs
  const isExternal = src.startsWith('http');

  if (isExternal) {
    // For Cloudflare Images or similar
    const srcSet = widths
      .map((w) => {
        const url = new URL(src);
        url.searchParams.set('width', w.toString());
        url.searchParams.set('quality', quality.toString());
        if (format !== 'auto') {
          url.searchParams.set('format', format);
        }
        return `${url.toString()} ${w}w`;
      })
      .join(', ');

    const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw';

    return {
      src,
      srcSet,
      sizes,
    };
  }

  // For Next.js Image optimization
  const srcSet = widths
    .map((w) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${quality} ${w}w`)
    .join(', ');

  return {
    src,
    srcSet,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw',
  };
}

/**
 * Generate a blur placeholder
 */
export function generateBlurPlaceholder(width: number, height: number): string {
  const aspectRatio = width / height;
  const placeholderWidth = 10;
  const placeholderHeight = Math.round(placeholderWidth / aspectRatio);

  // Generate a simple SVG placeholder
  return `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${placeholderWidth} ${placeholderHeight}">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20"/>
      </filter>
      <rect width="100%" height="100%" fill="#f3f4f6" filter="url(#b)"/>
    </svg>`
  )}`;
}

// ============================================================================
// RESOURCE HINTS
// ============================================================================

/**
 * Add DNS prefetch hints
 */
export function addDnsPrefetch(domains: string[]): void {
  if (typeof window === 'undefined') return;

  domains.forEach((domain) => {
    const existing = document.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`);
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });
}

/**
 * Add preconnect hints
 */
export function addPreconnect(origins: string[]): void {
  if (typeof window === 'undefined') return;

  origins.forEach((origin) => {
    const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  // Additional metrics
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  domInteractive?: number;
  domComplete?: number;
  loadComplete?: number;
}

/**
 * Collect performance metrics
 */
export function collectPerformanceMetrics(): PerformanceMetrics {
  if (typeof window === 'undefined' || !window.performance) {
    return {};
  }

  const metrics: PerformanceMetrics = {};
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  // Navigation timing
  if (navigation) {
    metrics.ttfb = navigation.responseStart - navigation.requestStart;
    metrics.domInteractive = navigation.domInteractive - navigation.navigationStart;
    metrics.domComplete = navigation.domComplete - navigation.navigationStart;
    metrics.loadComplete = navigation.loadEventEnd - navigation.navigationStart;
  }

  // Paint timing
  paint.forEach((entry) => {
    if (entry.name === 'first-contentful-paint') {
      metrics.fcp = entry.startTime;
    }
  });

  return metrics;
}

/**
 * Observe Core Web Vitals
 */
export function observeWebVitals(callback: (metrics: PerformanceMetrics) => void): void {
  if (typeof window === 'undefined') return;

  const metrics: PerformanceMetrics = {};

  // Observe LCP
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          startTime: number;
        };
        metrics.lcp = lastEntry.startTime;
        callback(metrics);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // LCP not supported
    }

    // Observe FID
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstEntry = entries[0] as PerformanceEntry & {
          processingStart: number;
          startTime: number;
        };
        metrics.fid = firstEntry.processingStart - firstEntry.startTime;
        callback(metrics);
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {
      // FID not supported
    }

    // Observe CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as (PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        })[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        metrics.cls = clsValue;
        callback(metrics);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // CLS not supported
    }
  }
}

// ============================================================================
// CODE SPLITTING HELPERS
// ============================================================================

/**
 * Dynamic import with retry
 */
export async function dynamicImportWithRetry<T>(
  importFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Import failed after retries');
}

/**
 * Create a lazy component with loading state
 */
export function createLazyComponent<T extends React.ComponentType>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ReactNode;
    retries?: number;
  } = {}
): React.LazyExoticComponent<T> {
  // Note: This would be used with React.lazy in the actual component
  // This is a helper to standardize lazy loading patterns
  const { retries = 3 } = options;

  return {
    $$typeof: Symbol.for('react.lazy'),
    _init: -1,
    _payload: {
      _status: -1,
      _result: () => dynamicImportWithRetry(importFn, retries),
    },
  } as unknown as React.LazyExoticComponent<T>;
}

// ============================================================================
// DEBOUNCE AND THROTTLE
// ============================================================================

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  }) as T;

  (debounced as T & { cancel: () => void }).cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced as T & { cancel: () => void };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(func: T, limit: number): T {
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan: number | null = null;

  return ((...args: Parameters<T>) => {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      if (lastFunc) clearTimeout(lastFunc);
      lastFunc = setTimeout(
        () => {
          if (Date.now() - (lastRan || 0) >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan)
      );
    }
  }) as T;
}

// ============================================================================
// REQUEST IDLE CALLBACK POLYFILL
// ============================================================================

type IdleCallbackHandle = number;
type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number }
): IdleCallbackHandle {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback for Safari and older browsers
  const start = Date.now();
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1) as unknown as IdleCallbackHandle;
}

/**
 * Cancel idle callback
 */
export function cancelIdleCallback(handle: IdleCallbackHandle): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

export default {
  createLazyLoader,
  prefetchRoute,
  preloadResource,
  getOptimizedImageSrc,
  generateBlurPlaceholder,
  addDnsPrefetch,
  addPreconnect,
  collectPerformanceMetrics,
  observeWebVitals,
  dynamicImportWithRetry,
  debounce,
  throttle,
  requestIdleCallback,
  cancelIdleCallback,
};
