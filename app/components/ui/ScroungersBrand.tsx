'use client';

import gsap from 'gsap';
import { useCallback, useRef } from 'react';
import { COLORS, EASING, prefersReducedMotion } from '@/lib/animations/gsap-config';

interface ScroungersBrandProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the glow effect */
  glow?: boolean;
  /** Whether to animate on hover */
  animated?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Inline logo component for use in body text.
 * Renders "scroungers multimedia" with correct font styling:
 * - "scroungers" in lowercase HelveticaNow
 * - "multimedia" in Kindergarten
 * Both rendered inline on the same line.
 */
export default function ScroungersBrand({
  size = 'md',
  glow = true,
  animated = true,
  className = '',
}: ScroungersBrandProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const scroungerRef = useRef<HTMLSpanElement>(null);
  const multimediaRef = useRef<HTMLSpanElement>(null);

  const sizeStyles = {
    sm: {
      scroungers: 'text-sm',
      multimedia: 'text-sm',
      gap: 'gap-0.5',
    },
    md: {
      scroungers: 'text-base',
      multimedia: 'text-base',
      gap: 'gap-1',
    },
    lg: {
      scroungers: 'text-xl',
      multimedia: 'text-xl',
      gap: 'gap-1',
    },
    xl: {
      scroungers: 'text-2xl md:text-3xl',
      multimedia: 'text-2xl md:text-3xl',
      gap: 'gap-1.5',
    },
  };

  const handleMouseEnter = useCallback(() => {
    if (!animated || prefersReducedMotion()) return;

    if (scroungerRef.current) {
      gsap.to(scroungerRef.current, {
        color: COLORS.secondary,
        textShadow: `0 0 20px ${COLORS.glowSecondary}`,
        duration: 0.3,
        ease: EASING.snappy,
      });
    }

    if (multimediaRef.current) {
      gsap.to(multimediaRef.current, {
        textShadow: `0 0 15px ${COLORS.glowSecondary}`,
        duration: 0.3,
        ease: EASING.snappy,
      });
    }
  }, [animated]);

  const handleMouseLeave = useCallback(() => {
    if (!animated || prefersReducedMotion()) return;

    if (scroungerRef.current) {
      gsap.to(scroungerRef.current, {
        color: COLORS.primary,
        textShadow: glow ? `0 0 10px ${COLORS.glowPrimary}` : 'none',
        duration: 0.4,
        ease: EASING.smooth,
      });
    }

    if (multimediaRef.current) {
      gsap.to(multimediaRef.current, {
        textShadow: glow ? `0 0 8px ${COLORS.glowSecondary}` : 'none',
        duration: 0.4,
        ease: EASING.smooth,
      });
    }
  }, [animated, glow]);

  return (
    <span
      ref={containerRef}
      className={`inline-flex items-baseline ${sizeStyles[size].gap} whitespace-nowrap cursor-default select-none ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        ref={scroungerRef}
        className={`${sizeStyles[size].scroungers} font-medium lowercase`}
        style={{
          fontFamily: 'var(--font-body)',
          color: COLORS.primary,
          textShadow: glow ? `0 0 10px ${COLORS.glowPrimary}` : undefined,
          fontWeight: 500,
        }}
      >
        scroungers
      </span>
      <span
        ref={multimediaRef}
        className={`${sizeStyles[size].multimedia} lowercase`}
        style={{
          fontFamily: 'var(--font-kindergarten)',
          color: COLORS.secondary,
          textShadow: glow ? `0 0 8px ${COLORS.glowSecondary}` : undefined,
        }}
      >
        multimedia
      </span>
    </span>
  );
}

/**
 * Nav logo variant - horizontal, almost touching, for navigation bar
 */
export function NavLogo({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const scroungerRef = useRef<HTMLSpanElement>(null);
  const multimediaRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (prefersReducedMotion()) return;

    if (scroungerRef.current) {
      gsap.to(scroungerRef.current, {
        color: COLORS.secondary,
        textShadow: `0 0 25px ${COLORS.glowSecondary}`,
        duration: 0.3,
        ease: EASING.snappy,
      });
    }

    if (multimediaRef.current) {
      gsap.to(multimediaRef.current, {
        color: COLORS.secondary,
        textShadow: `0 0 20px ${COLORS.glowSecondary}`,
        duration: 0.3,
        ease: EASING.snappy,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (prefersReducedMotion()) return;

    if (scroungerRef.current) {
      gsap.to(scroungerRef.current, {
        color: COLORS.primary,
        textShadow: `0 0 15px ${COLORS.glowPrimary}`,
        duration: 0.4,
        ease: EASING.smooth,
      });
    }

    if (multimediaRef.current) {
      gsap.to(multimediaRef.current, {
        color: COLORS.secondary,
        textShadow: `0 0 10px ${COLORS.glowSecondary}`,
        duration: 0.4,
        ease: EASING.smooth,
      });
    }
  }, []);

  return (
    <span
      ref={containerRef}
      className={`inline-flex items-baseline cursor-pointer select-none ${className}`}
      style={{ gap: '0.15em' }} // Almost touching
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        ref={scroungerRef}
        className="text-lg sm:text-xl lg:text-2xl font-medium lowercase tracking-tight"
        style={{
          fontFamily: 'var(--font-body)',
          color: COLORS.primary,
          textShadow: `0 0 15px ${COLORS.glowPrimary}`,
          fontWeight: 500,
        }}
      >
        scroungers
      </span>
      <span
        ref={multimediaRef}
        className="text-base sm:text-lg lg:text-xl lowercase"
        style={{
          fontFamily: 'var(--font-kindergarten)',
          color: COLORS.secondary,
          textShadow: `0 0 10px ${COLORS.glowSecondary}`,
        }}
      >
        multimedia
      </span>
    </span>
  );
}
