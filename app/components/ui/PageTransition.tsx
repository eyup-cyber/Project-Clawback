'use client';

import gsap from 'gsap';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

// ============================================
// TYPES
// ============================================

type TransitionVariant =
  | 'fade'
  | 'slide'
  | 'slideUp'
  | 'slideDown'
  | 'wipe'
  | 'wipeUp'
  | 'wipeDown'
  | 'zoom'
  | 'reveal'
  | 'clip'
  | 'morph'
  | 'stack';

type TransitionDirection = 'forward' | 'backward' | 'none';

interface TransitionConfig {
  variant: TransitionVariant;
  duration: number;
  ease: string;
}

interface SharedElementConfig {
  id: string;
  element: HTMLElement;
  rect: DOMRect;
}

// ============================================
// ROUTE-BASED TRANSITION CONFIG
// ============================================

const ROUTE_TRANSITIONS: Record<string, TransitionConfig> = {
  // Homepage
  '/': { variant: 'fade', duration: DURATION.normal, ease: EASING.smooth },

  // Articles - use reveal for content-heavy pages
  '/articles': {
    variant: 'slideUp',
    duration: DURATION.medium,
    ease: EASING.expo,
  },
  '/articles/[slug]': {
    variant: 'reveal',
    duration: DURATION.slow,
    ease: EASING.expo,
  },

  // Dashboard - quick, professional transitions
  '/dashboard': {
    variant: 'fade',
    duration: DURATION.fast,
    ease: EASING.snappy,
  },
  '/dashboard/posts': {
    variant: 'slide',
    duration: DURATION.fast,
    ease: EASING.snappy,
  },
  '/dashboard/analytics': {
    variant: 'fade',
    duration: DURATION.fast,
    ease: EASING.smooth,
  },
  '/dashboard/settings': {
    variant: 'slideUp',
    duration: DURATION.fast,
    ease: EASING.snappy,
  },

  // Auth - clean, minimal
  '/auth': { variant: 'zoom', duration: DURATION.medium, ease: EASING.smooth },
  '/auth/login': {
    variant: 'zoom',
    duration: DURATION.medium,
    ease: EASING.smooth,
  },
  '/auth/register': {
    variant: 'zoom',
    duration: DURATION.medium,
    ease: EASING.smooth,
  },

  // Admin - professional
  '/admin': { variant: 'wipe', duration: DURATION.medium, ease: EASING.expo },

  // Static pages
  '/about': { variant: 'reveal', duration: DURATION.slow, ease: EASING.expo },
  '/contact': {
    variant: 'slideUp',
    duration: DURATION.medium,
    ease: EASING.smooth,
  },
};

const DEFAULT_TRANSITION: TransitionConfig = {
  variant: 'fade',
  duration: DURATION.normal,
  ease: EASING.smooth,
};

// ============================================
// SHARED ELEMENT CONTEXT
// ============================================

interface SharedElementContextType {
  registerElement: (id: string, element: HTMLElement) => void;
  unregisterElement: (id: string) => void;
  getElement: (id: string) => SharedElementConfig | undefined;
  prepareTransition: () => Map<string, SharedElementConfig>;
}

const SharedElementContext = createContext<SharedElementContextType | null>(null);

export function useSharedElement(id: string) {
  const context = useContext(SharedElementContext);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!context || !ref.current) return;

    context.registerElement(id, ref.current);

    return () => {
      context.unregisterElement(id);
    };
  }, [context, id]);

  return ref;
}

// ============================================
// PAGE TRANSITION PROVIDER
// ============================================

interface PageTransitionProviderProps {
  children: ReactNode;
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const sharedElements = useRef<Map<string, SharedElementConfig>>(new Map());

  const registerElement = useCallback((id: string, element: HTMLElement) => {
    sharedElements.current.set(id, {
      id,
      element,
      rect: element.getBoundingClientRect(),
    });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    sharedElements.current.delete(id);
  }, []);

  const getElement = useCallback((id: string) => {
    return sharedElements.current.get(id);
  }, []);

  const prepareTransition = useCallback(() => {
    // Update rects before transition
    sharedElements.current.forEach((config, id) => {
      config.rect = config.element.getBoundingClientRect();
      sharedElements.current.set(id, config);
    });
    return new Map(sharedElements.current);
  }, []);

  return (
    <SharedElementContext.Provider
      value={{
        registerElement,
        unregisterElement,
        getElement,
        prepareTransition,
      }}
    >
      {children}
    </SharedElementContext.Provider>
  );
}

// ============================================
// MAIN PAGE TRANSITION COMPONENT
// ============================================

interface PageTransitionProps {
  children: ReactNode;
  variant?: TransitionVariant;
  duration?: number;
  className?: string;
}

export default function PageTransition({
  children,
  variant,
  duration,
  className = '',
}: PageTransitionProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousPathRef = useRef(pathname);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [direction, setDirection] = useState<TransitionDirection>('none');

  // Get transition config based on route
  const getTransitionConfig = useCallback((path: string): TransitionConfig => {
    // Check for exact match
    if (ROUTE_TRANSITIONS[path]) {
      return ROUTE_TRANSITIONS[path];
    }

    // Check for pattern match (e.g., /articles/[slug])
    const patterns = Object.keys(ROUTE_TRANSITIONS).filter((k) => k.includes('['));
    for (const pattern of patterns) {
      const regex = new RegExp('^' + pattern.replace(/\[.*?\]/g, '[^/]+') + '$');
      if (regex.test(path)) {
        return ROUTE_TRANSITIONS[pattern];
      }
    }

    return DEFAULT_TRANSITION;
  }, []);

  // Determine transition direction based on route hierarchy
  const getDirection = useCallback((from: string, to: string): TransitionDirection => {
    const fromDepth = from.split('/').filter(Boolean).length;
    const toDepth = to.split('/').filter(Boolean).length;

    if (toDepth > fromDepth) return 'forward';
    if (toDepth < fromDepth) return 'backward';

    // Same depth - check alphabetically or use forward
    return from < to ? 'forward' : 'backward';
  }, []);

  // Handle route change
  useEffect(() => {
    if (pathname === previousPathRef.current || prefersReducedMotion()) {
      setDisplayedChildren(children);
      previousPathRef.current = pathname;
      return;
    }

    const newDirection = getDirection(previousPathRef.current, pathname);
    setDirection(newDirection);

    const config = variant
      ? {
          ...DEFAULT_TRANSITION,
          variant,
          duration: duration ?? DEFAULT_TRANSITION.duration,
        }
      : getTransitionConfig(pathname);

    const animDuration = getDuration(duration ?? config.duration);

    setIsAnimating(true);

    // Run exit animation
    const exitPromise = runExitAnimation(
      config.variant,
      containerRef.current,
      overlayRef.current,
      animDuration,
      newDirection
    );

    void exitPromise.then(() => {
      // Update content
      setDisplayedChildren(children);
      previousPathRef.current = pathname;

      // Scroll to top
      window.scrollTo(0, 0);

      // Run enter animation
      const enterPromise = runEnterAnimation(
        config.variant,
        containerRef.current,
        overlayRef.current,
        animDuration,
        newDirection
      );

      void enterPromise.then(() => {
        setIsAnimating(false);
        setDirection('none');
      });
    });
  }, [pathname, children, variant, duration, getTransitionConfig, getDirection]);

  return (
    <div className={`page-transition-wrapper relative ${className}`}>
      {/* Transition overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          backgroundColor: COLORS.primary,
          transform: 'scaleY(0)',
          transformOrigin: 'bottom',
        }}
        aria-hidden="true"
      />

      {/* Content container */}
      <div
        ref={containerRef}
        className={isAnimating ? 'pointer-events-none' : ''}
        style={{ willChange: isAnimating ? 'transform, opacity' : 'auto' }}
      >
        {displayedChildren}
      </div>
    </div>
  );
}

// ============================================
// EXIT ANIMATIONS
// ============================================

async function runExitAnimation(
  variant: TransitionVariant,
  container: HTMLDivElement | null,
  overlay: HTMLDivElement | null,
  duration: number,
  direction: TransitionDirection
): Promise<void> {
  if (!container) return;

  return new Promise((resolve) => {
    const directionMultiplier = direction === 'backward' ? -1 : 1;

    switch (variant) {
      case 'fade':
        gsap.to(container, {
          opacity: 0,
          duration,
          ease: EASING.smooth,
          onComplete: resolve,
        });
        break;

      case 'slide':
        gsap.to(container, {
          x: `${-100 * directionMultiplier}%`,
          opacity: 0,
          duration,
          ease: EASING.expo,
          onComplete: resolve,
        });
        break;

      case 'slideUp':
        gsap.to(container, {
          y: '-50px',
          opacity: 0,
          duration,
          ease: EASING.expo,
          onComplete: resolve,
        });
        break;

      case 'slideDown':
        gsap.to(container, {
          y: '50px',
          opacity: 0,
          duration,
          ease: EASING.expo,
          onComplete: resolve,
        });
        break;

      case 'wipe':
      case 'wipeUp':
        if (overlay) {
          gsap.to(overlay, {
            scaleY: 1,
            duration,
            ease: EASING.expo,
            transformOrigin: variant === 'wipeUp' ? 'top' : 'bottom',
            onComplete: resolve,
          });
        } else {
          resolve();
        }
        break;

      case 'wipeDown':
        if (overlay) {
          gsap.to(overlay, {
            scaleY: 1,
            duration,
            ease: EASING.expo,
            transformOrigin: 'top',
            onComplete: resolve,
          });
        } else {
          resolve();
        }
        break;

      case 'zoom':
        gsap.to(container, {
          scale: 0.95,
          opacity: 0,
          duration,
          ease: EASING.smooth,
          onComplete: resolve,
        });
        break;

      case 'reveal':
        gsap.to(container, {
          clipPath: 'inset(0 0 100% 0)',
          duration,
          ease: EASING.expo,
          onComplete: resolve,
        });
        break;

      case 'clip':
        gsap.to(container, {
          clipPath: `inset(0 ${direction === 'forward' ? '100%' : '0'} 0 ${direction === 'backward' ? '100%' : '0'})`,
          duration,
          ease: EASING.expo,
          onComplete: resolve,
        });
        break;

      case 'morph':
        gsap.to(container, {
          scale: 0.9,
          borderRadius: '20px',
          opacity: 0,
          duration,
          ease: EASING.smooth,
          onComplete: resolve,
        });
        break;

      case 'stack':
        gsap.to(container, {
          y: '-100%',
          scale: 0.9,
          duration,
          ease: EASING.expo,
          onComplete: resolve,
        });
        break;

      default:
        resolve();
    }
  });
}

// ============================================
// ENTER ANIMATIONS
// ============================================

async function runEnterAnimation(
  variant: TransitionVariant,
  container: HTMLDivElement | null,
  overlay: HTMLDivElement | null,
  duration: number,
  direction: TransitionDirection
): Promise<void> {
  if (!container) return;

  return new Promise((resolve) => {
    const directionMultiplier = direction === 'backward' ? -1 : 1;

    switch (variant) {
      case 'fade':
        gsap.fromTo(
          container,
          { opacity: 0 },
          {
            opacity: 1,
            duration,
            ease: EASING.smooth,
            onComplete: resolve,
          }
        );
        break;

      case 'slide':
        gsap.fromTo(
          container,
          { x: `${100 * directionMultiplier}%`, opacity: 0 },
          {
            x: '0%',
            opacity: 1,
            duration,
            ease: EASING.expo,
            onComplete: resolve,
          }
        );
        break;

      case 'slideUp':
        gsap.fromTo(
          container,
          { y: '50px', opacity: 0 },
          {
            y: '0',
            opacity: 1,
            duration,
            ease: EASING.expo,
            onComplete: resolve,
          }
        );
        break;

      case 'slideDown':
        gsap.fromTo(
          container,
          { y: '-50px', opacity: 0 },
          {
            y: '0',
            opacity: 1,
            duration,
            ease: EASING.expo,
            onComplete: resolve,
          }
        );
        break;

      case 'wipe':
      case 'wipeUp':
      case 'wipeDown':
        if (overlay) {
          gsap.to(overlay, {
            scaleY: 0,
            duration,
            ease: EASING.expo,
            transformOrigin: variant === 'wipeDown' ? 'bottom' : 'top',
            delay: 0.1,
            onComplete: resolve,
          });
        } else {
          resolve();
        }
        break;

      case 'zoom':
        gsap.fromTo(
          container,
          { scale: 1.05, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration,
            ease: EASING.smooth,
            onComplete: resolve,
          }
        );
        break;

      case 'reveal':
        gsap.fromTo(
          container,
          { clipPath: 'inset(100% 0 0 0)' },
          {
            clipPath: 'inset(0% 0 0 0)',
            duration,
            ease: EASING.expo,
            onComplete: resolve,
          }
        );
        break;

      case 'clip':
        gsap.fromTo(
          container,
          {
            clipPath: `inset(0 ${direction === 'backward' ? '100%' : '0'} 0 ${direction === 'forward' ? '100%' : '0'})`,
          },
          {
            clipPath: 'inset(0 0% 0 0%)',
            duration,
            ease: EASING.expo,
            onComplete: resolve,
          }
        );
        break;

      case 'morph':
        gsap.fromTo(
          container,
          { scale: 1.1, borderRadius: '20px', opacity: 0 },
          {
            scale: 1,
            borderRadius: '0px',
            opacity: 1,
            duration,
            ease: EASING.smooth,
            onComplete: resolve,
          }
        );
        break;

      case 'stack':
        gsap.fromTo(
          container,
          { y: '100%', scale: 0.9 },
          {
            y: '0%',
            scale: 1,
            duration,
            ease: EASING.expo,
            onComplete: resolve,
          }
        );
        break;

      default:
        resolve();
    }
  });
}

// ============================================
// TRANSITION WRAPPER (for individual elements)
// ============================================

interface TransitionWrapperProps {
  children: ReactNode;
  show: boolean;
  animation?: 'fade' | 'slideUp' | 'slideDown' | 'scale' | 'slideLeft' | 'slideRight' | 'blur';
  duration?: number;
  delay?: number;
  className?: string;
  onExitComplete?: () => void;
}

export function TransitionWrapper({
  children,
  show,
  animation = 'fade',
  duration = DURATION.quick,
  delay = 0,
  className = '',
  onExitComplete,
}: TransitionWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) {
      setShouldRender(show);
      return;
    }

    const animDuration = getDuration(duration);

    if (show) {
      setShouldRender(true);

      const animations = {
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 } },
        slideDown: { from: { opacity: 0, y: -20 }, to: { opacity: 1, y: 0 } },
        slideLeft: { from: { opacity: 0, x: 20 }, to: { opacity: 1, x: 0 } },
        slideRight: { from: { opacity: 0, x: -20 }, to: { opacity: 1, x: 0 } },
        scale: {
          from: { opacity: 0, scale: 0.95 },
          to: { opacity: 1, scale: 1 },
        },
        blur: {
          from: { opacity: 0, filter: 'blur(10px)' },
          to: { opacity: 1, filter: 'blur(0px)' },
        },
      };

      const anim = animations[animation];
      gsap.fromTo(ref.current, anim.from, {
        ...anim.to,
        duration: animDuration,
        delay,
        ease: EASING.snappy,
      });
    } else {
      const animations = {
        fade: { opacity: 0 },
        slideUp: { opacity: 0, y: -20 },
        slideDown: { opacity: 0, y: 20 },
        slideLeft: { opacity: 0, x: -20 },
        slideRight: { opacity: 0, x: 20 },
        scale: { opacity: 0, scale: 0.95 },
        blur: { opacity: 0, filter: 'blur(5px)' },
      };

      gsap.to(ref.current, {
        ...animations[animation],
        duration: animDuration * 0.6,
        ease: EASING.smooth,
        onComplete: () => {
          setShouldRender(false);
          onExitComplete?.();
        },
      });
    }
  }, [show, animation, duration, delay, onExitComplete]);

  if (!shouldRender) return null;

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ============================================
// STAGGERED TRANSITION
// ============================================

interface StaggeredTransitionProps {
  children: ReactNode;
  show: boolean;
  stagger?: number;
  animation?: 'fade' | 'slideUp' | 'scale';
  duration?: number;
  className?: string;
}

export function StaggeredTransition({
  children,
  show,
  stagger = 0.05,
  animation = 'slideUp',
  duration = DURATION.quick,
  className = '',
}: StaggeredTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) {
      setShouldRender(show);
      return;
    }

    const children = ref.current.children;
    if (!children.length) return;

    const animDuration = getDuration(duration);

    if (show) {
      setShouldRender(true);

      const animations = {
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 } },
        scale: {
          from: { opacity: 0, scale: 0.9 },
          to: { opacity: 1, scale: 1 },
        },
      };

      const anim = animations[animation];
      gsap.fromTo(children, anim.from, {
        ...anim.to,
        duration: animDuration,
        stagger,
        ease: EASING.snappy,
      });
    } else {
      gsap.to(children, {
        opacity: 0,
        y: animation === 'slideUp' ? -10 : 0,
        scale: animation === 'scale' ? 0.95 : 1,
        duration: animDuration * 0.5,
        stagger: stagger * 0.5,
        ease: EASING.smooth,
        onComplete: () => setShouldRender(false),
      });
    }
  }, [show, animation, duration, stagger]);

  if (!shouldRender) return null;

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ============================================
// LINK WITH TRANSITION
// ============================================

interface TransitionLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  transition?: TransitionVariant;
  onClick?: () => void;
}

export function TransitionLink({
  href,
  children,
  className = '',
  transition,
  onClick,
}: TransitionLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();

    // Store transition preference
    if (transition && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pageTransition', transition);
    }

    router.push(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
