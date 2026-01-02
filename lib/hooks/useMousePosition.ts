'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../animations/gsap-config';

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number; // -1 to 1
  normalizedY: number; // -1 to 1
  isInside: boolean;
}

interface UseMousePositionOptions {
  includeTouch?: boolean;
  smoothing?: number;
  targetRef?: RefObject<HTMLElement>;
}

const defaultPosition: MousePosition = {
  x: 0,
  y: 0,
  normalizedX: 0,
  normalizedY: 0,
  isInside: false,
};

export function useMousePosition(options: UseMousePositionOptions = {}): MousePosition {
  const { includeTouch = true, smoothing = 0, targetRef } = options;
  const [position, setPosition] = useState<MousePosition>(defaultPosition);
  const frameRef = useRef<number | undefined>(undefined);
  const currentPosition = useRef({ x: 0, y: 0 });
  const targetPosition = useRef({ x: 0, y: 0 });

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      const target = targetRef?.current;

      if (target) {
        const rect = target.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const normalizedX = (x / rect.width) * 2 - 1;
        const normalizedY = (y / rect.height) * 2 - 1;
        const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

        if (smoothing > 0) {
          targetPosition.current = { x, y };
        } else {
          setPosition({ x, y, normalizedX, normalizedY, isInside });
        }
      } else {
        const x = clientX;
        const y = clientY;
        const normalizedX = (x / window.innerWidth) * 2 - 1;
        const normalizedY = (y / window.innerHeight) * 2 - 1;

        if (smoothing > 0) {
          targetPosition.current = { x, y };
        } else {
          setPosition({ x, y, normalizedX, normalizedY, isInside: true });
        }
      }
    },
    [targetRef, smoothing]
  );

  // Smoothing animation loop
  useEffect(() => {
    if (smoothing <= 0) return;

    const animate = () => {
      const dx = targetPosition.current.x - currentPosition.current.x;
      const dy = targetPosition.current.y - currentPosition.current.y;

      currentPosition.current.x += dx * smoothing;
      currentPosition.current.y += dy * smoothing;

      const target = targetRef?.current;
      let normalizedX = 0;
      let normalizedY = 0;
      let isInside = true;

      if (target) {
        const rect = target.getBoundingClientRect();
        normalizedX = (currentPosition.current.x / rect.width) * 2 - 1;
        normalizedY = (currentPosition.current.y / rect.height) * 2 - 1;
        isInside =
          currentPosition.current.x >= 0 &&
          currentPosition.current.x <= rect.width &&
          currentPosition.current.y >= 0 &&
          currentPosition.current.y <= rect.height;
      } else {
        normalizedX = (currentPosition.current.x / window.innerWidth) * 2 - 1;
        normalizedY = (currentPosition.current.y / window.innerHeight) * 2 - 1;
      }

      setPosition({
        x: currentPosition.current.x,
        y: currentPosition.current.y,
        normalizedX,
        normalizedY,
        isInside,
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [smoothing, targetRef]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseLeave = () => {
      setPosition((prev) => ({ ...prev, isInside: false }));
    };

    const target = targetRef?.current || window;

    target.addEventListener('mousemove', handleMouseMove as EventListener);
    if (includeTouch) {
      target.addEventListener('touchmove', handleTouchMove as EventListener, {
        passive: true,
      });
    }

    const targetElement = targetRef?.current;

    if (targetElement) {
      targetElement.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      target.removeEventListener('mousemove', handleMouseMove as EventListener);
      if (includeTouch) {
        target.removeEventListener('touchmove', handleTouchMove as EventListener);
      }
      if (targetElement) {
        targetElement.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [includeTouch, targetRef, updatePosition]);

  return position;
}

// Hook for element-relative mouse position with 3D tilt calculation
interface Tilt3D {
  rotateX: number;
  rotateY: number;
  scale: number;
}

interface UseTilt3DOptions {
  maxTilt?: number;
  scale?: number;
  perspective?: number;
  disabled?: boolean;
}

export function useTilt3D(options: UseTilt3DOptions = {}): {
  ref: RefObject<HTMLElement | null>;
  tilt: Tilt3D;
  style: React.CSSProperties;
} {
  const { maxTilt = 15, scale = 1.02, perspective = 1000, disabled = false } = options;
  const ref = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState<Tilt3D>({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current || disabled || prefersReducedMotion()) return;

      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      setTilt({ rotateX, rotateY, scale });
    },
    [maxTilt, scale, disabled]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  const style: React.CSSProperties = {
    transform: `perspective(${perspective}px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
    transition: 'transform 0.15s ease-out',
    transformStyle: 'preserve-3d',
  };

  return { ref: ref as RefObject<HTMLElement | null>, tilt, style };
}

export default useMousePosition;
