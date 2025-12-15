import gsap from 'gsap';
import { EASING, DURATION, prefersReducedMotion, getDuration } from './gsap-config';

// ============================================
// HOVER STATE ANIMATIONS
// ============================================

export interface HoverAnimationOptions {
  scale?: number;
  glow?: boolean;
  glowColor?: string;
  colorShift?: string;
  duration?: number;
  ease?: string;
}

export const createHoverAnimation = (
  element: gsap.TweenTarget,
  options: HoverAnimationOptions = {}
) => {
  const {
    scale = 1.05,
    glow = false,
    glowColor = 'rgba(50, 205, 50, 0.4)',
    colorShift,
    duration = DURATION.quick,
    ease = EASING.smooth,
  } = options;

  if (prefersReducedMotion()) return;

  const hoverProps: gsap.TweenVars = {
    scale,
    duration: getDuration(duration),
    ease,
  };

  if (colorShift) {
    hoverProps.color = colorShift;
  }

  if (glow) {
    hoverProps.boxShadow = `0 0 20px ${glowColor}`;
  }

  return gsap.to(element, hoverProps);
};

export const createHoverReset = (
  element: gsap.TweenTarget,
  duration: number = DURATION.quick
) => {
  if (prefersReducedMotion()) return;

  return gsap.to(element, {
    scale: 1,
    color: '',
    boxShadow: 'none',
    duration: getDuration(duration),
    ease: EASING.smooth,
  });
};

// ============================================
// CLICK FEEDBACK ANIMATIONS
// ============================================

export interface ClickAnimationOptions {
  ripple?: boolean;
  pulse?: boolean;
  magnetic?: boolean;
  duration?: number;
}

export const createRippleEffect = (
  element: HTMLElement,
  event: MouseEvent | TouchEvent,
  options: ClickAnimationOptions = {}
) => {
  if (prefersReducedMotion() || !options.ripple) return;

  const rect = element.getBoundingClientRect();
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
  
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const size = Math.max(rect.width, rect.height);

  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    width: ${size}px;
    height: ${size}px;
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    pointer-events: none;
    transform: scale(0);
  `;

  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);

  gsap.to(ripple, {
    scale: 2,
    opacity: 0,
    duration: getDuration(DURATION.medium),
    ease: EASING.smooth,
    onComplete: () => ripple.remove(),
  });
};

export const createPulseEffect = (
  element: gsap.TweenTarget,
  options: ClickAnimationOptions = {}
) => {
  if (prefersReducedMotion() || !options.pulse) return;

  return gsap.to(element, {
    scale: 1.1,
    duration: getDuration(DURATION.fast),
    ease: EASING.snappy,
    yoyo: true,
    repeat: 1,
  });
};

export const createMagneticPull = (
  element: HTMLElement,
  event: MouseEvent,
  strength: number = 0.3
) => {
  if (prefersReducedMotion()) return;

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const distanceX = (event.clientX - centerX) * strength;
  const distanceY = (event.clientY - centerY) * strength;

  return gsap.to(element, {
    x: distanceX,
    y: distanceY,
    duration: getDuration(DURATION.quick),
    ease: EASING.magnetic,
  });
};

// ============================================
// FOCUS STATE ANIMATIONS
// ============================================

export const createFocusRing = (
  element: HTMLElement,
  color: string = 'var(--primary)'
) => {
  if (prefersReducedMotion()) return;

  const ring = document.createElement('div');
  ring.style.cssText = `
    position: absolute;
    inset: -4px;
    border: 2px solid ${color};
    border-radius: inherit;
    opacity: 0;
    pointer-events: none;
    z-index: -1;
  `;

  element.style.position = 'relative';
  element.appendChild(ring);

  const showRing = () => {
    gsap.to(ring, {
      opacity: 1,
      scale: 1.05,
      duration: getDuration(DURATION.fast),
      ease: EASING.snappy,
    });
  };

  const hideRing = () => {
    gsap.to(ring, {
      opacity: 0,
      scale: 1,
      duration: getDuration(DURATION.fast),
      ease: EASING.smooth,
    });
  };

  element.addEventListener('focus', showRing);
  element.addEventListener('blur', hideRing);

  return () => {
    element.removeEventListener('focus', showRing);
    element.removeEventListener('blur', hideRing);
    ring.remove();
  };
};

// ============================================
// LOADING STATE ANIMATIONS
// ============================================

export const createSpinner = (
  container: HTMLElement,
  size: number = 24,
  color: string = 'var(--primary)'
) => {
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: ${color};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  container.appendChild(spinner);

  return () => {
    spinner.remove();
    style.remove();
  };
};

export const createSkeletonLoader = (
  element: HTMLElement,
  shimmer: boolean = true
) => {
  if (prefersReducedMotion()) return;

  const originalContent = element.innerHTML;
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.innerHTML = '';

  if (shimmer) {
    const shimmerEl = document.createElement('div');
    shimmerEl.style.cssText = `
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
      transform: translateX(-100%);
    `;
    element.appendChild(shimmerEl);

    gsap.to(shimmerEl, {
      x: '200%',
      duration: 1.5,
      repeat: -1,
      ease: EASING.linear,
    });
  }

  return () => {
    element.innerHTML = originalContent;
  };
};

// ============================================
// SUCCESS/ERROR STATE ANIMATIONS
// ============================================

export const createSuccessAnimation = (element: gsap.TweenTarget) => {
  if (prefersReducedMotion()) return;

  const tl = gsap.timeline();
  
  tl.to(element, {
    scale: 1.2,
    duration: getDuration(DURATION.fast),
    ease: EASING.snappy,
  })
  .to(element, {
    scale: 1,
    duration: getDuration(DURATION.fast),
    ease: EASING.elastic,
  });

  return tl;
};

export const createErrorAnimation = (element: gsap.TweenTarget) => {
  if (prefersReducedMotion()) return;

  return gsap.to(element, {
    x: [0, -10, 10, -10, 10, 0],
    duration: getDuration(DURATION.medium),
    ease: EASING.snappy,
  });
};

// ============================================
// COMPOSITE ANIMATIONS
// ============================================

export const createInteractiveButton = (
  button: HTMLButtonElement | HTMLAnchorElement,
  options: {
    hover?: HoverAnimationOptions;
    click?: ClickAnimationOptions;
    focus?: boolean;
  } = {}
) => {
  if (prefersReducedMotion()) return;

  const cleanup: Array<() => void> = [];

  // Hover effects
  if (options.hover) {
    const handleMouseEnter = () => createHoverAnimation(button, options.hover);
    const handleMouseLeave = () => createHoverReset(button);
    
    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);
    
    cleanup.push(() => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    });
  }

  // Click effects
  if (options.click) {
    const handleClick = (e: MouseEvent) => {
      if (options.click?.ripple) {
        createRippleEffect(button, e, options.click);
      }
      if (options.click?.pulse) {
        createPulseEffect(button, options.click);
      }
    };
    
    button.addEventListener('click', handleClick);
    cleanup.push(() => button.removeEventListener('click', handleClick));
  }

  // Focus effects
  if (options.focus) {
    const focusCleanup = createFocusRing(button);
    cleanup.push(focusCleanup);
  }

  return () => cleanup.forEach(fn => fn());
};




