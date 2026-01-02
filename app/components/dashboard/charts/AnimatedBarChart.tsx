'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  getStagger,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface AnimatedBarChartProps {
  data: BarData[];
  width?: number;
  height?: number;
  barColor?: string;
  showValues?: boolean;
  showLabels?: boolean;
  animate?: boolean;
  duration?: number;
  stagger?: number;
  horizontal?: boolean;
  className?: string;
  barRadius?: number;
  barGap?: number;
}

export function AnimatedBarChart({
  data,
  width = 400,
  height = 200,
  barColor = COLORS.primary,
  showValues = true,
  showLabels = true,
  animate = true,
  duration = DURATION.medium,
  stagger = 0.05,
  horizontal = false,
  className = '',
  barRadius = 4,
  barGap = 8,
}: AnimatedBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const maxValue = Math.max(...data.map((d) => d.value));

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
    if (!isVisible || !animate || prefersReducedMotion()) return;

    barsRef.current.forEach((bar, i) => {
      if (!bar) return;

      const targetValue = (data[i].value / maxValue) * 100;

      gsap.fromTo(
        bar,
        { [horizontal ? 'width' : 'height']: '0%' },
        {
          [horizontal ? 'width' : 'height']: `${targetValue}%`,
          duration: getDuration(duration),
          delay: getStagger(stagger) * i,
          ease: EASING.expo,
        }
      );
    });
  }, [isVisible, animate, duration, stagger, horizontal, maxValue, data]);

  const setBarRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) barsRef.current[i] = el;
  };

  if (horizontal) {
    return (
      <div ref={containerRef} className={`flex flex-col gap-2 ${className}`}>
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            {showLabels && (
              <div className="w-20 text-sm text-foreground/60 truncate">{item.label}</div>
            )}
            <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
              <div
                ref={setBarRef(i)}
                className="h-full flex items-center justify-end px-2 transition-none"
                style={{
                  backgroundColor: item.color || barColor,
                  borderRadius: barRadius,
                  width: animate ? '0%' : `${(item.value / maxValue) * 100}%`,
                }}
              >
                {showValues && (
                  <span className="text-xs font-medium text-background">{item.value}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Vertical bars
  const barWidth = (width - (data.length - 1) * barGap) / data.length;

  return (
    <div ref={containerRef} className={className}>
      <div className="flex items-end justify-between" style={{ height, gap: barGap }}>
        {data.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1" style={{ width: barWidth }}>
            <div
              className="w-full bg-white/5 rounded-t overflow-hidden flex flex-col justify-end"
              style={{ height: height - 24 }}
            >
              <div
                ref={setBarRef(i)}
                className="w-full transition-none"
                style={{
                  backgroundColor: item.color || barColor,
                  borderRadius: `${barRadius}px ${barRadius}px 0 0`,
                  height: animate ? '0%' : `${(item.value / maxValue) * 100}%`,
                }}
              />
            </div>
            {showLabels && (
              <div className="text-xs text-foreground/60 truncate w-full text-center">
                {item.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
