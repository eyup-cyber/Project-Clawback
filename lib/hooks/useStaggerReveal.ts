"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ANIMATION,
  EASING,
  DURATION,
  STAGGER,
  prefersReducedMotion,
  getDuration,
  getStagger,
} from "../animations/gsap-config";

gsap.registerPlugin(ScrollTrigger);

type StaggerPattern =
  | "start"
  | "end"
  | "center"
  | "edges"
  | "random"
  | [number, number];
type AnimationType = keyof typeof ANIMATION;

interface StaggerRevealOptions {
  animation?: AnimationType;
  stagger?: number;
  staggerFrom?: StaggerPattern;
  start?: string;
  markers?: boolean;
  once?: boolean;
  delay?: number;
  childSelector?: string;
  customFrom?: gsap.TweenVars;
  customTo?: gsap.TweenVars;
  onStart?: () => void;
  onComplete?: () => void;
}

interface UseStaggerRevealReturn {
  ref: React.RefObject<HTMLElement | null>;
  triggerReveal: () => void;
  reset: () => void;
}

export function useStaggerReveal(
  options: StaggerRevealOptions = {}
): UseStaggerRevealReturn {
  const {
    animation = "fadeInUp",
    stagger = STAGGER.normal,
    staggerFrom = "start",
    start = "top 85%",
    markers = false,
    once = false,
    delay = 0,
    childSelector = "> *",
    customFrom,
    customTo,
    onStart,
    onComplete,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const hasTriggered = useRef(false);

  const triggerReveal = useCallback(() => {
    if (!ref.current) return;

    const children = ref.current.querySelectorAll(childSelector);
    if (!children.length) return;

    if (prefersReducedMotion()) {
      gsap.set(children, { opacity: 1, x: 0, y: 0, scale: 1 });
      onComplete?.();
      return;
    }

    const preset = ANIMATION[animation];
    const fromVars = customFrom || preset.from;
    const toVars = customTo || preset.to;

    timelineRef.current = gsap.timeline({
      onStart,
      onComplete,
    });

    timelineRef.current.fromTo(children, fromVars, {
      ...toVars,
      duration: getDuration((toVars.duration as number) || DURATION.medium),
      stagger: {
        each: getStagger(stagger),
        from: staggerFrom,
      },
      delay,
    });

    hasTriggered.current = true;
  }, [
    animation,
    stagger,
    staggerFrom,
    delay,
    childSelector,
    customFrom,
    customTo,
    onStart,
    onComplete,
  ]);

  const reset = useCallback(() => {
    if (!ref.current) return;

    const children = ref.current.querySelectorAll(childSelector);
    if (!children.length) return;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const preset = ANIMATION[animation];
    const fromVars = customFrom || preset.from;

    gsap.set(children, fromVars);
    hasTriggered.current = false;
  }, [animation, childSelector, customFrom]);

  useEffect(() => {
    if (!ref.current) return;

    const children = ref.current.querySelectorAll(childSelector);
    if (!children.length) return;

    if (prefersReducedMotion()) {
      gsap.set(children, { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }

    const preset = ANIMATION[animation];
    const fromVars = customFrom || preset.from;
    const toVars = customTo || preset.to;

    // Set initial state
    gsap.set(children, fromVars);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start,
        markers,
        once,
        onEnter: () => {
          if (once && hasTriggered.current) return;

          timelineRef.current = gsap.timeline({
            onStart,
            onComplete,
          });

          timelineRef.current.to(children, {
            ...toVars,
            duration: getDuration(
              (toVars.duration as number) || DURATION.medium
            ),
            stagger: {
              each: getStagger(stagger),
              from: staggerFrom,
            },
            delay,
          });

          hasTriggered.current = true;
        },
        onLeaveBack: () => {
          if (once) return;

          gsap.to(children, {
            ...fromVars,
            duration: getDuration(DURATION.quick),
            stagger: {
              each: getStagger(stagger * 0.5),
              from: staggerFrom === "start" ? "end" : "start",
            },
          });
        },
      });
    }, ref);

    return () => {
      ctx.revert();
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [
    animation,
    stagger,
    staggerFrom,
    start,
    markers,
    once,
    delay,
    childSelector,
    customFrom,
    customTo,
    onStart,
    onComplete,
  ]);

  return {
    ref: ref as React.RefObject<HTMLElement | null>,
    triggerReveal,
    reset,
  };
}

// Hook for text character reveal
interface CharacterRevealOptions {
  stagger?: number;
  duration?: number;
  ease?: string;
  start?: string;
  once?: boolean;
  splitBy?: "chars" | "words" | "lines";
}

export function useCharacterReveal(options: CharacterRevealOptions = {}) {
  const {
    stagger = 0.02,
    duration = DURATION.normal,
    ease = EASING.snappy,
    start = "top 85%",
    once = true,
    splitBy = "chars",
  } = options;

  const ref = useRef<HTMLElement>(null);
  const originalText = useRef<string>("");

  useEffect(() => {
    if (!ref.current) return;

    originalText.current = ref.current.textContent || "";

    if (prefersReducedMotion()) return;

    const text = originalText.current;
    let elements: string[] = [];

    switch (splitBy) {
      case "chars":
        elements = text.split("");
        break;
      case "words":
        elements = text.split(" ");
        break;
      case "lines":
        elements = text.split("\n");
        break;
    }

    // Wrap each element in a span
    ref.current.innerHTML = elements
      .map((el, i) => {
        const content =
          splitBy === "words" && i < elements.length - 1 ? `${el}&nbsp;` : el;
        return `<span class="reveal-char" style="display: inline-block; opacity: 0;">${content}</span>`;
      })
      .join("");

    const chars = ref.current.querySelectorAll(".reveal-char");

    const ctx = gsap.context(() => {
      gsap.set(chars, { opacity: 0, y: 20 });

      ScrollTrigger.create({
        trigger: ref.current,
        start,
        once,
        onEnter: () => {
          gsap.to(chars, {
            opacity: 1,
            y: 0,
            duration: getDuration(duration),
            stagger: getStagger(stagger),
            ease,
          });
        },
        onLeaveBack: () => {
          if (once) return;
          gsap.to(chars, {
            opacity: 0,
            y: 20,
            duration: getDuration(duration * 0.5),
            stagger: {
              each: getStagger(stagger * 0.5),
              from: "end",
            },
          });
        },
      });
    }, ref);

    // Copy ref.current to a local variable for cleanup
    const element = ref.current;
    return () => {
      ctx.revert();
      if (element && originalText.current) {
        element.textContent = originalText.current;
      }
    };
  }, [stagger, duration, ease, start, once, splitBy]);

  return ref;
}

// Hook for grid item reveals with wave pattern
interface GridRevealOptions {
  columns?: number;
  stagger?: number;
  start?: string;
  once?: boolean;
  animation?: AnimationType;
}

export function useGridReveal(options: GridRevealOptions = {}) {
  const {
    columns = 3,
    stagger = 0.05,
    start = "top 85%",
    once = false,
    animation = "fadeInUp",
  } = options;

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const children = Array.from(ref.current.children);
    if (!children.length) return;

    if (prefersReducedMotion()) {
      gsap.set(children, { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }

    const preset = ANIMATION[animation];

    // Calculate stagger based on grid position (wave effect)
    const getDelay = (index: number): number => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      return (row + col) * stagger;
    };

    gsap.set(children, preset.from);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start,
        once,
        onEnter: () => {
          children.forEach((child, index) => {
            gsap.to(child, {
              ...preset.to,
              duration: getDuration(
                (preset.to.duration as number) || DURATION.medium
              ),
              delay: getDelay(index),
            });
          });
        },
        onLeaveBack: () => {
          if (once) return;
          children.forEach((child, index) => {
            gsap.to(child, {
              ...preset.from,
              duration: getDuration(DURATION.quick),
              delay: getDelay(children.length - 1 - index) * 0.5,
            });
          });
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [columns, stagger, start, once, animation]);

  return ref;
}

export default useStaggerReveal;
