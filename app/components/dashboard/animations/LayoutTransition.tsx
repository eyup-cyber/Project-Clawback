'use client';

import gsap from 'gsap';
import { Flip } from 'gsap/dist/Flip';
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';

import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';

// Register plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(Flip);
}

interface LayoutTransitionProps {
  children: ReactNode;
  layoutId?: string;
  duration?: number;
  ease?: string;
  className?: string;
  style?: CSSProperties;
  onLayoutComplete?: () => void;
}

export function LayoutTransition({
  children,
  layoutId,
  duration = DURATION.medium,
  ease = EASING.smooth,
  className = '',
  style,
  onLayoutComplete,
}: LayoutTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<Flip.FlipState | null>(null);

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion()) return;

    const container = containerRef.current;

    // Capture initial state
    stateRef.current = Flip.getState(container);

    return () => {
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !stateRef.current || prefersReducedMotion()) return;

    const container = containerRef.current;

    // Animate from previous state
    Flip.from(stateRef.current, {
      duration: getDuration(duration),
      ease,
      onComplete: () => {
        stateRef.current = Flip.getState(container);
        onLayoutComplete?.();
      },
    });
  }, [children, duration, ease, onLayoutComplete]);

  return (
    <div ref={containerRef} className={className} style={style} data-layout-id={layoutId}>
      {children}
    </div>
  );
}

// ============================================
// ANIMATED LIST
// ============================================

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
  itemClassName?: string;
  stagger?: number;
  duration?: number;
}

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
  itemClassName = '',
  stagger = 0.05,
  duration = DURATION.quick,
}: AnimatedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevItemsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion()) {
      prevItemsRef.current = items.map(keyExtractor);
      return;
    }

    const container = containerRef.current;
    const currentKeys = items.map(keyExtractor);
    const prevKeys = prevItemsRef.current;

    // Find new items
    const newKeys = currentKeys.filter((key) => !prevKeys.includes(key));

    // Animate new items
    newKeys.forEach((key, i) => {
      const element = container.querySelector(`[data-item-key="${key}"]`);
      if (element) {
        gsap.fromTo(
          element,
          { opacity: 0, y: 20, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: getDuration(duration),
            delay: i * stagger,
            ease: EASING.snappy,
          }
        );
      }
    });

    // Find removed items (they're already gone, but we can track)
    prevItemsRef.current = currentKeys;
  }, [items, keyExtractor, stagger, duration]);

  return (
    <div ref={containerRef} className={className}>
      {items.map((item, index) => (
        <div key={keyExtractor(item)} data-item-key={keyExtractor(item)} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

// ============================================
// LAYOUT MORPH
// ============================================

interface LayoutMorphProps {
  children: ReactNode;
  active: boolean;
  duration?: number;
  className?: string;
  activeClassName?: string;
}

export function LayoutMorph({
  children,
  active,
  duration = DURATION.medium,
  className = '',
  activeClassName = '',
}: LayoutMorphProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef<Flip.FlipState | null>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    // Save state before class change
    stateRef.current = Flip.getState(ref.current);
  }, [active]);

  useEffect(() => {
    if (!ref.current || !stateRef.current || prefersReducedMotion()) return;

    Flip.from(stateRef.current, {
      duration: getDuration(duration),
      ease: EASING.smooth,
      absolute: true,
    });
  }, [active, duration]);

  return (
    <div ref={ref} className={`${className} ${active ? activeClassName : ''}`}>
      {children}
    </div>
  );
}
