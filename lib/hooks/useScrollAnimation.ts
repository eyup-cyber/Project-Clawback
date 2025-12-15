'use client';

import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ANIMATION, EASING, DURATION, STAGGER, SCROLL_TRIGGER, prefersReducedMotion, getDuration, getStagger } from '../animations/gsap-config';

gsap.registerPlugin(ScrollTrigger);

type AnimationType = keyof typeof ANIMATION;

interface ScrollAnimationOptions {
  animation?: AnimationType;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  pin?: boolean;
  markers?: boolean;
  toggleActions?: string;
  stagger?: number;
  delay?: number;
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
}

interface UseScrollAnimationReturn {
  ref: React.RefObject<HTMLElement | null>;
  triggerAnimation: () => void;
  reverseAnimation: () => void;
}

export function useScrollAnimation(options: ScrollAnimationOptions = {}): UseScrollAnimationReturn {
  const ref = useRef<HTMLElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  const {
    animation = 'fadeInUp',
    from,
    to,
    start = SCROLL_TRIGGER.start.nearBottom,
    end,
    scrub = false,
    pin = false,
    markers = false,
    toggleActions = SCROLL_TRIGGER.actions.playReverse,
    stagger,
    delay = 0,
    onEnter,
    onLeave,
    onEnterBack,
    onLeaveBack,
  } = options;

  const triggerAnimation = useCallback(() => {
    if (!ref.current || prefersReducedMotion()) return;
    
    const preset = ANIMATION[animation];
    const fromVars = from || preset.from;
    const toVars = to || preset.to;

    animationRef.current = gsap.fromTo(ref.current, fromVars, {
      ...toVars,
      duration: getDuration(toVars.duration as number || DURATION.medium),
      delay,
    });
  }, [animation, from, to, delay]);

  const reverseAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.reverse();
    }
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    if (prefersReducedMotion()) {
      // Set final state immediately
      const preset = ANIMATION[animation];
      const toVars = to || preset.to;
      gsap.set(ref.current, { opacity: 1, x: 0, y: 0, scale: 1, ...toVars });
      return;
    }

    const preset = ANIMATION[animation];
    const fromVars = from || preset.from;
    const toVars = to || preset.to;

    const ctx = gsap.context(() => {
      // Set initial state
      gsap.set(ref.current, fromVars);

      // Create animation with ScrollTrigger
      animationRef.current = gsap.to(ref.current, {
        ...toVars,
        duration: getDuration(toVars.duration as number || DURATION.medium),
        stagger: stagger ? getStagger(stagger) : undefined,
        delay,
        scrollTrigger: {
          trigger: ref.current,
          start,
          end,
          scrub,
          pin,
          markers,
          toggleActions,
          onEnter,
          onLeave,
          onEnterBack,
          onLeaveBack,
          onRefresh: (self) => {
            scrollTriggerRef.current = self;
          },
        },
      });
    }, ref);

    return () => {
      ctx.revert();
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
    };
  }, [animation, from, to, start, end, scrub, pin, markers, toggleActions, stagger, delay, onEnter, onLeave, onEnterBack, onLeaveBack]);

  return { ref: ref as React.RefObject<HTMLElement | null>, triggerAnimation, reverseAnimation };
}

// Hook for staggered children animations
interface StaggerOptions extends ScrollAnimationOptions {
  childSelector?: string;
  staggerAmount?: number;
  staggerFrom?: 'start' | 'end' | 'center' | 'edges' | 'random';
}

export function useStaggeredScrollAnimation(options: StaggerOptions = {}) {
  const ref = useRef<HTMLElement>(null);
  
  const {
    animation = 'fadeInUp',
    childSelector = '> *',
    staggerAmount = STAGGER.normal,
    staggerFrom = 'start',
    start = SCROLL_TRIGGER.start.nearBottom,
    scrub = false,
    markers = false,
    toggleActions = SCROLL_TRIGGER.actions.playReverse,
    delay = 0,
  } = options;

  useEffect(() => {
    if (!ref.current) return;

    const children = ref.current.querySelectorAll(childSelector);
    if (!children.length) return;

    if (prefersReducedMotion()) {
      gsap.set(children, { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }

    const preset = ANIMATION[animation];

    const ctx = gsap.context(() => {
      gsap.set(children, preset.from);

      gsap.to(children, {
        ...preset.to,
        duration: getDuration(preset.to.duration as number || DURATION.medium),
        stagger: {
          amount: getStagger(staggerAmount * children.length),
          from: staggerFrom,
        },
        delay,
        scrollTrigger: {
          trigger: ref.current,
          start,
          scrub,
          markers,
          toggleActions,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [animation, childSelector, staggerAmount, staggerFrom, start, scrub, markers, toggleActions, delay]);

  return ref;
}

// Hook for parallax scroll effects
interface ParallaxScrollOptions {
  speed?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  start?: string;
  end?: string;
}

export function useParallaxScroll(options: ParallaxScrollOptions = {}) {
  const ref = useRef<HTMLElement>(null);
  
  const {
    speed = 0.5,
    direction = 'up',
    start = 'top bottom',
    end = 'bottom top',
  } = options;

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const movement = speed * 100;
    const axis = direction === 'up' || direction === 'down' ? 'yPercent' : 'xPercent';
    const value = direction === 'up' || direction === 'left' ? -movement : movement;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        [axis]: value,
        ease: EASING.linear,
        scrollTrigger: {
          trigger: ref.current,
          start,
          end,
          scrub: true,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [speed, direction, start, end]);

  return ref;
}

// Hook for scroll-based progress
export function useScrollProgress(options: { start?: string; end?: string } = {}) {
  const ref = useRef<HTMLElement>(null);
  const progressRef = useRef(0);

  const { start = 'top bottom', end = 'bottom top' } = options;

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start,
        end,
        scrub: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [start, end]);

  return { ref, progress: progressRef };
}

export default useScrollAnimation;






