'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { EASING, DURATION, COLORS, prefersReducedMotion, getDuration } from '@/lib/animations/gsap-config';

interface PageTransitionProps {
  children: ReactNode;
  variant?: 'fade' | 'slide' | 'wipe' | 'zoom' | 'reveal';
  duration?: number;
}

export default function PageTransition({
  children,
  variant = 'fade',
  duration = DURATION.medium,
}: PageTransitionProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [previousPathname, setPreviousPathname] = useState(pathname);

  // Always show children directly when reduced motion is preferred
  const reducedMotion = prefersReducedMotion();

  // Track displayed children directly when not animating
  const effectiveChildren = reducedMotion || !isAnimating ? children : displayChildren;

  useEffect(() => {
    // Skip animation on initial load or if reduced motion
    if (previousPathname === pathname || reducedMotion) {
      return;
    }

    // Animation state management - intentional synchronous setState in effect
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for page transition animation
    setPreviousPathname(pathname);
     
    setIsAnimating(true);

    const animationDuration = getDuration(duration);

    // Exit animation
    const exitAnimation = getExitAnimation(variant, containerRef.current, overlayRef.current, animationDuration);

    void exitAnimation.then(() => {
      setDisplayChildren(children);

      // Enter animation
      const enterAnimation = getEnterAnimation(variant, containerRef.current, overlayRef.current, animationDuration);

      void enterAnimation.then(() => {
        setIsAnimating(false);
      });
    });

  }, [pathname, children, variant, duration, previousPathname, reducedMotion]);

  return (
    <div className="page-transition-wrapper relative">
      {/* Overlay for wipe/reveal transitions */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ 
          background: COLORS.primary,
          transform: 'scaleY(0)',
          transformOrigin: 'bottom',
        }}
        aria-hidden="true"
      />
      
      {/* Content container */}
      <div
        ref={containerRef}
        className={isAnimating ? 'pointer-events-none' : ''}
      >
        {effectiveChildren}
      </div>
    </div>
  );
}

// Exit animations
async function getExitAnimation(
  variant: string,
  container: HTMLDivElement | null,
  overlay: HTMLDivElement | null,
  duration: number
): Promise<void> {
  if (!container) return Promise.resolve();

  return new Promise((resolve) => {
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
          x: '-100%',
          opacity: 0,
          duration,
          ease: EASING.expo,
          onComplete: resolve,
        });
        break;

      case 'wipe':
        if (overlay) {
          gsap.to(overlay, {
            scaleY: 1,
            duration,
            ease: EASING.expo,
            transformOrigin: 'bottom',
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

      default:
        resolve();
    }
  });
}

// Enter animations
async function getEnterAnimation(
  variant: string,
  container: HTMLDivElement | null,
  overlay: HTMLDivElement | null,
  duration: number
): Promise<void> {
  if (!container) return Promise.resolve();

  return new Promise((resolve) => {
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
          { x: '100%', opacity: 0 },
          {
            x: '0%',
            opacity: 1,
            duration,
            ease: EASING.expo,
            onComplete: resolve,
          }
        );
        break;

      case 'wipe':
        if (overlay) {
          // Scroll to top
          window.scrollTo(0, 0);
          
          gsap.to(overlay, {
            scaleY: 0,
            duration,
            ease: EASING.expo,
            transformOrigin: 'top',
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
        if (overlay) {
          window.scrollTo(0, 0);
          
          gsap.to(overlay, {
            scaleY: 0,
            duration,
            ease: EASING.expo,
            transformOrigin: 'bottom',
            delay: 0.1,
            onComplete: resolve,
          });
        } else {
          resolve();
        }
        break;

      default:
        resolve();
    }
  });
}

// Simpler transition component for specific elements
interface TransitionWrapperProps {
  children: ReactNode;
  show: boolean;
  animation?: 'fade' | 'slideUp' | 'slideDown' | 'scale' | 'slideLeft' | 'slideRight';
  duration?: number;
  delay?: number;
  className?: string;
}

export function TransitionWrapper({
  children,
  show,
  animation = 'fade',
  duration = DURATION.quick,
  delay = 0,
  className = '',
}: TransitionWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Track whether we're in exit animation - only false after exit completes
  const [isExiting, setIsExiting] = useState(false);

  // When reduced motion is preferred, sync directly with show
  const reducedMotion = prefersReducedMotion();
  // Show element if: show is true OR we're in exit animation (still visible during fade out)
  const shouldRender = reducedMotion ? show : (show || isExiting);

  useEffect(() => {
    if (!ref.current || reducedMotion) {
      return;
    }

    const animDuration = getDuration(duration);

    if (show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for enter animation coordination
      setIsExiting(false);
      const animations = {
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 } },
        slideDown: { from: { opacity: 0, y: -20 }, to: { opacity: 1, y: 0 } },
        slideLeft: { from: { opacity: 0, x: 20 }, to: { opacity: 1, x: 0 } },
        slideRight: { from: { opacity: 0, x: -20 }, to: { opacity: 1, x: 0 } },
        scale: { from: { opacity: 0, scale: 0.95 }, to: { opacity: 1, scale: 1 } },
      };

      const anim = animations[animation];
      gsap.fromTo(ref.current, anim.from, {
        ...anim.to,
        duration: animDuration,
        delay,
        ease: EASING.snappy,
      });
    } else {
       
      setIsExiting(true);
      const animations = {
        fade: { opacity: 0 },
        slideUp: { opacity: 0, y: -20 },
        slideDown: { opacity: 0, y: 20 },
        slideLeft: { opacity: 0, x: -20 },
        slideRight: { opacity: 0, x: 20 },
        scale: { opacity: 0, scale: 0.95 },
      };

      gsap.to(ref.current, {
        ...animations[animation],
        duration: animDuration,
        ease: EASING.smooth,
        onComplete: () => setIsExiting(false),
      });
    }
  }, [show, animation, duration, delay, reducedMotion]);

  if (!shouldRender) return null;

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// Staggered children transition
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
  // Track whether we're in exit animation
  const [isExiting, setIsExiting] = useState(false);

  // When reduced motion is preferred, sync directly with show
  const reducedMotion = prefersReducedMotion();
  // Show element if: show is true OR we're in exit animation
  const shouldRender = reducedMotion ? show : (show || isExiting);

  useEffect(() => {
    if (!ref.current || reducedMotion) {
      return;
    }

    const childElements = ref.current.children;
    if (!childElements.length) return;

    const animDuration = getDuration(duration);

    if (show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for enter animation coordination
      setIsExiting(false);

      const animations = {
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 } },
        scale: { from: { opacity: 0, scale: 0.9 }, to: { opacity: 1, scale: 1 } },
      };

      const anim = animations[animation];
      gsap.fromTo(childElements, anim.from, {
        ...anim.to,
        duration: animDuration,
        stagger,
        ease: EASING.snappy,
      });
    } else {
       
      setIsExiting(true);
      gsap.to(childElements, {
        opacity: 0,
        y: animation === 'slideUp' ? -10 : 0,
        scale: animation === 'scale' ? 0.95 : 1,
        duration: animDuration * 0.5,
        stagger: stagger * 0.5,
        ease: EASING.smooth,
        onComplete: () => setIsExiting(false),
      });
    }
  }, [show, animation, duration, stagger, reducedMotion]);

  if (!shouldRender) return null;

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}






