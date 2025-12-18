import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================
// EASING PRESETS
// ============================================
export const EASING = {
  // Smooth, natural movements
  smooth: 'power2.out',
  smoothIn: 'power2.in',
  smoothInOut: 'power2.inOut',

  // Snappy, responsive movements
  snappy: 'power3.out',
  snappyIn: 'power3.in',
  snappyInOut: 'power3.inOut',

  // Dramatic, expressive movements
  dramatic: 'power4.out',
  dramaticIn: 'power4.in',
  dramaticInOut: 'power4.inOut',

  // Bouncy, playful movements
  bounce: 'back.out(1.7)',
  bounceIn: 'back.in(1.7)',
  bounceInOut: 'back.inOut(1.7)',

  // Elastic, springy movements
  elastic: 'elastic.out(1, 0.3)',
  elasticIn: 'elastic.in(1, 0.3)',
  elasticInOut: 'elastic.inOut(1, 0.3)',

  // Linear for scrub animations
  linear: 'none',

  // Expo for dramatic reveals
  expo: 'expo.out',
  expoIn: 'expo.in',
  expoInOut: 'expo.inOut',

  // Circ for subtle curves
  circ: 'circ.out',
  circIn: 'circ.in',
  circInOut: 'circ.inOut',

  // Custom easing for unique movements
  liquid: 'power1.inOut', // Smooth, fluid motion
  magnetic: 'power2.inOut', // Magnetic pull effect
  morph: 'sine.inOut', // Morphing shapes
  trail: 'power1.out', // Particle trails
} as const;

// ============================================
// DURATION PRESETS (in seconds)
// ============================================
export const DURATION = {
  instant: 0.1,
  fast: 0.2,
  quick: 0.3,
  normal: 0.5,
  medium: 0.6,
  slow: 0.8,
  slower: 1,
  dramatic: 1.2,
  reveal: 1.5,
  hero: 2,
} as const;

// ============================================
// STAGGER PRESETS (in seconds)
// ============================================
export const STAGGER = {
  tight: 0.03,
  fast: 0.05,
  normal: 0.08,
  relaxed: 0.12,
  slow: 0.15,
  dramatic: 0.2,
} as const;

// ============================================
// SCROLL TRIGGER PRESETS
// ============================================
export const SCROLL_TRIGGER = {
  // Start positions
  start: {
    top: 'top top',
    center: 'top center',
    bottom: 'top bottom',
    nearTop: 'top 20%',
    nearCenter: 'top 50%',
    nearBottom: 'top 80%',
    belowFold: 'top 90%',
  },
  // End positions
  end: {
    top: 'bottom top',
    center: 'bottom center',
    bottom: 'bottom bottom',
    nearTop: 'bottom 20%',
    nearCenter: 'bottom 50%',
    nearBottom: 'bottom 80%',
  },
  // Toggle actions
  actions: {
    playOnce: 'play none none none',
    playReverse: 'play none none reverse',
    playReset: 'play none none reset',
    restart: 'restart none none reverse',
    toggle: 'play reverse play reverse',
  },
} as const;

// ============================================
// ANIMATION PRESETS
// ============================================
export const ANIMATION = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: DURATION.medium, ease: EASING.smooth },
  },
  fadeInUp: {
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0, duration: DURATION.medium, ease: EASING.snappy },
  },
  fadeInDown: {
    from: { opacity: 0, y: -40 },
    to: { opacity: 1, y: 0, duration: DURATION.medium, ease: EASING.snappy },
  },
  fadeInLeft: {
    from: { opacity: 0, x: -40 },
    to: { opacity: 1, x: 0, duration: DURATION.medium, ease: EASING.snappy },
  },
  fadeInRight: {
    from: { opacity: 0, x: 40 },
    to: { opacity: 1, x: 0, duration: DURATION.medium, ease: EASING.snappy },
  },
  scaleIn: {
    from: { opacity: 0, scale: 0.8 },
    to: {
      opacity: 1,
      scale: 1,
      duration: DURATION.medium,
      ease: EASING.bounce,
    },
  },
  scaleInSmall: {
    from: { opacity: 0, scale: 0.95 },
    to: { opacity: 1, scale: 1, duration: DURATION.quick, ease: EASING.smooth },
  },
  slideInUp: {
    from: { y: '100%' },
    to: { y: 0, duration: DURATION.slow, ease: EASING.expo },
  },
  slideInDown: {
    from: { y: '-100%' },
    to: { y: 0, duration: DURATION.slow, ease: EASING.expo },
  },
  slideInLeft: {
    from: { x: '-100%' },
    to: { x: 0, duration: DURATION.slow, ease: EASING.expo },
  },
  slideInRight: {
    from: { x: '100%' },
    to: { x: 0, duration: DURATION.slow, ease: EASING.expo },
  },
  rotateIn: {
    from: { opacity: 0, rotation: -10 },
    to: {
      opacity: 1,
      rotation: 0,
      duration: DURATION.medium,
      ease: EASING.snappy,
    },
  },
  flipIn: {
    from: { opacity: 0, rotationX: 90 },
    to: {
      opacity: 1,
      rotationX: 0,
      duration: DURATION.slow,
      ease: EASING.snappy,
    },
  },
  blurIn: {
    from: { opacity: 0, filter: 'blur(10px)' },
    to: {
      opacity: 1,
      filter: 'blur(0px)',
      duration: DURATION.medium,
      ease: EASING.smooth,
    },
  },
  clipReveal: {
    from: { clipPath: 'inset(0 100% 0 0)' },
    to: {
      clipPath: 'inset(0 0% 0 0)',
      duration: DURATION.slow,
      ease: EASING.expo,
    },
  },
  clipRevealUp: {
    from: { clipPath: 'inset(100% 0 0 0)' },
    to: {
      clipPath: 'inset(0% 0 0 0)',
      duration: DURATION.slow,
      ease: EASING.expo,
    },
  },
  clipRevealCenter: {
    from: { clipPath: 'inset(50% 50% 50% 50%)' },
    to: {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: DURATION.slow,
      ease: EASING.expo,
    },
  },
  // Text morphing/glitch effects
  textGlitch: {
    from: {
      opacity: 0,
      filter: 'blur(10px) hue-rotate(0deg)',
      textShadow: '0 0 0 transparent',
    },
    to: {
      opacity: 1,
      filter: 'blur(0px) hue-rotate(0deg)',
      textShadow: '0 0 20px var(--glow-primary)',
      duration: DURATION.slow,
      ease: EASING.expo,
    },
  },
  // Liquid/morphing shapes
  liquidMorph: {
    from: {
      borderRadius: '50%',
      scale: 0.8,
      rotation: 0,
    },
    to: {
      borderRadius: '20%',
      scale: 1,
      rotation: 360,
      duration: DURATION.reveal,
      ease: EASING.liquid,
    },
  },
  // Particle trail effects
  particleTrail: {
    from: {
      opacity: 0,
      scale: 0,
      x: 0,
      y: 0,
    },
    to: {
      opacity: 1,
      scale: 1,
      x: 'random(-50, 50)',
      y: 'random(-50, 50)',
      duration: DURATION.medium,
      ease: EASING.trail,
    },
  },
  // Magnetic field interactions
  magneticPull: {
    from: {
      x: 0,
      y: 0,
      scale: 1,
    },
    to: {
      x: '+=20',
      y: '+=20',
      scale: 1.1,
      duration: DURATION.quick,
      ease: EASING.magnetic,
    },
  },
  // Scroll-linked parallax with momentum
  parallaxMomentum: {
    from: {
      y: 0,
      opacity: 0.5,
    },
    to: {
      y: '-=100',
      opacity: 1,
      duration: DURATION.slow,
      ease: EASING.smooth,
    },
  },
} as const;

// ============================================
// BRAND COLORS FOR ANIMATIONS
// ============================================
export const COLORS = {
  background: '#013220',
  foreground: '#E0E0E0',
  primary: '#32CD32',
  secondary: '#FFD700',
  accent: '#FF00FF',
  glowPrimary: 'rgba(50, 205, 50, 0.4)',
  glowSecondary: 'rgba(255, 215, 0, 0.3)',
  glowAccent: 'rgba(255, 0, 255, 0.2)',
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Check for reduced motion preference
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// ============================================
// REACTIVE MOTION PREFERENCE OBSERVER
// ============================================

/**
 * Reactive motion preference observer
 *
 * Listens for changes to the user's motion preference and dispatches
 * a custom event that animation systems can subscribe to.
 *
 * Usage:
 *   motionPreference.init();
 *
 *   window.addEventListener('motionPreferenceChange', (e) => {
 *     const { reduced } = (e as CustomEvent).detail;
 *     // Handle preference change
 *   });
 */
export const motionPreference = {
  reduced: false,
  initialized: false,

  init(): void {
    if (typeof window === 'undefined' || this.initialized) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = mq.matches;
    this.initialized = true;

    mq.addEventListener('change', (e) => {
      this.reduced = e.matches;
      // Notify all animation systems
      window.dispatchEvent(
        new CustomEvent('motionPreferenceChange', {
          detail: { reduced: e.matches },
        })
      );
    });
  },

  /**
   * Subscribe to motion preference changes
   * @param callback Function to call when preference changes
   * @returns Cleanup function to unsubscribe
   */
  subscribe(callback: (reduced: boolean) => void): () => void {
    const handler = (e: Event) => {
      const { reduced } = (e as CustomEvent).detail;
      callback(reduced);
    };

    window.addEventListener('motionPreferenceChange', handler);
    return () => window.removeEventListener('motionPreferenceChange', handler);
  },
};

// Auto-initialize on client
if (typeof window !== 'undefined') {
  motionPreference.init();
}

// Get duration respecting reduced motion
export const getDuration = (duration: number): number => {
  return prefersReducedMotion() ? 0.001 : duration;
};

// Get stagger respecting reduced motion
export const getStagger = (stagger: number): number => {
  return prefersReducedMotion() ? 0 : stagger;
};

// Kill all animations on element
export const killAnimations = (element: gsap.TweenTarget): void => {
  gsap.killTweensOf(element);
};

// Reset element to initial state
export const resetElement = (element: gsap.TweenTarget): void => {
  gsap.set(element, { clearProps: 'all' });
};

// Create context for cleanup
export const createAnimationContext = (
  scope: Element | string | null | undefined,
  callback: () => void
): gsap.Context => {
  return gsap.context(callback, scope ?? undefined);
};

// ============================================
// TIMELINE BUILDERS
// ============================================

// Create a complex sequence timeline
export const createSequenceTimeline = (
  elements: Array<{
    target: gsap.TweenTarget;
    props: gsap.TweenVars;
    position?: number | string;
  }>,
  defaults?: gsap.TimelineVars
): gsap.core.Timeline => {
  const tl = gsap.timeline(defaults);

  elements.forEach(({ target, props, position }) => {
    tl.to(target, props, position);
  });

  return tl;
};

// Create a stagger timeline
export const createStaggerTimeline = (
  targets: gsap.TweenTarget,
  props: gsap.TweenVars,
  stagger: number | gsap.StaggerVars = STAGGER.normal
): gsap.core.Timeline => {
  return gsap.timeline().to(targets, {
    ...props,
    stagger,
  });
};

// Create a scroll-linked timeline
export const createScrollTimeline = (
  targets: gsap.TweenTarget,
  props: gsap.TweenVars,
  scrollTrigger: ScrollTrigger.Vars
): gsap.core.Tween => {
  return gsap.to(targets, {
    ...props,
    scrollTrigger,
  });
};

// ============================================
// GSAP DEFAULTS
// ============================================
gsap.defaults({
  ease: EASING.snappy,
  duration: DURATION.medium,
});

// Configure ScrollTrigger defaults
if (typeof window !== 'undefined') {
  ScrollTrigger.defaults({
    toggleActions: SCROLL_TRIGGER.actions.playReverse,
    start: SCROLL_TRIGGER.start.nearBottom,
  });
}

export default gsap;
