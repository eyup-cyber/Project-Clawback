import gsap from 'gsap';
import { type RefObject, useEffect } from 'react';

// ============================================
// WILL-CHANGE OPTIMIZATION
// ============================================

export const useWillChange = (
  ref: RefObject<HTMLElement>,
  properties: string[] = ['transform', 'opacity'],
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!ref.current || !enabled) return;

    const element = ref.current;
    const originalWillChange = element.style.willChange;

    element.style.willChange = properties.join(', ');

    return () => {
      element.style.willChange = originalWillChange;
    };
  }, [ref, properties, enabled]);
};

// ============================================
// GPU ACCELERATION UTILITIES
// ============================================

export const enableGPUAcceleration = (element: HTMLElement) => {
  element.style.transform = 'translateZ(0)';
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
};

export const disableGPUAcceleration = (element: HTMLElement) => {
  element.style.transform = '';
  element.style.backfaceVisibility = '';
  element.style.perspective = '';
};

// ============================================
// ANIMATION FRAME THROTTLING
// ============================================

export const throttle = (fn: Function, delay: number) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

export const throttleRAF = (fn: Function) => {
  let rafId: number | null = null;
  return (...args: any[]) => {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn(...args);
        rafId = null;
      });
    }
  };
};

// ============================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ============================================

export interface IntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useIntersectionObserver = (
  ref: RefObject<HTMLElement | null>,
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverOptions = {}
) => {
  const { threshold = 0.2, rootMargin = '0px', triggerOnce = false } = options;

  useEffect(() => {
    if (!ref.current) return;

    let hasTriggered = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback(true);
            if (triggerOnce && !hasTriggered) {
              hasTriggered = true;
              observer.disconnect();
            }
          } else {
            if (!triggerOnce) {
              callback(false);
            }
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, callback, threshold, rootMargin, triggerOnce]);
};

// ============================================
// LAZY ANIMATION LOADING
// ============================================

export const lazyAnimate = (
  element: HTMLElement,
  animation: () => gsap.core.Tween | gsap.core.Timeline,
  options: IntersectionObserverOptions = {}
) => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animation();
          observer.disconnect();
        }
      });
    },
    {
      threshold: options.threshold || 0.2,
      rootMargin: options.rootMargin || '0px',
    }
  );

  observer.observe(element);

  return () => observer.disconnect();
};

// ============================================
// PERFORMANCE MONITORING
// ============================================

export const measureAnimationPerformance = (
  animationFn: () => void,
  onComplete?: (fps: number, duration: number) => void
) => {
  const startTime = performance.now();
  let frameCount = 0;
  const lastFrameTime = performance.now();

  const measureFrame = () => {
    frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastFrameTime;

    if (elapsed >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      const duration = currentTime - startTime;
      onComplete?.(fps, duration);
      return;
    }

    requestAnimationFrame(measureFrame);
  };

  animationFn();
  requestAnimationFrame(measureFrame);
};

// ============================================
// BATCH DOM UPDATES
// ============================================

export const batchDOMUpdates = (updates: Array<() => void>) => {
  requestAnimationFrame(() => {
    updates.forEach((update) => update());
  });
};

// ============================================
// CLEANUP ANIMATIONS
// ============================================

export const cleanupAnimations = (targets: gsap.TweenTarget | gsap.TweenTarget[]) => {
  gsap.killTweensOf(targets);
  if (Array.isArray(targets)) {
    targets.forEach((target) => {
      if (target instanceof HTMLElement) {
        gsap.set(target, { clearProps: 'all' });
      }
    });
  } else if (targets instanceof HTMLElement) {
    gsap.set(targets, { clearProps: 'all' });
  }
};

// ============================================
// DEBOUNCE UTILITY
// ============================================

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// ============================================
// SCROLL PERFORMANCE
// ============================================

export const usePassiveScroll = (callback: (scrollY: number) => void, throttleMs: number = 16) => {
  useEffect(() => {
    let lastScrollY = 0;
    let ticking = false;

    const handleScroll = () => {
      lastScrollY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(() => {
          callback(lastScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, throttleMs]);
};

// ============================================
// CONTAINER QUERIES FOR ANIMATIONS
// ============================================

export const useContainerQuery = (
  ref: RefObject<HTMLElement>,
  breakpoints: { [key: string]: number }
): string | null => {
  const [activeBreakpoint, setActiveBreakpoint] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      let active: string | null = null;

      Object.entries(breakpoints)
        .sort(([, a], [, b]) => a - b)
        .forEach(([name, minWidth]) => {
          if (width >= minWidth) {
            active = name;
          }
        });

      setActiveBreakpoint(active);
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, breakpoints]);

  return activeBreakpoint;
};

import { useState } from 'react';

// ============================================
// PERFORMANCE HOOKS
// ============================================

/**
 * Hook to detect if device prefers reduced data
 */
export const usePrefersReducedData = (): boolean => {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (navigator as any).connection?.saveData === true;
  });

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (!connection) return;

    const handleChange = () => {
      setPrefersReduced(connection.saveData === true);
    };

    connection.addEventListener('change', handleChange);
    return () => connection.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
};

/**
 * Hook to detect low power mode / battery saver
 */
export const useLowPowerMode = (): boolean => {
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    if (!('getBattery' in navigator)) return;

    const checkBattery = async () => {
      try {
        const battery = await (navigator as any).getBattery();
        const updateStatus = () => {
          // Consider low power if charging is off and level is below 20%
          setIsLowPower(!battery.charging && battery.level < 0.2);
        };

        updateStatus();
        battery.addEventListener('chargingchange', updateStatus);
        battery.addEventListener('levelchange', updateStatus);

        return () => {
          battery.removeEventListener('chargingchange', updateStatus);
          battery.removeEventListener('levelchange', updateStatus);
        };
      } catch {
        // Battery API not supported or blocked
      }
    };

    void checkBattery();
  }, []);

  return isLowPower;
};

/**
 * Hook to get animation quality setting based on device capabilities
 */
export type AnimationQuality = 'high' | 'medium' | 'low' | 'minimal';

export const useAnimationQuality = (): AnimationQuality => {
  const [quality, setQuality] = useState<AnimationQuality>('high');
  const prefersReducedData = usePrefersReducedData();
  const isLowPower = useLowPowerMode();

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setQuality('minimal');
      return;
    }

    if (isLowPower || prefersReducedData) {
      setQuality('low');
      return;
    }

    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;

    // Check device memory if available
    const memory = (navigator as any).deviceMemory || 4;

    if (cores <= 2 || memory <= 2) {
      setQuality('low');
    } else if (cores <= 4 || memory <= 4) {
      setQuality('medium');
    } else {
      setQuality('high');
    }
  }, [prefersReducedData, isLowPower]);

  return quality;
};

// ============================================
// FRAME BUDGET MONITORING
// ============================================

export class FrameBudgetMonitor {
  private targetFPS: number;
  private frameBudget: number;
  private lastFrameTime: number = 0;
  private frameDrops: number = 0;
  private callback?: (dropped: boolean, fps: number) => void;

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.frameBudget = 1000 / targetFPS;
  }

  start(callback?: (dropped: boolean, fps: number) => void) {
    this.callback = callback;
    this.lastFrameTime = performance.now();
    this.tick();
  }

  private tick = () => {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    const dropped = frameTime > this.frameBudget * 1.5;

    if (dropped) {
      this.frameDrops++;
    }

    const fps = Math.round(1000 / frameTime);
    this.callback?.(dropped, fps);

    this.lastFrameTime = now;
    requestAnimationFrame(this.tick);
  };

  getDroppedFrames() {
    return this.frameDrops;
  }
}

// ============================================
// COMPOSITE LAYER MANAGEMENT
// ============================================

/**
 * Force element to its own composite layer for better GPU acceleration
 */
export const promoteToLayer = (element: HTMLElement) => {
  element.style.willChange = 'transform';
  element.style.transform = 'translateZ(0)';
  element.style.isolation = 'isolate';
};

/**
 * Remove layer promotion to free GPU memory
 */
export const demoteFromLayer = (element: HTMLElement) => {
  element.style.willChange = 'auto';
  element.style.transform = '';
  element.style.isolation = '';
};

/**
 * Temporarily promote element for animation, then demote
 */
export const animateWithLayerPromotion = (
  element: HTMLElement,
  animation: () => gsap.core.Tween | gsap.core.Timeline
) => {
  promoteToLayer(element);
  const tween = animation();

  tween.eventCallback('onComplete', () => {
    // Slight delay to ensure animation is fully complete
    setTimeout(() => demoteFromLayer(element), 100);
  });

  return tween;
};
