'use client';

import { useRef, type ReactNode, useEffect, useState } from 'react';
import gsap from 'gsap';
import { EASING, COLORS, prefersReducedMotion, getDuration, DURATION } from '@/lib/animations/gsap-config';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  tilt?: boolean;
  lift?: boolean;
  glow?: boolean;
  glowColor?: string;
  parallaxImage?: boolean;
  shimmer?: boolean;
  maxTilt?: number;
  liftHeight?: number;
  disabled?: boolean;
  revealAnimation?: 'clip' | 'mask' | 'fade' | 'scale' | 'none';
  depth?: number; // 0-1 for parallax depth
}

export default function AnimatedCard({
  children,
  className = '',
  href,
  onClick,
  tilt = true,
  lift = true,
  glow = true,
  glowColor = COLORS.glowPrimary,
  parallaxImage = true,
  shimmer = false,
  maxTilt = 10,
  liftHeight = 10,
  disabled = false,
}: AnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!cardRef.current || disabled || prefersReducedMotion()) return;

    const card = cardRef.current;
    const content = contentRef.current;
    const glowEl = glowRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // 3D tilt effect
      if (tilt) {
        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        gsap.to(card, {
          rotateX,
          rotateY,
          duration: 0.4,
          ease: EASING.smooth,
        });
      }

      // Parallax content movement with depth
      if (parallaxImage && content) {
        const depthMultiplier = 1 - depth; // Invert so higher depth = more movement
        const moveX = ((x - centerX) / centerX) * 5 * depthMultiplier;
        const moveY = ((y - centerY) / centerY) * 5 * depthMultiplier;

        gsap.to(content, {
          x: moveX,
          y: moveY,
          duration: 0.4,
          ease: EASING.smooth,
        });
      }

      // Moving glow effect
      if (glow && glowEl) {
        gsap.to(glowEl, {
          x: (x / rect.width) * 100 - 50 + '%',
          y: (y / rect.height) * 100 - 50 + '%',
          opacity: 0.8,
          duration: 0.4,
          ease: EASING.smooth,
        });
      }
    };

    const handleMouseEnter = () => {
      setIsHovering(true);

      // Lift effect
      if (lift) {
        gsap.to(card, {
          y: -liftHeight,
          boxShadow: `0 ${liftHeight + 10}px 40px rgba(0, 0, 0, 0.3)`,
          duration: 0.4,
          ease: EASING.snappy,
        });
      }

      // Scale content slightly
      if (content) {
        gsap.to(content, {
          scale: 1.02,
          duration: 0.4,
          ease: EASING.snappy,
        });
      }
    };

    const handleMouseLeave = () => {
      setIsHovering(false);

      // Reset tilt
      if (tilt) {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.6,
          ease: EASING.elastic,
        });
      }

      // Reset lift
      if (lift) {
        gsap.to(card, {
          y: 0,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          duration: 0.4,
          ease: EASING.snappy,
        });
      }

      // Reset content
      if (content) {
        gsap.to(content, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.4,
          ease: EASING.snappy,
        });
      }

      // Hide glow
      if (glowEl) {
        gsap.to(glowEl, {
          opacity: 0,
          duration: 0.4,
          ease: EASING.smooth,
        });
      }
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [tilt, lift, glow, parallaxImage, maxTilt, liftHeight, disabled]);

  // Shimmer loading effect
  useEffect(() => {
    if (!shimmer || !shimmerRef.current || prefersReducedMotion()) return;

    gsap.to(shimmerRef.current, {
      x: '200%',
      duration: 1.5,
      repeat: -1,
      ease: EASING.linear,
    });
  }, [shimmer]);

  // Reveal animation on mount
  useEffect(() => {
    if (!cardRef.current || revealAnimation === 'none' || prefersReducedMotion()) {
      if (cardRef.current) {
        gsap.set(cardRef.current, { opacity: 1, clearProps: 'all' });
      }
      return;
    }

    const card = cardRef.current;
    const initialStates: Record<string, gsap.TweenVars> = {
      clip: { clipPath: 'inset(0 100% 0 0)' },
      mask: { maskImage: 'linear-gradient(to right, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)' },
      fade: { opacity: 0 },
      scale: { opacity: 0, scale: 0.8 },
    };

    gsap.set(card, initialStates[revealAnimation] || {});

    const animations: Record<string, gsap.TweenVars> = {
      clip: { clipPath: 'inset(0 0% 0 0)', duration: getDuration(DURATION.slow), ease: EASING.expo },
      mask: { maskImage: 'linear-gradient(to right, black 100%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 100%, transparent 100%)', duration: getDuration(DURATION.slow), ease: EASING.expo },
      fade: { opacity: 1, duration: getDuration(DURATION.medium), ease: EASING.smooth },
      scale: { opacity: 1, scale: 1, duration: getDuration(DURATION.medium), ease: EASING.bounce },
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(card, animations[revealAnimation]);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(card);

    return () => observer.disconnect();
  }, [revealAnimation]);

  const handleClick = () => {
    if (disabled) return;
    
    if (href) {
      window.location.href = href;
    } else {
      onClick?.();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`
        relative rounded-xl overflow-hidden cursor-pointer
        ${disabled ? 'pointer-events-none opacity-50' : ''}
        ${className}
      `}
      onClick={handleClick}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}
      role={href || onClick ? 'button' : undefined}
      tabIndex={href || onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Glow overlay */}
      {glow && (
        <div
          ref={glowRef}
          className="absolute w-32 h-32 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            opacity: 0,
            filter: 'blur(20px)',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
          aria-hidden="true"
        />
      )}

      {/* Shimmer overlay */}
      {shimmer && (
        <div
          ref={shimmerRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
            transform: 'translateX(-100%)',
            zIndex: 15,
          }}
          aria-hidden="true"
        />
      )}

      {/* Content wrapper */}
      <div
        ref={contentRef}
        className="relative z-5"
        style={{ willChange: 'transform' }}
      >
        {children}
      </div>

      {/* Hover border glow */}
      {isHovering && glow && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            border: `1px solid ${COLORS.primary}`,
            boxShadow: `inset 0 0 20px ${glowColor}`,
            opacity: 0.5,
            zIndex: 20,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Skeleton card for loading states
interface SkeletonCardProps {
  className?: string;
  aspectRatio?: string;
  lines?: number;
}

export function SkeletonCard({ 
  className = '', 
  aspectRatio = '16/9',
  lines = 3,
}: SkeletonCardProps) {
  const shimmerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shimmerRef.current || prefersReducedMotion()) return;

    gsap.to(shimmerRef.current, {
      x: '200%',
      duration: 1.5,
      repeat: -1,
      ease: EASING.linear,
    });
  }, []);

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{ background: 'var(--surface)' }}
    >
      {/* Image skeleton */}
      <div
        className="w-full bg-gradient-to-br from-[var(--background)] to-[var(--surface)]"
        style={{ aspectRatio }}
      />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-[var(--background)]"
            style={{ 
              width: i === 0 ? '80%' : i === lines - 1 ? '40%' : '100%',
            }}
          />
        ))}
      </div>

      {/* Shimmer overlay */}
      <div
        ref={shimmerRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
          transform: 'translateX(-100%)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// Reveal card animation wrapper
interface RevealCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function RevealCard({ children, className = '', delay = 0 }: RevealCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;

    if (prefersReducedMotion()) {
      gsap.set(cardRef.current, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(cardRef.current, { opacity: 0, y: 40 });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(cardRef.current, {
              opacity: 1,
              y: 0,
              duration: getDuration(DURATION.medium),
              delay,
              ease: EASING.snappy,
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={cardRef} className={className}>
      {children}
    </div>
  );
}



