'use client';

import React, { type ReactNode, forwardRef, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, getDuration, DURATION, EASING } from '@/lib/animations/gsap-config';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface TypographyProps {
  children: ReactNode;
  className?: string;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'label';
  animate?:
    | 'none'
    | 'fadeIn'
    | 'slideUp'
    | 'slideDown'
    | 'slideLeft'
    | 'slideRight'
    | 'scale'
    | 'reveal';
  delay?: number;
  as?: React.ElementType;
}

const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ children, className, variant = 'body', animate = 'none', delay = 0, as, ...props }, ref) => {
    const internalRef = useRef<HTMLElement | null>(null);

    // Merge refs using callback pattern
    const setRef = useCallback(
      (node: HTMLElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      [ref]
    );

    useEffect(() => {
      const element = internalRef.current;

      if (animate === 'none' || prefersReducedMotion()) {
        if (element) {
          gsap.set(element, { opacity: 1, clearProps: 'all' });
        }
        return;
      }

      if (!element) return;

      // Set initial state based on animation type
      const initialStates: Record<string, gsap.TweenVars> = {
        fadeIn: { opacity: 0 },
        slideUp: { opacity: 0, y: 40 },
        slideDown: { opacity: 0, y: -40 },
        slideLeft: { opacity: 0, x: 40 },
        slideRight: { opacity: 0, x: -40 },
        scale: { opacity: 0, scale: 0.8 },
        reveal: { clipPath: 'inset(0 100% 0 0)' },
      };

      gsap.set(element, initialStates[animate] || {});

      // Animate on scroll
      const animationProps: Record<string, gsap.TweenVars> = {
        fadeIn: { opacity: 1, duration: getDuration(DURATION.medium), ease: EASING.smooth, delay },
        slideUp: {
          opacity: 1,
          y: 0,
          duration: getDuration(DURATION.medium),
          ease: EASING.snappy,
          delay,
        },
        slideDown: {
          opacity: 1,
          y: 0,
          duration: getDuration(DURATION.medium),
          ease: EASING.snappy,
          delay,
        },
        slideLeft: {
          opacity: 1,
          x: 0,
          duration: getDuration(DURATION.medium),
          ease: EASING.snappy,
          delay,
        },
        slideRight: {
          opacity: 1,
          x: 0,
          duration: getDuration(DURATION.medium),
          ease: EASING.snappy,
          delay,
        },
        scale: {
          opacity: 1,
          scale: 1,
          duration: getDuration(DURATION.medium),
          ease: EASING.bounce,
          delay,
        },
        reveal: {
          clipPath: 'inset(0 0% 0 0)',
          duration: getDuration(DURATION.slow),
          ease: EASING.expo,
          delay,
        },
      };

      gsap.to(element, {
        ...animationProps[animate],
        scrollTrigger: {
          trigger: element,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });

      return () => {
        gsap.killTweensOf(element);
      };
    }, [animate, delay]);

    const variantStyles = {
      h1: 'text-4xl sm:text-5xl md:text-6xl font-bold',
      h2: 'text-3xl sm:text-4xl md:text-5xl font-bold',
      h3: 'text-2xl sm:text-3xl md:text-4xl font-bold',
      h4: 'text-xl sm:text-2xl md:text-3xl font-semibold',
      h5: 'text-lg sm:text-xl md:text-2xl font-semibold',
      h6: 'text-base sm:text-lg md:text-xl font-semibold',
      body: 'text-base leading-relaxed',
      caption: 'text-sm text-[var(--foreground)] opacity-70',
      label: 'text-sm font-medium uppercase tracking-wider',
    };

    const fontFamilies = {
      h1: 'var(--font-display)',
      h2: 'var(--font-display)',
      h3: 'var(--font-body)',
      h4: 'var(--font-body)',
      h5: 'var(--font-body)',
      h6: 'var(--font-body)',
      body: 'var(--font-body)',
      caption: 'var(--font-body)',
      label: 'var(--font-body)',
    };

    const defaultElements = {
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
      body: 'p',
      caption: 'span',
      label: 'label',
    };

    // Dynamic element rendering using createElement to avoid TypeScript JSX issues
    const Tag = as || defaultElements[variant];

    return React.createElement(
      Tag,
      // eslint-disable-next-line react-hooks/refs -- Callback ref is valid for forwardRef components
      {
        ref: setRef,
        className: cn(variantStyles[variant], className),
        style: { fontFamily: fontFamilies[variant] },
        ...props,
      },
      children
    );
  }
);

Typography.displayName = 'Typography';

export default Typography;

// Convenience components
export const Heading1 = forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="h1" {...props} />
);
Heading1.displayName = 'Heading1';

export const Heading2 = forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="h2" {...props} />
);
Heading2.displayName = 'Heading2';

export const Heading3 = forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="h3" {...props} />
);
Heading3.displayName = 'Heading3';

export const Body = forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="body" {...props} />
);
Body.displayName = 'Body';

export const Caption = forwardRef<HTMLSpanElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="caption" {...props} />
);
Caption.displayName = 'Caption';

export const Label = forwardRef<HTMLLabelElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="label" {...props} />
);
Label.displayName = 'Label';
