"use client";

import { useEffect, useRef, useCallback, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASING, prefersReducedMotion } from "../animations/gsap-config";

gsap.registerPlugin(ScrollTrigger);

interface ParallaxOptions {
  speed?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  start?: string;
  end?: string;
  scrub?: boolean | number;
}

interface UseParallaxReturn {
  ref: RefObject<HTMLElement | null>;
}

export function useParallax(options: ParallaxOptions = {}): UseParallaxReturn {
  const {
    speed = 0.3,
    direction = "vertical",
    reverse = false,
    start = "top bottom",
    end = "bottom top",
    scrub = true,
  } = options;

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const movement = speed * 100;
    const axis = direction === "vertical" ? "yPercent" : "xPercent";
    const value = reverse ? movement : -movement;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        [axis]: value,
        ease: EASING.linear,
        scrollTrigger: {
          trigger: ref.current,
          start,
          end,
          scrub,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [speed, direction, reverse, start, end, scrub]);

  return { ref: ref as RefObject<HTMLElement | null> };
}

// Hook for multi-layer parallax (creates depth effect)
interface ParallaxLayer {
  selector: string;
  speed: number;
  direction?: "vertical" | "horizontal";
}

interface MultiLayerParallaxOptions {
  layers: ParallaxLayer[];
  start?: string;
  end?: string;
  scrub?: boolean | number;
}

export function useMultiLayerParallax(options: MultiLayerParallaxOptions) {
  const {
    layers,
    start = "top bottom",
    end = "bottom top",
    scrub = true,
  } = options;

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      layers.forEach(({ selector, speed, direction = "vertical" }) => {
        const elements = ref.current?.querySelectorAll(selector);
        if (!elements?.length) return;

        const movement = speed * 100;
        const axis = direction === "vertical" ? "yPercent" : "xPercent";

        gsap.to(elements, {
          [axis]: -movement,
          ease: EASING.linear,
          scrollTrigger: {
            trigger: ref.current,
            start,
            end,
            scrub,
          },
        });
      });
    }, ref);

    return () => ctx.revert();
  }, [layers, start, end, scrub]);

  return ref;
}

// Hook for mouse-based parallax (follows cursor)
interface MouseParallaxOptions {
  intensity?: number;
  inverted?: boolean;
  smoothing?: number;
}

export function useMouseParallax(options: MouseParallaxOptions = {}): {
  ref: RefObject<HTMLElement | null>;
  style: React.CSSProperties;
} {
  const { intensity = 20, inverted = false, smoothing = 0.1 } = options;
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const targetOffset = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | undefined>(undefined);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (prefersReducedMotion()) return;

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      // Normalize mouse position to -1 to 1
      const normalizedX = (clientX / innerWidth - 0.5) * 2;
      const normalizedY = (clientY / innerHeight - 0.5) * 2;

      const multiplier = inverted ? -1 : 1;

      targetOffset.current = {
        x: normalizedX * intensity * multiplier,
        y: normalizedY * intensity * multiplier,
      };
    },
    [intensity, inverted]
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const animate = () => {
      setOffset((prev) => ({
        x: prev.x + (targetOffset.current.x - prev.x) * smoothing,
        y: prev.y + (targetOffset.current.y - prev.y) * smoothing,
      }));
      frameRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [handleMouseMove, smoothing]);

  const style: React.CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  };

  return { ref: ref as RefObject<HTMLElement | null>, style };
}

// Hook for scroll-based rotation
interface RotationParallaxOptions {
  maxRotation?: number;
  axis?: "x" | "y" | "z";
  start?: string;
  end?: string;
}

export function useRotationParallax(options: RotationParallaxOptions = {}) {
  const {
    maxRotation = 360,
    axis = "z",
    start = "top bottom",
    end = "bottom top",
  } = options;

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const rotationProp = `rotation${axis.toUpperCase()}`;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        [rotationProp]: maxRotation,
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
  }, [maxRotation, axis, start, end]);

  return ref;
}

// Hook for scale-based parallax (zoom effect)
interface ScaleParallaxOptions {
  startScale?: number;
  endScale?: number;
  start?: string;
  end?: string;
}

export function useScaleParallax(options: ScaleParallaxOptions = {}) {
  const {
    startScale = 1,
    endScale = 1.2,
    start = "top bottom",
    end = "bottom top",
  } = options;

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    gsap.set(ref.current, { scale: startScale });

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        scale: endScale,
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
  }, [startScale, endScale, start, end]);

  return ref;
}

// Hook for opacity-based parallax (fade effect)
interface OpacityParallaxOptions {
  startOpacity?: number;
  endOpacity?: number;
  start?: string;
  end?: string;
}

export function useOpacityParallax(options: OpacityParallaxOptions = {}) {
  const {
    startOpacity = 1,
    endOpacity = 0,
    start = "top center",
    end = "bottom top",
  } = options;

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    gsap.set(ref.current, { opacity: startOpacity });

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        opacity: endOpacity,
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
  }, [startOpacity, endOpacity, start, end]);

  return ref;
}

export default useParallax;
