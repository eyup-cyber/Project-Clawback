import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASING, DURATION, SCROLL_TRIGGER, prefersReducedMotion, getDuration } from './gsap-config';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================
// PARALLAX LAYERS WITH DEPTH CALCULATION
// ============================================

export interface ParallaxOptions {
  speed?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  depth?: number; // 0-1, where 1 is foreground and 0 is background
}

export const createParallaxLayer = (
  element: gsap.TweenTarget,
  options: ParallaxOptions = {}
) => {
  if (prefersReducedMotion()) return;

  const {
    speed = 0.5,
    direction = 'up',
    depth = 0.5,
  } = options;

  const depthMultiplier = 1 - depth; // Invert so higher depth = more movement
  const actualSpeed = speed * depthMultiplier;

  const transformMap = {
    up: { y: `+=${actualSpeed * 100}` },
    down: { y: `-=${actualSpeed * 100}` },
    left: { x: `+=${actualSpeed * 100}` },
    right: { x: `-=${actualSpeed * 100}` },
  };

  return gsap.to(element, {
    ...transformMap[direction],
    ease: EASING.none,
    scrollTrigger: {
      trigger: element,
      start: SCROLL_TRIGGER.start.top,
      end: SCROLL_TRIGGER.end.bottom,
      scrub: true,
    },
  });
};

// ============================================
// SCROLL-TRIGGERED REVEALS
// ============================================

export interface RevealOptions {
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';
  distance?: number;
  delay?: number;
  stagger?: number;
}

export const createScrollReveal = (
  elements: gsap.TweenTarget | gsap.TweenTarget[],
  options: RevealOptions = {}
) => {
  if (prefersReducedMotion()) {
    gsap.set(elements, { opacity: 1, clearProps: 'all' });
    return;
  }

  const {
    direction = 'up',
    distance = 50,
    delay = 0,
    stagger = 0,
  } = options;

  const fromProps: Record<string, gsap.TweenVars> = {
    up: { opacity: 0, y: distance },
    down: { opacity: 0, y: -distance },
    left: { opacity: 0, x: distance },
    right: { opacity: 0, x: -distance },
    fade: { opacity: 0 },
    scale: { opacity: 0, scale: 0.8 },
  };

  const toProps: gsap.TweenVars = {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    duration: getDuration(DURATION.medium),
    ease: EASING.snappy,
    delay,
    stagger: stagger > 0 ? stagger : undefined,
    scrollTrigger: {
      trigger: Array.isArray(elements) ? elements[0] : elements,
      start: SCROLL_TRIGGER.start.nearBottom,
      toggleActions: SCROLL_TRIGGER.actions.playReverse,
    },
  };

  gsap.fromTo(elements, fromProps[direction], toProps);
};

// ============================================
// SCROLL-LINKED ROTATIONS AND TRANSFORMS
// ============================================

export const createScrollRotation = (
  element: gsap.TweenTarget,
  rotation: number = 360
) => {
  if (prefersReducedMotion()) return;

  return gsap.to(element, {
    rotation,
    ease: EASING.none,
    scrollTrigger: {
      trigger: element,
      start: SCROLL_TRIGGER.start.top,
      end: SCROLL_TRIGGER.end.bottom,
      scrub: true,
    },
  });
};

export const createScrollScale = (
  element: gsap.TweenTarget,
  fromScale: number = 0.8,
  toScale: number = 1
) => {
  if (prefersReducedMotion()) {
    gsap.set(element, { scale: toScale });
    return;
  }

  return gsap.fromTo(
    element,
    { scale: fromScale },
    {
      scale: toScale,
      ease: EASING.smooth,
      scrollTrigger: {
        trigger: element,
        start: SCROLL_TRIGGER.start.center,
        end: SCROLL_TRIGGER.end.center,
        scrub: true,
      },
    }
  );
};

// ============================================
// PROGRESS INDICATORS
// ============================================

export const createScrollProgress = (
  element: HTMLElement,
  direction: 'horizontal' | 'vertical' = 'horizontal'
) => {
  if (prefersReducedMotion()) return;

  const isHorizontal = direction === 'horizontal';

  return gsap.to(element, {
    [isHorizontal ? 'scaleX' : 'scaleY']: 1,
    ease: EASING.none,
    scrollTrigger: {
      trigger: 'body',
      start: SCROLL_TRIGGER.start.top,
      end: SCROLL_TRIGGER.end.bottom,
      scrub: true,
    },
  });
};

export const createSectionProgress = (
  progressBar: HTMLElement,
  section: HTMLElement
) => {
  if (prefersReducedMotion()) return;

  return gsap.to(progressBar, {
    scaleX: 1,
    ease: EASING.none,
    scrollTrigger: {
      trigger: section,
      start: SCROLL_TRIGGER.start.top,
      end: SCROLL_TRIGGER.end.bottom,
      scrub: true,
    },
  });
};

// ============================================
// STICKY ELEMENTS WITH TRANSFORM ANIMATIONS
// ============================================

export interface StickyOptions {
  pin?: boolean;
  pinSpacing?: boolean;
  transform?: gsap.TweenVars;
  start?: string;
  end?: string;
}

export const createStickyElement = (
  element: gsap.TweenTarget,
  options: StickyOptions = {}
) => {
  if (prefersReducedMotion()) return;

  const {
    pin = true,
    pinSpacing = true,
    transform,
    start = SCROLL_TRIGGER.start.top,
    end = SCROLL_TRIGGER.end.bottom,
  } = options;

  const scrollTrigger: ScrollTrigger.Vars = {
    trigger: element,
    start,
    end,
    pin,
    pinSpacing,
  };

  if (transform) {
    return gsap.to(element, {
      ...transform,
      ease: EASING.smooth,
      scrollTrigger,
    });
  }

  return ScrollTrigger.create(scrollTrigger);
};

// ============================================
// MOMENTUM-BASED PARALLAX
// ============================================

export const createMomentumParallax = (
  element: gsap.TweenTarget,
  intensity: number = 0.5
) => {
  if (prefersReducedMotion()) return;

  let lastScrollY = window.scrollY;
  let velocity = 0;
  let targetY = 0;

  const update = () => {
    const currentScrollY = window.scrollY;
    velocity = currentScrollY - lastScrollY;
    lastScrollY = currentScrollY;

    targetY += velocity * intensity;
    targetY *= 0.9; // Damping

    gsap.to(element, {
      y: targetY,
      duration: getDuration(DURATION.quick),
      ease: EASING.smooth,
    });

    requestAnimationFrame(update);
  };

  update();
};

// ============================================
// SCROLL-SNAPPED SECTIONS
// ============================================

export const createScrollSnap = (
  container: HTMLElement,
  snapPoints: number[] = []
) => {
  if (prefersReducedMotion()) return;

  const snapConfig: ScrollTrigger.SnapInstanceVars = {
    snapTo: snapPoints.length > 0 
      ? snapPoints.map(point => point / 100) // Convert to 0-1 range
      : 1 / (container.children.length || 1),
    duration: { min: 0.2, max: 0.6 },
    delay: 0,
    ease: EASING.smooth,
  };

  return ScrollTrigger.create({
    trigger: container,
    start: SCROLL_TRIGGER.start.top,
    end: SCROLL_TRIGGER.end.bottom,
    snap: snapConfig,
  });
};




