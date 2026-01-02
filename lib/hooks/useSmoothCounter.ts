'use client';

/* eslint-disable react-hooks/refs */

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '../animations/gsap-config';

interface SmoothCounterOptions {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  ease?: string;
  decimals?: number;
  separator?: string;
  prefix?: string;
  suffix?: string;
  onComplete?: () => void;
  triggerOnView?: boolean;
}

interface UseSmoothCounterReturn {
  value: string;
  ref: React.RefObject<HTMLElement | null>;
  start: () => void;
  reset: () => void;
}

export function useSmoothCounter(options: SmoothCounterOptions): UseSmoothCounterReturn {
  const {
    from = 0,
    to,
    duration = DURATION.slow,
    delay = 0,
    ease = EASING.snappy,
    decimals = 0,
    separator = ',',
    prefix = '',
    suffix = '',
    onComplete,
    triggerOnView = true,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const counterRef = useRef({ value: from });
  const hasStarted = useRef(false);

  const [displayValue, setDisplayValue] = useState(() =>
    formatNumber(from, decimals, separator, prefix, suffix)
  );

  const start = useCallback(() => {
    if (prefersReducedMotion()) {
      setDisplayValue(formatNumber(to, decimals, separator, prefix, suffix));
      onComplete?.();
      return;
    }

    counterRef.current.value = from;
    hasStarted.current = true;

    tweenRef.current = gsap.to(counterRef.current, {
      value: to,
      duration: getDuration(duration),
      delay,
      ease,
      onUpdate: () => {
        setDisplayValue(
          formatNumber(counterRef.current.value, decimals, separator, prefix, suffix)
        );
      },
      onComplete,
    });
  }, [from, to, duration, delay, ease, decimals, separator, prefix, suffix, onComplete]);

  const reset = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.kill();
    }
    counterRef.current.value = from;
    hasStarted.current = false;
    setDisplayValue(formatNumber(from, decimals, separator, prefix, suffix));
  }, [from, decimals, separator, prefix, suffix]);

  useEffect(() => {
    if (!triggerOnView || !ref.current) {
      if (!triggerOnView && !hasStarted.current) {
        start();
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted.current) {
            start();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
    };
  }, [triggerOnView, start]);

  // Update when 'to' value changes
  useEffect(() => {
    if (hasStarted.current) {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }

      tweenRef.current = gsap.to(counterRef.current, {
        value: to,
        duration: getDuration(duration * 0.5),
        ease,
        onUpdate: () => {
          setDisplayValue(
            formatNumber(counterRef.current.value, decimals, separator, prefix, suffix)
          );
        },
      });
    }
  }, [to, duration, ease, decimals, separator, prefix, suffix]);

  return {
    value: displayValue,
    ref: ref as React.RefObject<HTMLElement | null>,
    start,
    reset,
  };
}

// Format number with separators
function formatNumber(
  value: number,
  decimals: number,
  separator: string,
  prefix: string,
  suffix: string
): string {
  const fixed = value.toFixed(decimals);
  const [whole, decimal] = fixed.split('.');

  // Add thousand separators
  const withSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  const formatted = decimal ? `${withSeparators}.${decimal}` : withSeparators;
  return `${prefix}${formatted}${suffix}`;
}

// Hook for multiple counters with staggered start
interface CounterConfig extends Omit<SmoothCounterOptions, 'triggerOnView'> {
  id: string;
}

export function useMultipleCounters(
  configs: CounterConfig[],
  staggerDelay: number = 0.15
): {
  values: Record<string, string>;
  ref: React.RefObject<HTMLElement | null>;
  startAll: () => void;
  resetAll: () => void;
} {
  const ref = useRef<HTMLElement>(null);
  const countersRef = useRef<Record<string, { value: number }>>({});
  const tweensRef = useRef<gsap.core.Tween[]>([]);
  const hasStarted = useRef(false);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    configs.forEach((config) => {
      countersRef.current[config.id] = { value: config.from || 0 };
      initial[config.id] = formatNumber(
        config.from || 0,
        config.decimals || 0,
        config.separator || ',',
        config.prefix || '',
        config.suffix || ''
      );
    });
    return initial;
  });

  const startAll = useCallback(() => {
    if (prefersReducedMotion()) {
      const final: Record<string, string> = {};
      configs.forEach((config) => {
        final[config.id] = formatNumber(
          config.to,
          config.decimals || 0,
          config.separator || ',',
          config.prefix || '',
          config.suffix || ''
        );
      });
      setValues(final);
      return;
    }

    hasStarted.current = true;

    configs.forEach((config, index) => {
      const counter = countersRef.current[config.id];
      counter.value = config.from || 0;

      const tween = gsap.to(counter, {
        value: config.to,
        duration: getDuration(config.duration || DURATION.slow),
        delay: (config.delay || 0) + index * staggerDelay,
        ease: config.ease || EASING.snappy,
        onUpdate: () => {
          setValues((prev) => ({
            ...prev,
            [config.id]: formatNumber(
              counter.value,
              config.decimals || 0,
              config.separator || ',',
              config.prefix || '',
              config.suffix || ''
            ),
          }));
        },
        onComplete: config.onComplete,
      });

      tweensRef.current.push(tween);
    });
  }, [configs, staggerDelay]);

  const resetAll = useCallback(() => {
    tweensRef.current.forEach((tween) => tween.kill());
    tweensRef.current = [];
    hasStarted.current = false;

    const initial: Record<string, string> = {};
    configs.forEach((config) => {
      countersRef.current[config.id].value = config.from || 0;
      initial[config.id] = formatNumber(
        config.from || 0,
        config.decimals || 0,
        config.separator || ',',
        config.prefix || '',
        config.suffix || ''
      );
    });
    setValues(initial);
  }, [configs]);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted.current) {
            startAll();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      tweensRef.current.forEach((tween) => tween.kill());
    };
  }, [startAll]);

  return {
    values,
    ref: ref as React.RefObject<HTMLElement | null>,
    startAll,
    resetAll,
  };
}

export default useSmoothCounter;
