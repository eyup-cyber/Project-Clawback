'use client';

import gsap from 'gsap';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

interface AnimatedStatProps {
  value: number | string;
  label: string;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  format?: 'number' | 'currency' | 'percentage' | 'compact';
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  delay?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'minimal';
}

export function AnimatedStat({
  value,
  label,
  icon,
  trend,
  trendLabel,
  format = 'number',
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = DURATION.slow,
  delay = 0,
  className = '',
  size = 'md',
  variant = 'default',
}: AnimatedStatProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef({ value: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  // Format function must be defined before use and stable
  const formatValue = useCallback(
    (num: number): string => {
      let formatted: string;

      switch (format) {
        case 'currency':
          formatted = num.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
          break;
        case 'percentage':
          formatted = num.toLocaleString(undefined, {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
          break;
        case 'compact':
          formatted = Intl.NumberFormat(undefined, {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(num);
          break;
        default:
          formatted = num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
      }

      return `${prefix}${formatted}${suffix}`;
    },
    [format, decimals, prefix, suffix]
  );

  // Intersection observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  // Animation
  useEffect(() => {
    if (!valueRef.current || !isVisible) return;

    const element = valueRef.current;

    if (prefersReducedMotion() || typeof value === 'string') {
      element.textContent = formatValue(numericValue);
      return;
    }

    countRef.current.value = 0;
    element.textContent = formatValue(0);

    gsap.to(countRef.current, {
      value: numericValue,
      duration: getDuration(duration),
      delay: getDuration(delay),
      ease: EASING.expo,
      onUpdate: () => {
        element.textContent = formatValue(countRef.current.value);
      },
    });
  }, [
    numericValue,
    duration,
    delay,
    isVisible,
    format,
    decimals,
    prefix,
    suffix,
    value,
    formatValue,
  ]);

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current || !isVisible || prefersReducedMotion()) return;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: getDuration(DURATION.medium),
        delay: getDuration(delay),
        ease: EASING.snappy,
      }
    );
  }, [isVisible, delay]);

  const sizeClasses = {
    sm: { value: 'text-xl', label: 'text-xs', icon: 'w-4 h-4' },
    md: { value: 'text-3xl', label: 'text-sm', icon: 'w-5 h-5' },
    lg: { value: 'text-4xl', label: 'text-base', icon: 'w-6 h-6' },
  };

  const variantClasses = {
    default: '',
    card: 'p-4 rounded-lg bg-surface border border-border',
    minimal: '',
  };

  const getTrendColor = () => {
    if (trend === undefined) return '';
    if (trend > 0) return 'text-green-500';
    if (trend < 0) return 'text-red-500';
    return 'text-foreground/40';
  };

  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0)
      return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    if (trend < 0)
      return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-1 ${variantClasses[variant]} ${className}`}
      style={{ opacity: 0 }}
    >
      {/* Header with icon */}
      {(icon || label) && (
        <div className="flex items-center gap-2 text-foreground/60">
          {icon && <span className={sizeClasses[size].icon}>{icon}</span>}
          <span className={sizeClasses[size].label}>{label}</span>
        </div>
      )}

      {/* Value */}
      <span ref={valueRef} className={`font-bold tabular-nums ${sizeClasses[size].value}`}>
        {formatValue(0)}
      </span>

      {/* Trend */}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-foreground/40">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
