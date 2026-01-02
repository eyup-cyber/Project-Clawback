// @ts-nocheck
/**
 * GSAP Custom Effects Library
 * Split-text, magnetic, elastic, liquid, and advanced animation effects
 */

import gsap from 'gsap';
import {
  DURATION,
  EASING,
  getDuration,
  getStagger,
  prefersReducedMotion,
  STAGGER,
} from './gsap-config';

// ============================================
// SPLIT TEXT ANIMATION
// ============================================

export interface SplitTextOptions {
  type?: 'chars' | 'words' | 'lines';
  animation?: 'fadeUp' | 'fadeDown' | 'scale' | 'rotate' | 'blur' | 'glitch';
  stagger?: number;
  duration?: number;
  delay?: number;
  ease?: string;
}

/**
 * Split text element into individual characters/words/lines and animate
 */
export const splitTextAnimation = (
  element: HTMLElement,
  options: SplitTextOptions = {}
): gsap.core.Timeline | null => {
  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1 });
    return null;
  }

  const {
    type = 'chars',
    animation = 'fadeUp',
    stagger = type === 'chars' ? STAGGER.tight : STAGGER.normal,
    duration = DURATION.medium,
    delay = 0,
    ease = EASING.snappy,
  } = options;

  // Store original content
  const originalHTML = element.innerHTML;
  const text = element.textContent || '';

  // Split content
  let parts: string[] = [];
  if (type === 'chars') {
    parts = text.split('');
  } else if (type === 'words') {
    parts = text.split(/\s+/);
  } else if (type === 'lines') {
    // For lines, we need to measure where line breaks occur
    // Simplified: split by newlines or treat as single line
    parts = text.split('\n').filter(Boolean);
    if (parts.length === 0) parts = [text];
  }

  // Create span wrappers
  const wrapper = document.createElement('span');
  wrapper.style.display = 'inline';

  const spans = parts.map((part, i) => {
    const span = document.createElement('span');
    span.textContent = type === 'words' && i < parts.length - 1 ? `${part} ` : part;
    span.style.display = 'inline-block';
    span.style.willChange = 'transform, opacity';
    if (part === ' ' || part === '') span.innerHTML = '&nbsp;';
    return span;
  });

  element.innerHTML = '';
  spans.forEach((span) => element.appendChild(span));

  // Define animation presets
  const animations: Record<string, { from: gsap.TweenVars; to: gsap.TweenVars }> = {
    fadeUp: {
      from: { opacity: 0, y: 30, rotateX: -45 },
      to: { opacity: 1, y: 0, rotateX: 0 },
    },
    fadeDown: {
      from: { opacity: 0, y: -30, rotateX: 45 },
      to: { opacity: 1, y: 0, rotateX: 0 },
    },
    scale: {
      from: { opacity: 0, scale: 0 },
      to: { opacity: 1, scale: 1 },
    },
    rotate: {
      from: { opacity: 0, rotation: -90, transformOrigin: 'left bottom' },
      to: { opacity: 1, rotation: 0 },
    },
    blur: {
      from: { opacity: 0, filter: 'blur(10px)' },
      to: { opacity: 1, filter: 'blur(0px)' },
    },
    glitch: {
      from: {
        opacity: 0,
        x: () => gsap.utils.random(-20, 20),
        y: () => gsap.utils.random(-10, 10),
        skewX: () => gsap.utils.random(-10, 10),
      },
      to: { opacity: 1, x: 0, y: 0, skewX: 0 },
    },
  };

  const anim = animations[animation];

  // Create timeline
  const tl = gsap.timeline({ delay });

  tl.fromTo(spans, anim.from, {
    ...anim.to,
    duration: getDuration(duration),
    stagger: getStagger(stagger),
    ease,
  });

  // Add cleanup method to timeline
  const tlWithRevert = tl as gsap.core.Timeline & { revert: () => void };
  tlWithRevert.revert = () => {
    element.innerHTML = originalHTML;
  };

  return tlWithRevert;
};

// ============================================
// MAGNETIC EFFECT
// ============================================

export interface MagneticEffectOptions {
  strength?: number;
  radius?: number;
  ease?: string;
  duration?: number;
}

/**
 * Apply magnetic pull effect to an element
 */
export const applyMagneticEffect = (
  element: HTMLElement,
  options: MagneticEffectOptions = {}
): (() => void) | null => {
  if (prefersReducedMotion()) return null;

  const {
    strength = 0.3,
    radius = 100,
    ease = EASING.magnetic,
    duration = DURATION.quick,
  } = options;

  let bounds: DOMRect;
  let centerX: number;
  let centerY: number;

  const updateBounds = () => {
    bounds = element.getBoundingClientRect();
    centerX = bounds.left + bounds.width / 2;
    centerY = bounds.top + bounds.height / 2;
  };

  const onMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < radius) {
      const factor = 1 - distance / radius;
      gsap.to(element, {
        x: dx * strength * factor,
        y: dy * strength * factor,
        duration: getDuration(duration),
        ease,
      });
    }
  };

  const onMouseLeave = () => {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: getDuration(DURATION.normal),
      ease: EASING.elastic,
    });
  };

  updateBounds();
  window.addEventListener('resize', updateBounds);
  window.addEventListener('scroll', updateBounds);
  element.addEventListener('mousemove', onMouseMove);
  element.addEventListener('mouseleave', onMouseLeave);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', updateBounds);
    window.removeEventListener('scroll', updateBounds);
    element.removeEventListener('mousemove', onMouseMove);
    element.removeEventListener('mouseleave', onMouseLeave);
    gsap.set(element, { x: 0, y: 0 });
  };
};

// ============================================
// ELASTIC EFFECT
// ============================================

export interface ElasticEffectOptions {
  scale?: number;
  rotation?: number;
  duration?: number;
}

/**
 * Apply elastic bounce effect on hover
 */
export const applyElasticEffect = (
  element: HTMLElement,
  options: ElasticEffectOptions = {}
): (() => void) | null => {
  if (prefersReducedMotion()) return null;

  const { scale = 1.1, rotation = 0, duration = DURATION.medium } = options;

  const onMouseEnter = () => {
    gsap.to(element, {
      scale,
      rotation,
      duration: getDuration(duration),
      ease: EASING.elastic,
    });
  };

  const onMouseLeave = () => {
    gsap.to(element, {
      scale: 1,
      rotation: 0,
      duration: getDuration(duration),
      ease: EASING.elastic,
    });
  };

  element.addEventListener('mouseenter', onMouseEnter);
  element.addEventListener('mouseleave', onMouseLeave);

  return () => {
    element.removeEventListener('mouseenter', onMouseEnter);
    element.removeEventListener('mouseleave', onMouseLeave);
    gsap.set(element, { scale: 1, rotation: 0 });
  };
};

// ============================================
// LIQUID / MORPH EFFECT
// ============================================

export interface LiquidEffectOptions {
  intensity?: number;
  speed?: number;
}

/**
 * Apply liquid morphing effect with SVG filter
 */
export const applyLiquidEffect = (
  element: HTMLElement,
  options: LiquidEffectOptions = {}
): (() => void) | null => {
  if (prefersReducedMotion()) return null;

  const { intensity = 10, speed = 2 } = options;

  // Create SVG filter
  const filterId = `liquid-${Math.random().toString(36).substr(2, 9)}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position: absolute; width: 0; height: 0;';
  svg.innerHTML = `
    <defs>
      <filter id="${filterId}">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.01"
          numOctaves="3"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="${intensity}"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  `;
  document.body.appendChild(svg);

  element.style.filter = `url(#${filterId})`;

  // Animate turbulence
  const turbulence = svg.querySelector('feTurbulence');
  if (turbulence) {
    gsap.to(
      {},
      {
        duration: speed,
        repeat: -1,
        ease: 'none',
        onUpdate: function () {
          const time = this.progress() * 0.1;
          turbulence.setAttribute('baseFrequency', `${0.01 + Math.sin(time) * 0.005}`);
        },
      }
    );
  }

  return () => {
    element.style.filter = '';
    svg.remove();
  };
};

// ============================================
// RIPPLE EFFECT
// ============================================

export interface RippleEffectOptions {
  color?: string;
  duration?: number;
  scale?: number;
}

/**
 * Apply ripple effect on click
 */
export const applyRippleEffect = (
  element: HTMLElement,
  options: RippleEffectOptions = {}
): (() => void) | null => {
  if (prefersReducedMotion()) return null;

  const { color = 'rgba(255, 255, 255, 0.3)', duration = DURATION.slow, scale = 4 } = options;

  // Ensure element has position and overflow
  const computedStyle = getComputedStyle(element);
  if (computedStyle.position === 'static') {
    element.style.position = 'relative';
  }
  element.style.overflow = 'hidden';

  const createRipple = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height);

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: ${size / scale}px;
      height: ${size / scale}px;
      background: ${color};
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
    `;

    element.appendChild(ripple);

    gsap.to(ripple, {
      scale,
      opacity: 0,
      duration: getDuration(duration),
      ease: EASING.smooth,
      onComplete: () => ripple.remove(),
    });
  };

  element.addEventListener('click', createRipple);

  return () => {
    element.removeEventListener('click', createRipple);
  };
};

// ============================================
// TILT EFFECT (3D)
// ============================================

export interface TiltEffectOptions {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
  glareMaxOpacity?: number;
}

/**
 * Apply 3D tilt effect on hover
 */
export const applyTiltEffect = (
  element: HTMLElement,
  options: TiltEffectOptions = {}
): (() => void) | null => {
  if (prefersReducedMotion()) return null;

  const {
    maxTilt = 15,
    perspective = 1000,
    scale = 1.02,
    speed = DURATION.quick,
    glare = true,
    glareMaxOpacity = 0.2,
  } = options;

  // Set perspective on parent
  element.style.transformStyle = 'preserve-3d';
  if (element.parentElement) {
    element.parentElement.style.perspective = `${perspective}px`;
  }

  // Create glare element
  let glareEl: HTMLElement | null = null;
  if (glare) {
    glareEl = document.createElement('div');
    glareEl.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, ${glareMaxOpacity}) 0%,
        transparent 50%
      );
      opacity: 0;
      transition: opacity 0.3s;
    `;
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(glareEl);
  }

  const onMouseMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    gsap.to(element, {
      rotateX,
      rotateY,
      scale,
      duration: getDuration(speed),
      ease: EASING.smooth,
    });

    // Update glare position
    if (glareEl) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      glareEl.style.background = `
        radial-gradient(
          circle at ${glareX}% ${glareY}%,
          rgba(255, 255, 255, ${glareMaxOpacity}) 0%,
          transparent 50%
        )
      `;
    }
  };

  const onMouseEnter = () => {
    if (glareEl) {
      glareEl.style.opacity = '1';
    }
  };

  const onMouseLeave = () => {
    gsap.to(element, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: getDuration(DURATION.medium),
      ease: EASING.smooth,
    });
    if (glareEl) {
      glareEl.style.opacity = '0';
    }
  };

  element.addEventListener('mousemove', onMouseMove);
  element.addEventListener('mouseenter', onMouseEnter);
  element.addEventListener('mouseleave', onMouseLeave);

  return () => {
    element.removeEventListener('mousemove', onMouseMove);
    element.removeEventListener('mouseenter', onMouseEnter);
    element.removeEventListener('mouseleave', onMouseLeave);
    if (glareEl) glareEl.remove();
    gsap.set(element, { rotateX: 0, rotateY: 0, scale: 1 });
  };
};

// ============================================
// REVEAL ANIMATION
// ============================================

export interface RevealEffectOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
}

/**
 * Create intersection observer-based reveal animation
 */
export const createRevealObserver = (
  elements: HTMLElement | HTMLElement[] | NodeListOf<HTMLElement>,
  options: RevealEffectOptions = {}
): IntersectionObserver | null => {
  if (prefersReducedMotion()) {
    const els = 'length' in elements ? Array.from(elements) : [elements];
    els.forEach((el) => gsap.set(el, { opacity: 1 }));
    return null;
  }

  const {
    direction = 'up',
    delay = 0,
    duration = DURATION.medium,
    distance = 50,
    once = true,
  } = options;

  const directionMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  };

  const els = 'length' in elements ? Array.from(elements) : [elements];

  // Set initial state
  els.forEach((el) => {
    gsap.set(el, {
      opacity: 0,
      ...directionMap[direction],
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          gsap.to(entry.target, {
            opacity: 1,
            x: 0,
            y: 0,
            duration: getDuration(duration),
            delay: getDuration(delay),
            ease: EASING.snappy,
          });
          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          gsap.to(entry.target, {
            opacity: 0,
            ...directionMap[direction],
            duration: getDuration(duration * 0.5),
            ease: EASING.smooth,
          });
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  els.forEach((el) => observer.observe(el));

  return observer;
};

// ============================================
// COUNTER ANIMATION
// ============================================

export interface CounterOptions {
  duration?: number;
  ease?: string;
  separator?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Animate number counting
 */
export const animateCounter = (
  element: HTMLElement,
  endValue: number,
  options: CounterOptions = {}
): gsap.core.Tween | null => {
  if (prefersReducedMotion()) {
    element.textContent = `${options.prefix ?? ''}${endValue.toLocaleString()}${options.suffix ?? ''}`;
    return null;
  }

  const {
    duration = DURATION.slow,
    ease = EASING.smooth,
    separator = ',',
    decimals = 0,
    prefix = '',
    suffix = '',
  } = options;

  const obj = { value: 0 };

  return gsap.to(obj, {
    value: endValue,
    duration: getDuration(duration),
    ease,
    onUpdate: () => {
      const formatted = obj.value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      element.textContent = `${prefix}${formatted}${suffix}`;
    },
  });
};

// ============================================
// TYPEWRITER EFFECT
// ============================================

export interface TypewriterOptions {
  speed?: number;
  cursor?: boolean;
  cursorChar?: string;
  delay?: number;
}

/**
 * Typewriter text animation
 */
export const typewriterEffect = (
  element: HTMLElement,
  text: string,
  options: TypewriterOptions = {}
): gsap.core.Timeline | null => {
  if (prefersReducedMotion()) {
    element.textContent = text;
    return null;
  }

  const { speed = 0.05, cursor = true, cursorChar = '|', delay = 0 } = options;

  element.textContent = '';

  const tl = gsap.timeline({ delay });

  // Type each character
  text.split('').forEach((char, i) => {
    tl.call(
      () => {
        element.textContent = text.substring(0, i + 1) + (cursor ? cursorChar : '');
      },
      [],
      i * speed
    );
  });

  // Remove cursor at end
  if (cursor) {
    tl.call(
      () => {
        element.textContent = text;
      },
      [],
      text.length * speed + 0.5
    );
  }

  return tl;
};

// ============================================
// SHUFFLE TEXT EFFECT
// ============================================

export interface ShuffleOptions {
  duration?: number;
  characters?: string;
  delay?: number;
}

/**
 * Text shuffle/scramble effect
 */
export const shuffleText = (
  element: HTMLElement,
  finalText: string,
  options: ShuffleOptions = {}
): gsap.core.Timeline | null => {
  if (prefersReducedMotion()) {
    element.textContent = finalText;
    return null;
  }

  const {
    duration = DURATION.slow,
    characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
    delay = 0,
  } = options;

  const tl = gsap.timeline({ delay });
  const length = finalText.length;

  tl.to(
    {},
    {
      duration: getDuration(duration),
      ease: EASING.smooth,
      onUpdate: function () {
        const progress = this.progress();
        let result = '';

        for (let i = 0; i < length; i++) {
          if (i < progress * length) {
            result += finalText[i];
          } else {
            result += characters[Math.floor(Math.random() * characters.length)];
          }
        }

        element.textContent = result;
      },
    }
  );

  return tl;
};
