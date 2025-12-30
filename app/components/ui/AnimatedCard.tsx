'use client';

import gsap from 'gsap';
import { type HTMLAttributes, type ReactNode, useRef, useState } from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';
import { cn } from '@/lib/utils';

interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tilt?: boolean;
  tiltIntensity?: number;
  glare?: boolean;
  glareMaxOpacity?: number;
  hoverScale?: number;
  hoverLift?: boolean;
  clickable?: boolean;
  variant?: 'default' | 'glass' | 'outline' | 'solid';
}

export function AnimatedCard({
  children,
  tilt = true,
  tiltIntensity = 10,
  glare = true,
  glareMaxOpacity = 0.15,
  hoverScale = 1.02,
  hoverLift = true,
  clickable = false,
  variant = 'default',
  className,
  onClick,
  ...props
}: AnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || prefersReducedMotion()) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    if (tilt) {
      const rotateX = ((y - centerY) / centerY) * -tiltIntensity;
      const rotateY = ((x - centerX) / centerX) * tiltIntensity;

      gsap.to(cardRef.current, {
        rotateX,
        rotateY,
        duration: 0.3,
        ease: EASING.smooth,
      });
    }

    if (glare && glareRef.current) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      glareRef.current.style.background = `
        radial-gradient(
          circle at ${glareX}% ${glareY}%,
          rgba(255, 255, 255, ${glareMaxOpacity}) 0%,
          transparent 50%
        )
      `;
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!cardRef.current || prefersReducedMotion()) return;

    const transforms: gsap.TweenVars = {};
    if (hoverScale !== 1) transforms.scale = hoverScale;
    if (hoverLift) transforms.y = -8;
    transforms.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';

    gsap.to(cardRef.current, {
      ...transforms,
      duration: getDuration(DURATION.fast),
      ease: EASING.snappy,
    });

    if (glareRef.current) {
      gsap.to(glareRef.current, { opacity: 1, duration: 0.2 });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!cardRef.current || prefersReducedMotion()) return;

    gsap.to(cardRef.current, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      y: 0,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      duration: getDuration(DURATION.medium),
      ease: EASING.smooth,
    });

    if (glareRef.current) {
      gsap.to(glareRef.current, { opacity: 0, duration: 0.2 });
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickable || prefersReducedMotion()) {
      onClick?.(e);
      return;
    }

    if (cardRef.current) {
      gsap.to(cardRef.current, {
        scale: 0.98,
        duration: 0.1,
        ease: EASING.smooth,
        onComplete: () => {
          gsap.to(cardRef.current, {
            scale: isHovered ? hoverScale : 1,
            duration: 0.2,
            ease: EASING.bounce,
          });
        },
      });
    }

    onClick?.(e);
  };

  const variants = {
    default: 'bg-surface border border-border',
    glass: 'bg-surface/50 backdrop-blur-lg border border-white/10',
    outline: 'bg-transparent border-2 border-border',
    solid: 'bg-surface-elevated',
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative rounded-xl overflow-hidden transition-colors',
        variants[variant],
        clickable && 'cursor-pointer',
        className
      )}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {/* Glare layer */}
      {glare && (
        <div
          ref={glareRef}
          className="absolute inset-0 pointer-events-none opacity-0 z-10"
          aria-hidden="true"
        />
      )}

      {/* Inner content wrapper for 3D effect */}
      <div
        className="relative z-0"
        style={{
          transform: 'translateZ(0)',
        }}
      >
        {children}
      </div>

      {/* Border glow on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(50, 205, 50, 0.3)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// Simple hover card with elevation
interface HoverCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function HoverCard({ children, className, ...props }: HoverCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl p-4',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10',
        'hover:border-primary/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
