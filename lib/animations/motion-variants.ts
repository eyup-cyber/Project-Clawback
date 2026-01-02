/**
 * Framer Motion Variants Library
 * Reusable animation variants for consistent, beautiful motion
 */

import type { TargetAndTransition, Transition, Variants } from 'framer-motion';

// ============================================
// SPRING CONFIGURATIONS
// ============================================

export const SPRINGS = {
  // Snappy, responsive
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  // Smooth, natural
  smooth: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
  // Bouncy, playful
  bouncy: { type: 'spring', stiffness: 300, damping: 15 } as Transition,
  // Gentle, subtle
  gentle: { type: 'spring', stiffness: 100, damping: 20 } as Transition,
  // Elastic, springy
  elastic: {
    type: 'spring',
    stiffness: 500,
    damping: 20,
    mass: 0.5,
  } as Transition,
  // Heavy, weighted
  heavy: {
    type: 'spring',
    stiffness: 150,
    damping: 35,
    mass: 1.5,
  } as Transition,
  // Quick snap
  quickSnap: { type: 'spring', stiffness: 600, damping: 40 } as Transition,
  // Slow drift
  drift: { type: 'spring', stiffness: 50, damping: 15 } as Transition,
} as const;

// ============================================
// EASING PRESETS
// ============================================

export const EASINGS = {
  // Standard easings
  smooth: [0.4, 0, 0.2, 1],
  expo: [0.16, 1, 0.3, 1],
  bounce: [0.34, 1.56, 0.64, 1],
  magnetic: [0.25, 0.46, 0.45, 0.94],
  // Dramatic easings
  dramatic: [0.7, 0, 0.3, 1],
  // Subtle easings
  subtle: [0.4, 0, 0.6, 1],
} as const;

// ============================================
// DURATION PRESETS
// ============================================

export const DURATIONS = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  slower: 0.8,
  cinematic: 1.2,
} as const;

// ============================================
// FADE VARIANTS
// ============================================

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATIONS.normal, ease: EASINGS.smooth },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATIONS.fast, ease: EASINGS.smooth },
  },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRINGS.snappy,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: DURATIONS.fast },
  },
};

export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRINGS.snappy,
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: DURATIONS.fast },
  },
};

export const fadeLeftVariants: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRINGS.snappy,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: DURATIONS.fast },
  },
};

export const fadeRightVariants: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRINGS.snappy,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: DURATIONS.fast },
  },
};

// ============================================
// SCALE VARIANTS
// ============================================

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRINGS.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: DURATIONS.fast },
  },
};

export const scaleUpVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRINGS.elastic,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: DURATIONS.fast },
  },
};

export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRINGS.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: DURATIONS.fast },
  },
};

// ============================================
// SLIDE VARIANTS
// ============================================

export const slideUpVariants: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: { duration: DURATIONS.slow, ease: EASINGS.expo },
  },
  exit: {
    y: '-100%',
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
};

export const slideDownVariants: Variants = {
  hidden: { y: '-100%' },
  visible: {
    y: 0,
    transition: { duration: DURATIONS.slow, ease: EASINGS.expo },
  },
  exit: {
    y: '100%',
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
};

export const slideLeftVariants: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: { duration: DURATIONS.slow, ease: EASINGS.expo },
  },
  exit: {
    x: '-100%',
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
};

export const slideRightVariants: Variants = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: { duration: DURATIONS.slow, ease: EASINGS.expo },
  },
  exit: {
    x: '100%',
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
};

// ============================================
// REVEAL / MASK VARIANTS
// ============================================

export const clipRevealVariants: Variants = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: DURATIONS.slow, ease: EASINGS.expo },
  },
  exit: {
    clipPath: 'inset(0 0 0 100%)',
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
};

export const clipRevealUpVariants: Variants = {
  hidden: { clipPath: 'inset(100% 0 0 0)' },
  visible: {
    clipPath: 'inset(0% 0 0 0)',
    transition: { duration: DURATIONS.slow, ease: EASINGS.expo },
  },
  exit: {
    clipPath: 'inset(0 0 100% 0)',
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
};

export const clipRevealCenterVariants: Variants = {
  hidden: { clipPath: 'inset(50% 50% 50% 50%)' },
  visible: {
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: { duration: DURATIONS.slow, ease: EASINGS.expo },
  },
  exit: {
    clipPath: 'inset(50% 50% 50% 50%)',
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
};

export const wipeVariants: Variants = {
  hidden: { scaleY: 0, originY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: DURATIONS.slow, ease: EASINGS.expo },
  },
  exit: {
    scaleY: 0,
    originY: 1,
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
};

// ============================================
// BLUR VARIANTS
// ============================================

export const blurVariants: Variants = {
  hidden: { opacity: 0, filter: 'blur(20px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: DURATIONS.slow, ease: EASINGS.smooth },
  },
  exit: {
    opacity: 0,
    filter: 'blur(10px)',
    transition: { duration: DURATIONS.fast },
  },
};

export const blurUpVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: SPRINGS.smooth,
  },
  exit: {
    opacity: 0,
    y: -20,
    filter: 'blur(5px)',
    transition: { duration: DURATIONS.fast },
  },
};

// ============================================
// STAGGER CONTAINER VARIANTS
// ============================================

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerContainerFastVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

export const staggerContainerSlowVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.08,
      staggerDirection: -1,
    },
  },
};

// ============================================
// CARD / INTERACTIVE VARIANTS
// ============================================

export const cardHoverVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  hover: {
    scale: 1.02,
    y: -8,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    transition: SPRINGS.snappy,
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: { duration: DURATIONS.instant },
  },
};

export const buttonHoverVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: SPRINGS.snappy,
  },
  tap: {
    scale: 0.95,
    transition: { duration: DURATIONS.instant },
  },
};

export const magneticHoverVariants: Variants = {
  initial: { x: 0, y: 0 },
  hover: {
    transition: SPRINGS.gentle,
  },
};

// ============================================
// 3D PERSPECTIVE VARIANTS
// ============================================

export const flip3DVariants: Variants = {
  hidden: {
    rotateX: -90,
    opacity: 0,
    transformPerspective: 1000,
  },
  visible: {
    rotateX: 0,
    opacity: 1,
    transition: SPRINGS.bouncy,
  },
  exit: {
    rotateX: 90,
    opacity: 0,
    transition: { duration: DURATIONS.normal },
  },
};

export const tilt3DVariants: Variants = {
  initial: {
    rotateX: 0,
    rotateY: 0,
    transformPerspective: 1000,
  },
  hover: {
    transition: SPRINGS.gentle,
  },
};

// ============================================
// TEXT ANIMATION VARIANTS
// ============================================

export const textRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.expo,
    },
  },
};

export const letterStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export const letterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    rotateX: -90,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: SPRINGS.snappy,
  },
};

export const wordStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRINGS.smooth,
  },
};

// ============================================
// PARALLAX VARIANTS (for use with useScroll)
// ============================================

export const parallaxUpVariants = (intensity: number = 100): TargetAndTransition => ({
  y: -intensity,
  transition: { type: 'tween', ease: 'linear' },
});

export const parallaxDownVariants = (intensity: number = 100): TargetAndTransition => ({
  y: intensity,
  transition: { type: 'tween', ease: 'linear' },
});

export const parallaxScaleVariants = (
  from: number = 0.8,
  to: number = 1
): { initial: TargetAndTransition; animate: TargetAndTransition } => ({
  initial: { scale: from, opacity: 0 },
  animate: { scale: to, opacity: 1 },
});

// ============================================
// NOTIFICATION / TOAST VARIANTS
// ============================================

export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRINGS.bouncy,
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: DURATIONS.fast, ease: EASINGS.smooth },
  },
};

export const notificationBadgeVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: SPRINGS.elastic,
  },
  pulse: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
};

// ============================================
// MODAL / OVERLAY VARIANTS
// ============================================

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATIONS.fast },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATIONS.fast, delay: 0.1 },
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRINGS.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: DURATIONS.fast },
  },
};

export const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: { duration: DURATIONS.normal, ease: EASINGS.expo },
  },
  exit: {
    x: '100%',
    transition: { duration: DURATIONS.fast, ease: EASINGS.smooth },
  },
};

// ============================================
// LIST ITEM VARIANTS
// ============================================

export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRINGS.snappy,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: DURATIONS.fast },
  },
};

export const gridItemVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRINGS.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: DURATIONS.fast },
  },
};

// ============================================
// LOADING / SKELETON VARIANTS
// ============================================

export const skeletonVariants: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const pulseVariants: Variants = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Creates a custom stagger container variant
 */
export const createStaggerContainer = (
  staggerChildren: number = 0.08,
  delayChildren: number = 0.1
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: staggerChildren / 2,
      staggerDirection: -1,
    },
  },
});

/**
 * Creates a custom fade variant with configurable direction and distance
 */
export const createFadeVariant = (
  direction: 'up' | 'down' | 'left' | 'right' | 'none' = 'up',
  distance: number = 40
): Variants => {
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  return {
    hidden: { opacity: 0, ...directionMap[direction] },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: SPRINGS.snappy,
    },
    exit: {
      opacity: 0,
      transition: { duration: DURATIONS.fast },
    },
  };
};

/**
 * Creates a scale variant with custom spring
 */
export const createScaleVariant = (
  fromScale: number = 0.8,
  spring: Transition = SPRINGS.bouncy
): Variants => ({
  hidden: { opacity: 0, scale: fromScale },
  visible: {
    opacity: 1,
    scale: 1,
    transition: spring,
  },
  exit: {
    opacity: 0,
    scale: fromScale + (1 - fromScale) / 2,
    transition: { duration: DURATIONS.fast },
  },
});
