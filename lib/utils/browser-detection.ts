// ============================================
// BROWSER DETECTION & FEATURE DETECTION
// ============================================

export interface BrowserInfo {
  name: string;
  version: string;
  isMobile: boolean;
  isTouch: boolean;
  supportsGSAP: boolean;
  supportsIntersectionObserver: boolean;
  supportsCSSVariables: boolean;
  supportsTransform3D: boolean;
}

/**
 * Detect browser and capabilities
 */
export const detectBrowser = (): BrowserInfo => {
  if (typeof window === 'undefined') {
    return {
      name: 'unknown',
      version: '0',
      isMobile: false,
      isTouch: false,
      supportsGSAP: false,
      supportsIntersectionObserver: false,
      supportsCSSVariables: false,
      supportsTransform3D: false,
    };
  }

  const ua = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Browser detection
  let browserName = 'unknown';
  let browserVersion = '0';

  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browserName = 'chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : '0';
  } else if (ua.includes('Firefox')) {
    browserName = 'firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : '0';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browserName = 'safari';
    const match = ua.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : '0';
  } else if (ua.includes('Edg')) {
    browserName = 'edge';
    const match = ua.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : '0';
  }

  // Feature detection
  const supportsGSAP = typeof window.gsap !== 'undefined';
  const supportsIntersectionObserver = 'IntersectionObserver' in window;
  const supportsCSSVariables = CSS.supports('color', 'var(--test)');
  const supportsTransform3D = CSS.supports('transform', 'translate3d(0,0,0)');

  return {
    name: browserName,
    version: browserVersion,
    isMobile,
    isTouch,
    supportsGSAP,
    supportsIntersectionObserver,
    supportsCSSVariables,
    supportsTransform3D,
  };
};

/**
 * Check if a CSS feature is supported
 */
export const supportsCSSFeature = (feature: string, value: string): boolean => {
  if (typeof window === 'undefined' || !CSS.supports) return false;
  return CSS.supports(feature, value);
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = () => {
  if (typeof window === 'undefined' || !window.performance) {
    return {
      connection: null,
      memory: null,
      devicePixelRatio: 1,
    };
  }

  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  const memory = nav.deviceMemory || null;

  return {
    connection,
    memory,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
};

/**
 * Check if device is low-end
 */
export const isLowEndDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const metrics = getPerformanceMetrics();
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Check memory
  if (metrics.memory && metrics.memory < 4) return true;

  // Check connection
  if (metrics.connection) {
    const effectiveType = metrics.connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return true;
  }

  // Check device pixel ratio (high DPI might indicate better device, but also more pixels to render)
  if (metrics.devicePixelRatio > 2 && isMobile) return true;

  return false;
};

/**
 * Optimize animations based on device capabilities
 */
export const shouldReduceAnimations = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check user preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }

  // Check if low-end device
  if (isLowEndDevice()) {
    return true;
  }

  return false;
};
