import gsap from 'gsap';

// Check for reduced motion preference
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Animation durations (respects reduced motion)
export const getDuration = (normal: number): number => {
  return prefersReducedMotion() ? 0.001 : normal;
};

// Common animation presets
export const fadeIn = {
  from: { opacity: 0 },
  to: { opacity: 1, duration: getDuration(0.6), ease: 'power3.out' },
};

export const fadeInUp = {
  from: { opacity: 0, y: 30 },
  to: { opacity: 1, y: 0, duration: getDuration(0.6), ease: 'power3.out' },
};

export const fadeInDown = {
  from: { opacity: 0, y: -30 },
  to: { opacity: 1, y: 0, duration: getDuration(0.6), ease: 'power3.out' },
};

export const fadeInLeft = {
  from: { opacity: 0, x: -30 },
  to: { opacity: 1, x: 0, duration: getDuration(0.6), ease: 'power3.out' },
};

export const fadeInRight = {
  from: { opacity: 0, x: 30 },
  to: { opacity: 1, x: 0, duration: getDuration(0.6), ease: 'power3.out' },
};

export const scaleIn = {
  from: { opacity: 0, scale: 0.9 },
  to: { opacity: 1, scale: 1, duration: getDuration(0.5), ease: 'back.out(1.7)' },
};

// Stagger children animation
export const staggerChildren = (
  container: string | HTMLElement,
  children: string,
  options?: {
    stagger?: number;
    duration?: number;
    y?: number;
    delay?: number;
  }
) => {
  const { stagger = 0.1, duration = 0.6, y = 30, delay = 0 } = options || {};

  if (prefersReducedMotion()) {
    gsap.set(`${container} ${children}`, { opacity: 1, y: 0 });
    return;
  }

  gsap.fromTo(
    `${container} ${children}`,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: getDuration(duration),
      stagger,
      delay,
      ease: 'power3.out',
    }
  );
};

// Scroll-triggered fade in
export const scrollFadeIn = (
  element: string | HTMLElement,
  options?: {
    y?: number;
    start?: string;
    end?: string;
  }
) => {
  const { y = 50, start = 'top 80%', end = 'bottom 20%' } = options || {};

  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1, y: 0 });
    return;
  }

  gsap.fromTo(
    element,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: getDuration(0.8),
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start,
        end,
        toggleActions: 'play none none reverse',
      },
    }
  );
};

// Text reveal animation
export const textReveal = (element: string | HTMLElement, delay = 0) => {
  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1 });
    return;
  }

  const tl = gsap.timeline({ delay });

  tl.fromTo(
    element,
    { 
      clipPath: 'inset(0 100% 0 0)',
      opacity: 0,
    },
    {
      clipPath: 'inset(0 0% 0 0)',
      opacity: 1,
      duration: getDuration(0.8),
      ease: 'power3.inOut',
    }
  );

  return tl;
};

// Parallax effect
export const parallax = (
  element: string | HTMLElement,
  speed = 0.5,
  direction: 'up' | 'down' = 'up'
) => {
  if (prefersReducedMotion()) return;

  const yPercent = direction === 'up' ? -speed * 100 : speed * 100;

  gsap.to(element, {
    yPercent,
    ease: 'none',
    scrollTrigger: {
      trigger: element,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
};

// Hover scale effect
export const hoverScale = (element: HTMLElement, scale = 1.05) => {
  if (prefersReducedMotion()) return;

  element.addEventListener('mouseenter', () => {
    gsap.to(element, { scale, duration: 0.3, ease: 'power2.out' });
  });

  element.addEventListener('mouseleave', () => {
    gsap.to(element, { scale: 1, duration: 0.3, ease: 'power2.out' });
  });
};

// Magnetic button effect
export const magneticEffect = (element: HTMLElement, strength = 0.3) => {
  if (prefersReducedMotion()) return;

  const boundingRect = element.getBoundingClientRect();
  const centerX = boundingRect.left + boundingRect.width / 2;
  const centerY = boundingRect.top + boundingRect.height / 2;

  element.addEventListener('mousemove', (e) => {
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;
    gsap.to(element, { x: deltaX, y: deltaY, duration: 0.3, ease: 'power2.out' });
  });

  element.addEventListener('mouseleave', () => {
    gsap.to(element, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  });
};









