'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  DURATION,
  EASING,
  getDuration,
  getStagger,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

gsap.registerPlugin(ScrollTrigger);

type RevealType = 'chars' | 'words' | 'lines' | 'clip' | 'fade' | 'typewriter' | 'glitch';

interface TextRevealProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  type?: RevealType;
  className?: string;
  stagger?: number;
  duration?: number;
  delay?: number;
  start?: string;
  once?: boolean;
  gradient?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
}

export default function TextReveal({
  children,
  as: Component = 'div',
  type = 'words',
  className = '',
  stagger = 0.03,
  duration = DURATION.medium,
  delay = 0,
  start = 'top 85%',
  once = true,
  gradient = false,
  gradientFrom = 'var(--primary)',
  gradientTo = 'var(--secondary)',
}: TextRevealProps) {
  const containerRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const text = children;

    if (prefersReducedMotion()) {
      container.textContent = text;
      return;
    }

    // Split text based on type
    let elements: HTMLSpanElement[] = [];

    switch (type) {
      case 'chars':
        elements = splitIntoChars(container, text);
        break;
      case 'words':
        elements = splitIntoWords(container, text);
        break;
      case 'lines':
        // For lines, we just animate the container
        container.textContent = text;
        break;
      case 'clip':
      case 'fade':
        container.textContent = text;
        break;
      case 'typewriter':
        elements = splitIntoChars(container, text);
        break;
      case 'glitch':
        container.textContent = text;
        break;
    }

    // Apply gradient if enabled
    if (gradient) {
      container.style.background = `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`;
      container.style.backgroundClip = 'text';
      container.style.webkitBackgroundClip = 'text';
      container.style.webkitTextFillColor = 'transparent';
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start,
        once,
        onEnter: () => {
          if (once && hasAnimated.current) return;
          hasAnimated.current = true;
          animateReveal(
            type,
            container,
            elements,
            getDuration(duration),
            getStagger(stagger),
            delay
          );
        },
        onLeaveBack: () => {
          if (once) return;
          reverseReveal(
            type,
            container,
            elements,
            getDuration(duration * 0.5),
            getStagger(stagger * 0.5)
          );
        },
      });
    }, container);

    return () => ctx.revert();
  }, [children, type, stagger, duration, delay, start, once, gradient, gradientFrom, gradientTo]);

  return (
    <Component
      ref={
        containerRef as React.RefObject<
          HTMLHeadingElement & HTMLParagraphElement & HTMLDivElement & HTMLSpanElement
        >
      }
      className={className}
      style={{ overflow: type === 'clip' ? 'hidden' : undefined }}
    >
      {children}
    </Component>
  );
}

function splitIntoChars(container: HTMLElement, text: string): HTMLSpanElement[] {
  container.innerHTML = '';
  const chars: HTMLSpanElement[] = [];

  text.split('').forEach((char) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.display = 'inline-block';
    span.style.opacity = '0';
    container.appendChild(span);
    chars.push(span);
  });

  return chars;
}

function splitIntoWords(container: HTMLElement, text: string): HTMLSpanElement[] {
  container.innerHTML = '';
  const words: HTMLSpanElement[] = [];

  text.split(' ').forEach((word, i, arr) => {
    const span = document.createElement('span');
    span.textContent = word;
    span.style.display = 'inline-block';
    span.style.opacity = '0';
    container.appendChild(span);
    words.push(span);

    // Add space after word (except last)
    if (i < arr.length - 1) {
      const space = document.createElement('span');
      space.innerHTML = '&nbsp;';
      space.style.display = 'inline-block';
      container.appendChild(space);
    }
  });

  return words;
}

function animateReveal(
  type: RevealType,
  container: HTMLElement,
  elements: HTMLSpanElement[],
  duration: number,
  stagger: number,
  delay: number
) {
  switch (type) {
    case 'chars':
      gsap.fromTo(
        elements,
        { opacity: 0, y: 20, rotateX: -90 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration,
          stagger,
          delay,
          ease: EASING.snappy,
        }
      );
      break;

    case 'words':
      gsap.fromTo(
        elements,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          delay,
          ease: EASING.snappy,
        }
      );
      break;

    case 'lines':
      gsap.fromTo(
        container,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: EASING.snappy,
        }
      );
      break;

    case 'clip':
      gsap.fromTo(
        container,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: duration * 1.5,
          delay,
          ease: EASING.expo,
        }
      );
      break;

    case 'fade':
      gsap.fromTo(
        container,
        { opacity: 0 },
        {
          opacity: 1,
          duration,
          delay,
          ease: EASING.smooth,
        }
      );
      break;

    case 'typewriter':
      gsap.set(elements, { opacity: 0 });
      gsap.to(elements, {
        opacity: 1,
        duration: 0.01,
        stagger: stagger * 2,
        delay,
        ease: EASING.linear,
      });
      break;

    case 'glitch': {
      // Glitch effect with random transforms
      const tl = gsap.timeline({ delay });

      tl.set(container, { opacity: 1 })
        .to(container, {
          skewX: 10,
          x: -5,
          filter: 'hue-rotate(90deg)',
          duration: 0.05,
        })
        .to(container, {
          skewX: -5,
          x: 5,
          filter: 'hue-rotate(-90deg)',
          duration: 0.05,
        })
        .to(container, {
          skewX: 0,
          x: 0,
          filter: 'hue-rotate(0deg)',
          duration: 0.1,
          ease: EASING.snappy,
        });
      break;
    }
  }
}

function reverseReveal(
  type: RevealType,
  container: HTMLElement,
  elements: HTMLSpanElement[],
  duration: number,
  stagger: number
) {
  switch (type) {
    case 'chars':
    case 'words':
      gsap.to(elements, {
        opacity: 0,
        y: -20,
        duration,
        stagger: { each: stagger, from: 'end' },
        ease: EASING.smooth,
      });
      break;

    case 'lines':
    case 'fade':
      gsap.to(container, {
        opacity: 0,
        y: -20,
        duration,
        ease: EASING.smooth,
      });
      break;

    case 'clip':
      gsap.to(container, {
        clipPath: 'inset(0 0% 0 100%)',
        duration,
        ease: EASING.expo,
      });
      break;
  }
}

// Gradient animated text
interface GradientTextProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  className?: string;
  from?: string;
  to?: string;
  via?: string;
  animate?: boolean;
  animationDuration?: number;
}

export function GradientText({
  children,
  as: Component = 'span',
  className = '',
  from = 'var(--primary)',
  to = 'var(--secondary)',
  via,
  animate = true,
  animationDuration = 3,
}: GradientTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current || !animate || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        backgroundPosition: '200% center',
        duration: animationDuration,
        repeat: -1,
        ease: EASING.linear,
      });
    }, ref);

    return () => ctx.revert();
  }, [animate, animationDuration]);

  const gradientStops = via ? `${from}, ${via}, ${to}` : `${from}, ${to}`;

  return (
    <Component
      ref={
        ref as React.RefObject<
          HTMLHeadingElement & HTMLParagraphElement & HTMLDivElement & HTMLSpanElement
        >
      }
      className={className}
      style={{
        background: `linear-gradient(90deg, ${gradientStops}, ${from})`,
        backgroundSize: '200% auto',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {children}
    </Component>
  );
}

// Highlight text (animated underline)
interface HighlightTextProps {
  children: ReactNode;
  color?: string;
  className?: string;
  animated?: boolean;
}

export function HighlightText({
  children,
  color = 'var(--primary)',
  className = '',
  animated = true,
}: HighlightTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!underlineRef.current || !animated) return;

    if (prefersReducedMotion()) {
      gsap.set(underlineRef.current, { scaleX: 1 });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              underlineRef.current,
              { scaleX: 0 },
              {
                scaleX: 1,
                duration: getDuration(DURATION.slow),
                ease: EASING.expo,
              }
            );
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [animated]);

  return (
    <span ref={ref} className={`relative inline-block ${className}`}>
      {children}
      <span
        ref={underlineRef}
        className="absolute bottom-0 left-0 w-full h-[0.15em]"
        style={{
          background: color,
          transformOrigin: 'left',
          transform: animated ? 'scaleX(0)' : 'scaleX(1)',
        }}
        aria-hidden="true"
      />
    </span>
  );
}
