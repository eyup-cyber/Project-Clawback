'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

interface LoadingScreenProps {
  onComplete?: () => void;
  minimumDuration?: number;
}

export function LoadingScreen({ onComplete, minimumDuration = 1500 }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      onComplete?.();
      return;
    }

    const startTime = Date.now();

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 15;
        return Math.min(next, 95);
      });
    }, 200);

    // Entrance animation
    const entranceTl = gsap.timeline();

    if (logoRef.current) {
      gsap.set(logoRef.current, { scale: 0.8, opacity: 0 });
      entranceTl.to(logoRef.current, {
        scale: 1,
        opacity: 1,
        duration: getDuration(DURATION.medium),
        ease: EASING.bounce,
      });
    }

    if (textRef.current) {
      const letters = textRef.current.querySelectorAll('.letter');
      gsap.set(letters, { y: 20, opacity: 0 });
      entranceTl.to(
        letters,
        {
          y: 0,
          opacity: 1,
          stagger: 0.05,
          duration: getDuration(DURATION.quick),
          ease: EASING.snappy,
        },
        '-=0.3'
      );
    }

    // Complete after minimum duration
    const timeout = setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minimumDuration - elapsed);

      setTimeout(() => {
        // Exit animation
        if (containerRef.current) {
          gsap.to(containerRef.current, {
            opacity: 0,
            scale: 1.1,
            duration: getDuration(DURATION.medium),
            ease: EASING.smooth,
            onComplete: () => onComplete?.(),
          });
        }
      }, remaining + 300);
    }, minimumDuration - 300);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeout);
      entranceTl.kill();
    };
  }, [onComplete, minimumDuration]);

  // Pulsing glow animation
  useEffect(() => {
    if (!logoRef.current || prefersReducedMotion()) return;

    const glow = gsap.to(logoRef.current, {
      boxShadow: `0 0 60px ${COLORS.glowPrimary}, 0 0 100px ${COLORS.glowPrimary}`,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    return () => {
      glow.kill();
    };
  }, []);

  const scroungers = 'scroungers'.split('');

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-background"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-3xl animate-blob"
          style={{
            background: `radial-gradient(circle, ${COLORS.glowPrimary} 0%, transparent 70%)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Logo */}
      <div
        ref={logoRef}
        className="relative z-10 mb-8"
        style={{
          boxShadow: `0 0 30px ${COLORS.glowPrimary}`,
          borderRadius: '50%',
        }}
      >
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <span className="text-4xl font-bold text-background">S</span>
        </div>
      </div>

      {/* Text */}
      <div ref={textRef} className="relative z-10 mb-8">
        <h1 className="text-3xl font-medium text-primary">
          {scroungers.map((char, i) => (
            <span key={i} className="letter inline-block">
              {char}
            </span>
          ))}
        </h1>
        <p className="text-secondary text-center tracking-widest mt-1">MULTIMEDIA</p>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          ref={progressRef}
          className="h-full bg-primary transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Loading text */}
      <p className="relative z-10 mt-4 text-foreground/40 text-sm">
        Loading... {Math.round(progress)}%
      </p>
    </div>
  );
}

// Skeleton loader component
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'wave',
}: SkeletonProps) {
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={`
        bg-white/10
        ${variants[variant]}
        ${animations[animation]}
        ${className}
      `}
      style={{
        width: width ?? '100%',
        height: height ?? (variant === 'text' ? '1em' : '100%'),
        backgroundImage:
          animation === 'wave'
            ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)'
            : undefined,
        backgroundSize: animation === 'wave' ? '200% 100%' : undefined,
      }}
    />
  );
}

// Content loader for cards
export function CardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
      <Skeleton variant="rectangular" height={150} />
      <div className="space-y-2">
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="90%" height={16} />
        <Skeleton variant="text" width="50%" height={16} />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={100} height={14} />
      </div>
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 p-3 bg-white/5 rounded-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={`${100 / columns}%`}
              height={14}
              animation={colIndex === 0 ? 'wave' : 'pulse'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
