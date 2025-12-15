'use client';

import { useEffect, useRef, useCallback, RefObject } from 'react';
import gsap from 'gsap';
import { EASING, prefersReducedMotion } from '../animations/gsap-config';

interface MagneticOptions {
  strength?: number;
  radius?: number;
  ease?: string;
  duration?: number;
  scale?: number;
}

interface UseMagneticEffectReturn {
  ref: RefObject<HTMLElement | null>;
}

export function useMagneticEffect(options: MagneticOptions = {}): UseMagneticEffectReturn {
  const { 
    strength = 0.35, 
    radius = 100, 
    ease = EASING.smooth,
    duration = 0.4,
    scale = 1.05,
  } = options;
  
  const ref = useRef<HTMLElement>(null);
  const boundingRef = useRef<DOMRect | null>(null);
  const isHovering = useRef(false);

  const updateBounding = useCallback(() => {
    if (ref.current) {
      boundingRef.current = ref.current.getBoundingClientRect();
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current || !boundingRef.current || prefersReducedMotion()) return;

    const rect = boundingRef.current;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance < radius) {
      isHovering.current = true;
      const moveX = distanceX * strength;
      const moveY = distanceY * strength;

      gsap.to(ref.current, {
        x: moveX,
        y: moveY,
        scale,
        duration,
        ease,
      });
    } else if (isHovering.current) {
      isHovering.current = false;
      gsap.to(ref.current, {
        x: 0,
        y: 0,
        scale: 1,
        duration: duration * 1.5,
        ease: EASING.elastic,
      });
    }
  }, [strength, radius, ease, duration, scale]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current || prefersReducedMotion()) return;

    isHovering.current = false;
    gsap.to(ref.current, {
      x: 0,
      y: 0,
      scale: 1,
      duration: duration * 1.5,
      ease: EASING.elastic,
    });
  }, [duration]);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;

    updateBounding();
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', updateBounding);
    window.addEventListener('scroll', updateBounding);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', updateBounding);
      window.removeEventListener('scroll', updateBounding);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave, updateBounding]);

  return { ref: ref as RefObject<HTMLElement | null> };
}

// Hook for magnetic button with inner content that moves opposite
interface MagneticButtonOptions extends MagneticOptions {
  innerSelector?: string;
  innerStrength?: number;
}

export function useMagneticButton(options: MagneticButtonOptions = {}): {
  ref: RefObject<HTMLElement | null>;
  innerRef: RefObject<HTMLElement | null>;
} {
  const { 
    strength = 0.25,
    innerStrength = 0.15,
    radius = 100,
    ease = EASING.smooth,
    duration = 0.4,
    scale = 1.02,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLElement>(null);
  const boundingRef = useRef<DOMRect | null>(null);
  const isHovering = useRef(false);

  const updateBounding = useCallback(() => {
    if (ref.current) {
      boundingRef.current = ref.current.getBoundingClientRect();
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current || !boundingRef.current || prefersReducedMotion()) return;

    const rect = boundingRef.current;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance < radius) {
      isHovering.current = true;
      
      // Move outer element
      gsap.to(ref.current, {
        x: distanceX * strength,
        y: distanceY * strength,
        scale,
        duration,
        ease,
      });

      // Move inner content in same direction but less
      if (innerRef.current) {
        gsap.to(innerRef.current, {
          x: distanceX * innerStrength,
          y: distanceY * innerStrength,
          duration,
          ease,
        });
      }
    } else if (isHovering.current) {
      resetPosition();
    }
  }, [strength, innerStrength, radius, ease, duration, scale]);

  const resetPosition = useCallback(() => {
    isHovering.current = false;
    
    if (ref.current) {
      gsap.to(ref.current, {
        x: 0,
        y: 0,
        scale: 1,
        duration: duration * 1.5,
        ease: EASING.elastic,
      });
    }

    if (innerRef.current) {
      gsap.to(innerRef.current, {
        x: 0,
        y: 0,
        duration: duration * 1.5,
        ease: EASING.elastic,
      });
    }
  }, [duration]);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;

    updateBounding();
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', updateBounding);
    window.addEventListener('scroll', updateBounding);
    element.addEventListener('mouseleave', resetPosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', updateBounding);
      window.removeEventListener('scroll', updateBounding);
      element.removeEventListener('mouseleave', resetPosition);
    };
  }, [handleMouseMove, resetPosition, updateBounding]);

  return { 
    ref: ref as RefObject<HTMLElement | null>, 
    innerRef: innerRef as RefObject<HTMLElement | null> 
  };
}

export default useMagneticEffect;






