/**
 * Animation Library Index
 * Central export point for all animation utilities
 */

// ============================================
// CURSOR EFFECTS
// ============================================
export {
  CURSOR_STYLES,
  CursorManager,
  type CursorManagerOptions,
  CursorSqueeze,
  type CursorState,
  type CursorStyle,
  CursorTrail,
  distance,
  isTouchDevice,
  lerpVector,
  MagneticElement,
  type MagneticOptions,
  normalize,
  type SqueezeOptions,
  supportsHover,
  type TrailOptions,
} from './cursor-effects';
// ============================================
// FRAME LOOP
// ============================================
export { frameLoop } from './frame-loop';
// ============================================
// CORE GSAP EXPORTS
// ============================================
export {
  ANIMATION,
  COLORS,
  createAnimationContext,
  createScrollTimeline,
  createSequenceTimeline,
  createStaggerTimeline,
  DURATION,
  default as gsap,
  EASING,
  getDuration,
  getStagger,
  killAnimations,
  motionPreference,
  prefersReducedMotion,
  resetElement,
  SCROLL_TRIGGER,
  STAGGER,
} from './gsap-config';
// ============================================
// GSAP EFFECTS
// ============================================
export {
  animateCounter,
  applyElasticEffect,
  applyLiquidEffect,
  applyMagneticEffect,
  applyRippleEffect,
  applyTiltEffect,
  type CounterOptions,
  createRevealObserver,
  type ElasticEffectOptions,
  type LiquidEffectOptions,
  type MagneticEffectOptions,
  type RevealEffectOptions,
  type RippleEffectOptions,
  type ShuffleOptions,
  type SplitTextOptions,
  shuffleText,
  splitTextAnimation,
  type TiltEffectOptions,
  type TypewriterOptions,
  typewriterEffect,
} from './gsap-effects';
// ============================================
// MICRO INTERACTIONS
// ============================================
export * from './micro-interactions';
// ============================================
// FRAMER MOTION VARIANTS
// ============================================
export {
  blurUpVariants,
  // Blur variants
  blurVariants,
  buttonHoverVariants,
  // Interactive variants
  cardHoverVariants,
  clipRevealCenterVariants,
  clipRevealUpVariants,
  // Reveal variants
  clipRevealVariants,
  createFadeVariant,
  createScaleVariant,
  // Utility functions
  createStaggerContainer,
  DURATIONS,
  drawerVariants,
  EASINGS,
  fadeDownVariants,
  fadeLeftVariants,
  fadeRightVariants,
  fadeUpVariants,
  // Fade variants
  fadeVariants,
  // 3D variants
  flip3DVariants,
  gridItemVariants,
  letterStaggerVariants,
  letterVariants,
  // List
  listItemVariants,
  magneticHoverVariants,
  // Modal
  modalBackdropVariants,
  modalContentVariants,
  notificationBadgeVariants,
  parallaxDownVariants,
  parallaxScaleVariants,
  // Parallax
  parallaxUpVariants,
  popVariants,
  pulseVariants,
  // Springs
  SPRINGS,
  scaleUpVariants,
  // Scale variants
  scaleVariants,
  // Loading
  skeletonVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  // Slide variants
  slideUpVariants,
  spinnerVariants,
  staggerContainerFastVariants,
  staggerContainerSlowVariants,
  // Stagger containers
  staggerContainerVariants,
  // Text variants
  textRevealVariants,
  tilt3DVariants,
  // Notifications
  toastVariants,
  wipeVariants,
  wordStaggerVariants,
  wordVariants,
} from './motion-variants';
// ============================================
// PERFORMANCE
// ============================================
export * from './performance';
// ============================================
// SCROLL ANIMATIONS
// ============================================
export {
  createMomentumParallax,
  createParallaxLayer,
  createScrollProgress,
  createScrollReveal,
  createScrollRotation,
  createScrollScale,
  createScrollSnap,
  createSectionProgress,
  createStickyElement,
  type ParallaxOptions,
  type RevealOptions,
  type StickyOptions,
} from './scroll-animations';
// ============================================
// SPRING PHYSICS
// ============================================
export {
  createFramerTransition,
  createSpringForDuration,
  createVelocitySpring,
  estimateSettlingTime,
  framerSprings,
  getDampingRatio,
  getFramerSpring,
  getNaturalFrequency,
  getSpringType,
  interpolateSpring,
  SPRING_PRESETS,
  Spring2D,
  Spring3D,
  type SpringConfig,
  SpringSimulation,
  type Vector2D,
  type Vector3D,
} from './spring-physics';
