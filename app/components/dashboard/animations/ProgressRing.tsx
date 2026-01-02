'use client';

import gsap from 'gsap';
import { useEffect, useId, useRef, useState } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  duration?: number;
  delay?: number;
  showValue?: boolean;
  valueClassName?: string;
  label?: string;
  labelClassName?: string;
  className?: string;
  gradient?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = COLORS.primary,
  trackColor = 'rgba(255, 255, 255, 0.1)',
  duration = DURATION.slow,
  delay = 0,
  showValue = true,
  valueClassName = '',
  label,
  labelClassName = '',
  className = '',
  gradient = false,
}: ProgressRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef({ value: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Use React's useId for stable gradient ID
  const gradientId = useId();

  useEffect(() => {
    if (!circleRef.current) return;

    const element = circleRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!circleRef.current || !isVisible) return;

    const circle = circleRef.current;
    const clampedProgress = Math.min(100, Math.max(0, progress));
    const targetOffset = circumference - (clampedProgress / 100) * circumference;

    if (prefersReducedMotion()) {
      circle.style.strokeDashoffset = String(targetOffset);
      if (valueRef.current) {
        valueRef.current.textContent = `${Math.round(clampedProgress)}%`;
      }
      return;
    }

    // Reset
    gsap.set(circle, { strokeDashoffset: circumference });
    countRef.current.value = 0;

    // Animate ring
    gsap.to(circle, {
      strokeDashoffset: targetOffset,
      duration: getDuration(duration),
      delay: getDuration(delay),
      ease: EASING.expo,
    });

    // Animate value
    if (valueRef.current) {
      gsap.to(countRef.current, {
        value: clampedProgress,
        duration: getDuration(duration),
        delay: getDuration(delay),
        ease: EASING.expo,
        onUpdate: () => {
          if (valueRef.current) {
            valueRef.current.textContent = `${Math.round(countRef.current.value)}%`;
          }
        },
      });
    }
  }, [progress, circumference, duration, delay, isVisible]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{
          filter: gradient ? 'drop-shadow(0 0 8px rgba(50, 205, 50, 0.3))' : undefined,
        }}
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={COLORS.primary} />
              <stop offset="100%" stopColor={COLORS.secondary} />
            </linearGradient>
          </defs>
        )}

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="transition-none"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span ref={valueRef} className={`text-2xl font-bold tabular-nums ${valueClassName}`}>
            0%
          </span>
        )}
        {label && <span className={`text-xs text-foreground/60 ${labelClassName}`}>{label}</span>}
      </div>
    </div>
  );
}
