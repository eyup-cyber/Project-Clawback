import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';

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
  ref: RefObject<HTMLElement>,
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverOptions = {}
) => {
  useEffect(() => {
    if (!ref.current) return;

    const { threshold = 0.2, rootMargin = '0px', triggerOnce = false } = options;
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
  }, [ref, callback, options.threshold, options.rootMargin, options.triggerOnce]);
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
    updates.forEach(update => update());
  });
};

// ============================================
// CLEANUP ANIMATIONS
// ============================================

export const cleanupAnimations = (targets: gsap.TweenTarget | gsap.TweenTarget[]) => {
  gsap.killTweensOf(targets);
  if (Array.isArray(targets)) {
    targets.forEach(target => {
      if (target instanceof HTMLElement) {
        gsap.set(target, { clearProps: 'all' });
      }
    });
  } else if (targets instanceof HTMLElement) {
    gsap.set(targets, { clearProps: 'all' });
  }
};




