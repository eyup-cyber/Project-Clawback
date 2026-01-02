'use client';

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';

interface StatCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  delay?: number;
  className?: string;
  label?: string;
  labelClassName?: string;
  trend?: number;
  trendLabel?: string;
}

export function StatCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = DURATION.slow,
  delay = 0,
  className = '',
  label,
  labelClassName = '',
  trend,
  trendLabel,
}: StatCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef({ value: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Format function must be defined before use
  const formatNumber = useCallback(
    (num: number): string => {
      const formatted = num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix}${formatted}${suffix}`;
    },
    [decimals, prefix, suffix]
  );

  useEffect(() => {
    if (!counterRef.current) return;

    const element = counterRef.current;

    // Intersection observer to trigger on visibility
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
    if (!counterRef.current || !isVisible) return;

    const element = counterRef.current;

    if (prefersReducedMotion()) {
      element.textContent = formatNumber(value);
      return;
    }

    // Reset and animate
    countRef.current.value = 0;
    element.textContent = formatNumber(0);

    gsap.to(countRef.current, {
      value,
      duration: getDuration(duration),
      delay: getDuration(delay),
      ease: EASING.expo,
      onUpdate: () => {
        element.textContent = formatNumber(countRef.current.value);
      },
    });
  }, [value, duration, delay, decimals, isVisible, formatNumber, prefix, suffix]);

  const getTrendColor = () => {
    if (trend === undefined) return '';
    if (trend > 0) return 'text-green-500';
    if (trend < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0) return '↑';
    if (trend < 0) return '↓';
    return '→';
  };

  return (
    <div className="flex flex-col">
      <span ref={counterRef} className={`tabular-nums ${className}`}>
        {formatNumber(0)}
      </span>

      {label && <span className={`text-sm text-foreground/60 ${labelClassName}`}>{label}</span>}

      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-sm ${getTrendColor()}`}>
          <span>{getTrendIcon()}</span>
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-foreground/40">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
