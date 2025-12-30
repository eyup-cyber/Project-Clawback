'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React, { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import {
  DURATION,
  EASING,
  getDuration,
  getStagger,
  prefersReducedMotion,
  STAGGER,
} from '@/lib/animations/gsap-config';

// Register plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================
// SCROLL REVEAL
// ============================================

interface ScrollRevealProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  duration?: number;
  delay?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ScrollReveal({
  children,
  direction = 'up',
  distance = 50,
  duration = DURATION.medium,
  delay = 0,
  threshold = 0.2,
  once = true,
  className = '',
  style,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const element = ref.current;

    const directionMap = {
      up: { y: distance, x: 0 },
      down: { y: -distance, x: 0 },
      left: { x: distance, y: 0 },
      right: { x: -distance, y: 0 },
      none: { x: 0, y: 0 },
    };

    const from = {
      opacity: 0,
      ...directionMap[direction],
    };

    gsap.set(element, from);

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: `top ${100 - threshold * 100}%`,
      onEnter: () => {
        gsap.to(element, {
          opacity: 1,
          x: 0,
          y: 0,
          duration: getDuration(duration),
          delay: getDuration(delay),
          ease: EASING.snappy,
        });
      },
      onLeaveBack: once
        ? undefined
        : () => {
            gsap.to(element, from);
          },
      once,
    });

    return () => trigger.kill();
  }, [direction, distance, duration, delay, threshold, once]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

// ============================================
// SCROLL STAGGER
// ============================================

interface ScrollStaggerProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  stagger?: number;
  duration?: number;
  delay?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
  childSelector?: string;
}

export function ScrollStagger({
  children,
  direction = 'up',
  distance = 40,
  stagger = STAGGER.normal,
  duration = DURATION.medium,
  delay = 0,
  threshold = 0.15,
  once = true,
  className = '',
  childSelector = '& > *',
}: ScrollStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const element = ref.current;
    const children = element.querySelectorAll(childSelector.replace('& > ', ':scope > '));

    if (!children.length) return;

    const directionMap = {
      up: { y: distance, x: 0 },
      down: { y: -distance, x: 0 },
      left: { x: distance, y: 0 },
      right: { x: -distance, y: 0 },
    };

    const from = {
      opacity: 0,
      ...directionMap[direction],
    };

    gsap.set(children, from);

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: `top ${100 - threshold * 100}%`,
      onEnter: () => {
        gsap.to(children, {
          opacity: 1,
          x: 0,
          y: 0,
          duration: getDuration(duration),
          delay: getDuration(delay),
          stagger: getStagger(stagger),
          ease: EASING.snappy,
        });
      },
      onLeaveBack: once
        ? undefined
        : () => {
            gsap.to(children, {
              ...from,
              duration: getDuration(duration * 0.5),
              stagger: getStagger(stagger * 0.5),
            });
          },
      once,
    });

    return () => trigger.kill();
  }, [direction, distance, stagger, duration, delay, threshold, once, childSelector]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ============================================
// SCROLL SCALE
// ============================================

interface ScrollScaleProps {
  children: ReactNode;
  from?: number;
  to?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
}

export function ScrollScale({
  children,
  from = 0.8,
  to = 1,
  duration = DURATION.slow,
  threshold = 0.2,
  once = true,
  className = '',
}: ScrollScaleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const element = ref.current;

    gsap.set(element, { scale: from, opacity: 0 });

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: `top ${100 - threshold * 100}%`,
      onEnter: () => {
        gsap.to(element, {
          scale: to,
          opacity: 1,
          duration: getDuration(duration),
          ease: EASING.bounce,
        });
      },
      onLeaveBack: once
        ? undefined
        : () => {
            gsap.to(element, { scale: from, opacity: 0 });
          },
      once,
    });

    return () => trigger.kill();
  }, [from, to, duration, threshold, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ============================================
// SCROLL PARALLAX
// ============================================

interface ScrollParallaxProps {
  children: ReactNode;
  speed?: number;
  direction?: 'up' | 'down';
  className?: string;
  style?: CSSProperties;
}

export function ScrollParallax({
  children,
  speed = 0.3,
  direction = 'up',
  className = '',
  style,
}: ScrollParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const element = ref.current;
    const multiplier = direction === 'up' ? -1 : 1;

    gsap.to(element, {
      y: `${speed * 100 * multiplier}%`,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === element) t.kill();
      });
    };
  }, [speed, direction]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

// ============================================
// SCROLL CLIP REVEAL
// ============================================

interface ScrollClipRevealProps {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down' | 'center';
  duration?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
}

export function ScrollClipReveal({
  children,
  direction = 'left',
  duration = DURATION.slow,
  threshold = 0.2,
  once = true,
  className = '',
}: ScrollClipRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const element = ref.current;

    const clipPaths: Record<string, { from: string; to: string }> = {
      left: { from: 'inset(0 100% 0 0)', to: 'inset(0 0% 0 0)' },
      right: { from: 'inset(0 0 0 100%)', to: 'inset(0 0 0 0%)' },
      up: { from: 'inset(100% 0 0 0)', to: 'inset(0% 0 0 0)' },
      down: { from: 'inset(0 0 100% 0)', to: 'inset(0 0 0% 0)' },
      center: { from: 'inset(50% 50% 50% 50%)', to: 'inset(0% 0% 0% 0%)' },
    };

    gsap.set(element, { clipPath: clipPaths[direction].from });

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: `top ${100 - threshold * 100}%`,
      onEnter: () => {
        gsap.to(element, {
          clipPath: clipPaths[direction].to,
          duration: getDuration(duration),
          ease: EASING.expo,
        });
      },
      onLeaveBack: once
        ? undefined
        : () => {
            gsap.to(element, { clipPath: clipPaths[direction].from });
          },
      once,
    });

    return () => trigger.kill();
  }, [direction, duration, threshold, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ============================================
// SCROLL TEXT REVEAL
// ============================================

interface ScrollTextRevealProps {
  children: string;
  type?: 'words' | 'chars' | 'lines';
  stagger?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
  as?: 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export function ScrollTextReveal({
  children,
  type = 'words',
  stagger = type === 'chars' ? STAGGER.tight : STAGGER.normal,
  duration = DURATION.medium,
  threshold = 0.2,
  once = true,
  className = '',
  as = 'div',
}: ScrollTextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const element = ref.current;
    const spans = element.querySelectorAll('.text-reveal-item');

    gsap.set(spans, {
      opacity: 0,
      y: 30,
      rotateX: -45,
    });

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: `top ${100 - threshold * 100}%`,
      onEnter: () => {
        gsap.to(spans, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: getDuration(duration),
          stagger: getStagger(stagger),
          ease: EASING.snappy,
        });
      },
      onLeaveBack: once
        ? undefined
        : () => {
            gsap.to(spans, {
              opacity: 0,
              y: 30,
              rotateX: -45,
              duration: getDuration(duration * 0.5),
              stagger: getStagger(stagger * 0.5),
            });
          },
      once,
    });

    return () => trigger.kill();
  }, [type, stagger, duration, threshold, once]);

  // Split text into spans
  const splitText = () => {
    if (type === 'chars') {
      return children.split('').map((char, i) => (
        <span
          key={i}
          className="text-reveal-item inline-block"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ));
    }

    if (type === 'words') {
      return children.split(/\s+/).map((word, i) => (
        <span
          key={i}
          className="text-reveal-item inline-block mr-[0.25em]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {word}
        </span>
      ));
    }

    // Lines (split by newline or treat as single)
    return children.split('\n').map((line, i) => (
      <span key={i} className="text-reveal-item block" style={{ transformStyle: 'preserve-3d' }}>
        {line}
      </span>
    ));
  };

  const Component = as;
  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{ perspective: '1000px' }}
    >
      {splitText()}
    </Component>
  );
}

// ============================================
// SCROLL COUNTER
// ============================================

interface ScrollCounterProps {
  end: number;
  start?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function ScrollCounter({
  end,
  start = 0,
  duration = DURATION.slow,
  threshold = 0.3,
  once = true,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: ScrollCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const countRef = useRef({ value: start });

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;

    if (prefersReducedMotion()) {
      element.textContent = `${prefix}${end.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
      return;
    }

    countRef.current.value = start;
    element.textContent = `${prefix}${start}${suffix}`;

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: `top ${100 - threshold * 100}%`,
      onEnter: () => {
        gsap.to(countRef.current, {
          value: end,
          duration: getDuration(duration),
          ease: EASING.smooth,
          onUpdate: () => {
            const formatted = countRef.current.value.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            });
            element.textContent = `${prefix}${formatted}${suffix}`;
          },
        });
      },
      once,
    });

    return () => trigger.kill();
  }, [end, start, duration, threshold, once, prefix, suffix, decimals]);

  return <span ref={ref} className={className} />;
}

// ============================================
// SCROLL PROGRESS
// ============================================

interface ScrollProgressProps {
  className?: string;
  barClassName?: string;
  position?: 'top' | 'bottom';
  height?: number;
}

export function ScrollProgress({
  className = '',
  barClassName = '',
  position = 'top',
  height = 3,
}: ScrollProgressProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const bar = ref.current;

    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
      },
    });
  }, []);

  return (
    <div
      className={`fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-[9999] ${className}`}
      style={{ height }}
    >
      <div
        ref={ref}
        className={`h-full bg-primary origin-left ${barClassName}`}
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}

// ============================================
// SCROLL HORIZONTAL
// ============================================

interface ScrollHorizontalProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function ScrollHorizontal({
  children,
  className = '',
  containerClassName = '',
}: ScrollHorizontalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current || prefersReducedMotion()) return;

    const container = containerRef.current;
    const content = contentRef.current;

    const scrollWidth = content.scrollWidth - container.offsetWidth;

    gsap.to(content, {
      x: -scrollWidth,
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: `+=${scrollWidth}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === container) t.kill();
      });
    };
  }, []);

  return (
    <div ref={containerRef} className={`overflow-hidden ${containerClassName}`}>
      <div ref={contentRef} className={`flex ${className}`}>
        {children}
      </div>
    </div>
  );
}
