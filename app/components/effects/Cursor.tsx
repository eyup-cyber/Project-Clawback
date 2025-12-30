'use client';

import gsap from 'gsap';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';
import { SPRING_PRESETS, Spring2D } from '@/lib/animations/spring-physics';

// ============================================
// CURSOR STATE TYPES
// ============================================

export type CursorState =
  | 'default'
  | 'pointer'
  | 'text'
  | 'grab'
  | 'grabbing'
  | 'zoom-in'
  | 'zoom-out'
  | 'expand'
  | 'play'
  | 'pause'
  | 'link'
  | 'hidden'
  | 'loading'
  | 'drag'
  | 'resize'
  | 'crosshair';

interface CursorConfig {
  size: number;
  borderWidth: number;
  fillOpacity: number;
  icon?: string;
  text?: string;
  scale?: number;
}

const CURSOR_CONFIGS: Record<CursorState, CursorConfig> = {
  default: { size: 24, borderWidth: 2, fillOpacity: 0 },
  pointer: { size: 60, borderWidth: 2, fillOpacity: 0.1, scale: 1.2 },
  text: { size: 4, borderWidth: 0, fillOpacity: 1, scale: 1 },
  grab: { size: 50, borderWidth: 2, fillOpacity: 0.05, icon: '✋' },
  grabbing: {
    size: 45,
    borderWidth: 2,
    fillOpacity: 0.1,
    icon: '✊',
    scale: 0.9,
  },
  'zoom-in': { size: 60, borderWidth: 2, fillOpacity: 0.1, icon: '+' },
  'zoom-out': { size: 60, borderWidth: 2, fillOpacity: 0.1, icon: '−' },
  expand: { size: 80, borderWidth: 2, fillOpacity: 0.1, icon: '⤢' },
  play: { size: 80, borderWidth: 2, fillOpacity: 0.15, icon: '▶' },
  pause: { size: 80, borderWidth: 2, fillOpacity: 0.15, icon: '⏸' },
  link: { size: 50, borderWidth: 2, fillOpacity: 0.1, icon: '↗' },
  hidden: { size: 0, borderWidth: 0, fillOpacity: 0, scale: 0 },
  loading: { size: 40, borderWidth: 3, fillOpacity: 0 },
  drag: { size: 50, borderWidth: 2, fillOpacity: 0.1, icon: '⇄' },
  resize: { size: 50, borderWidth: 2, fillOpacity: 0.1, icon: '↔' },
  crosshair: { size: 30, borderWidth: 1, fillOpacity: 0 },
};

// ============================================
// MAIN CURSOR COMPONENT
// ============================================

interface CustomCursorProps {
  color?: string;
  secondaryColor?: string;
  size?: number;
  showTrail?: boolean;
  trailLength?: number;
  mixBlendMode?: 'difference' | 'exclusion' | 'normal' | 'multiply' | 'screen';
  enableMagnetic?: boolean;
  magneticStrength?: number;
}

export default function CustomCursor({
  color = COLORS.primary,
  secondaryColor = COLORS.secondary,
  size = 24,
  showTrail = true,
  trailLength = 8,
  mixBlendMode = 'difference',
  enableMagnetic = true,
  magneticStrength = 0.3,
}: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorInnerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const springRef = useRef<Spring2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const magneticOffset = useRef({ x: 0, y: 0 });

  const [state, setState] = useState<CursorState>('default');
  const [isPressed, setIsPressed] = useState(false);
  const [cursorText, setCursorText] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  // Initialize spring physics
  useEffect(() => {
    springRef.current = new Spring2D({ x: 0, y: 0 }, SPRING_PRESETS.snap);
  }, []);

  // Get current config based on state
  const config = CURSOR_CONFIGS[state];
  const currentSize = (config.size || size) * (config.scale || 1);

  // Handle mouse movement with spring physics
  const updateCursor = useCallback(() => {
    if (!cursorRef.current || !springRef.current) return;

    // Update spring target
    springRef.current.setTarget({
      x: mousePos.current.x + magneticOffset.current.x,
      y: mousePos.current.y + magneticOffset.current.y,
    });

    // Update spring position
    const pos = springRef.current.update(0.016);

    // Apply to cursor
    cursorRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;

    // Update dot with less spring
    if (dotRef.current) {
      dotRef.current.style.transform = `translate(${mousePos.current.x}px, ${mousePos.current.y}px) translate(-50%, -50%)`;
    }

    // Update trail
    if (showTrail) {
      trailRefs.current.forEach((trail, i) => {
        if (trail) {
          const delay = (i + 1) * 0.02;
          const trailX = pos.x - (pos.x - mousePos.current.x) * delay * 10;
          const trailY = pos.y - (pos.y - mousePos.current.y) * delay * 10;
          trail.style.transform = `translate(${trailX}px, ${trailY}px) translate(-50%, -50%)`;
        }
      });
    }

    rafRef.current = requestAnimationFrame(updateCursor);
  }, [showTrail]);

  // Main effect for cursor tracking
  useEffect(() => {
    if (prefersReducedMotion()) return;

    // Hide system cursor
    document.body.style.cursor = 'none';
    document.documentElement.style.cursor = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Start animation loop
    rafRef.current = requestAnimationFrame(updateCursor);

    return () => {
      document.body.style.cursor = '';
      document.documentElement.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateCursor]);

  // Detect interactive elements and update cursor state
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const handleElementInteraction = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check for data-cursor attribute first
      const cursorAttr = target.closest('[data-cursor]');
      if (cursorAttr) {
        const cursorState = cursorAttr.getAttribute('data-cursor') as CursorState;
        const cursorTextAttr = cursorAttr.getAttribute('data-cursor-text');
        if (cursorState && CURSOR_CONFIGS[cursorState]) {
          setState(cursorState);
          if (cursorTextAttr) setCursorText(cursorTextAttr);
          return;
        }
      }

      // Auto-detect based on element type
      if (target.closest('video, [data-video], .video-player')) {
        setState('play');
      } else if (target.closest('img[data-lightbox], [data-zoom], .gallery-image')) {
        setState('zoom-in');
      } else if (target.closest('[draggable="true"], .draggable')) {
        setState('grab');
      } else if (target.closest('input[type="text"], textarea, [contenteditable="true"]')) {
        setState('text');
      } else if (target.closest('a[href^="http"], a[target="_blank"]')) {
        setState('link');
        const linkText = target.closest('a')?.getAttribute('data-cursor-text');
        if (linkText) setCursorText(linkText);
      } else if (target.closest('a, button, [role="button"], .clickable, [data-cursor-hover]')) {
        setState('pointer');
        const hoverText = target.closest('[data-cursor-text]')?.getAttribute('data-cursor-text');
        if (hoverText) setCursorText(hoverText);
      } else {
        setState('default');
        setCursorText('');
      }

      // Handle magnetic elements
      if (enableMagnetic) {
        const magneticEl = target.closest('[data-magnetic]');
        if (magneticEl) {
          const rect = magneticEl.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const strength = parseFloat(
            magneticEl.getAttribute('data-magnetic-strength') || String(magneticStrength)
          );

          magneticOffset.current = {
            x: (mousePos.current.x - centerX) * strength,
            y: (mousePos.current.y - centerY) * strength,
          };
        } else {
          magneticOffset.current = { x: 0, y: 0 };
        }
      }
    };

    const handleElementLeave = (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (!relatedTarget?.closest('[data-cursor], a, button, [role="button"]')) {
        setState('default');
        setCursorText('');
        magneticOffset.current = { x: 0, y: 0 };
      }
    };

    document.addEventListener('mouseover', handleElementInteraction, {
      passive: true,
    });
    document.addEventListener('mouseout', handleElementLeave, {
      passive: true,
    });

    return () => {
      document.removeEventListener('mouseover', handleElementInteraction);
      document.removeEventListener('mouseout', handleElementLeave);
    };
  }, [enableMagnetic, magneticStrength]);

  // Animate cursor state changes
  useEffect(() => {
    if (!cursorRef.current || !cursorInnerRef.current || prefersReducedMotion()) return;

    const config = CURSOR_CONFIGS[state];
    const targetSize = (config.size || size) * (config.scale || 1);

    gsap.to(cursorRef.current, {
      width: targetSize,
      height: targetSize,
      duration: getDuration(0.3),
      ease: EASING.snappy,
    });

    gsap.to(cursorInnerRef.current, {
      borderWidth: config.borderWidth,
      opacity: isVisible ? 1 : 0,
      duration: getDuration(0.2),
    });

    // Handle press animation
    if (isPressed) {
      gsap.to(cursorRef.current, {
        scale: 0.85,
        duration: getDuration(0.1),
        ease: EASING.smooth,
      });
    } else {
      gsap.to(cursorRef.current, {
        scale: 1,
        duration: getDuration(0.3),
        ease: EASING.elastic,
      });
    }
  }, [state, isPressed, isVisible, size]);

  // Handle loading animation
  useEffect(() => {
    if (state !== 'loading' || !cursorInnerRef.current) return;

    const tl = gsap.timeline({ repeat: -1 });
    tl.to(cursorInnerRef.current, {
      rotation: 360,
      duration: 1,
      ease: 'none',
    });

    return () => {
      tl.kill();
      gsap.set(cursorInnerRef.current, { rotation: 0 });
    };
  }, [state]);

  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <>
      {/* Trail elements */}
      {showTrail &&
        Array.from({ length: trailLength }).map((_, i) => (
          <div
            key={`trail-${i}`}
            ref={(el) => {
              if (el) trailRefs.current[i] = el;
            }}
            className="fixed top-0 left-0 pointer-events-none z-[9997] rounded-full"
            style={{
              width: currentSize * (1 - i * 0.08),
              height: currentSize * (1 - i * 0.08),
              border: `1px solid ${color}`,
              opacity: (0.3 - i * 0.03) * (isVisible ? 1 : 0),
              mixBlendMode,
              willChange: 'transform',
            }}
            aria-hidden="true"
          />
        ))}

      {/* Main cursor container */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center"
        style={{
          width: currentSize,
          height: currentSize,
          willChange: 'transform, width, height',
        }}
        aria-hidden="true"
      >
        {/* Inner ring with blend mode */}
        <div
          ref={cursorInnerRef}
          className="absolute inset-0 rounded-full transition-colors duration-200"
          style={{
            border: `${config.borderWidth}px solid ${color}`,
            backgroundColor:
              config.fillOpacity > 0
                ? `${color}${Math.round(config.fillOpacity * 255)
                    .toString(16)
                    .padStart(2, '0')}`
                : 'transparent',
            mixBlendMode,
            opacity: isVisible ? 1 : 0,
          }}
        />

        {/* Icon */}
        {config.icon && (
          <span
            className="absolute text-center transition-opacity duration-200"
            style={{
              fontSize: currentSize * 0.35,
              color,
              mixBlendMode,
              opacity: isVisible ? 1 : 0,
            }}
          >
            {config.icon}
          </span>
        )}

        {/* Custom text */}
        {cursorText && !config.icon && (
          <span
            className="absolute whitespace-nowrap text-xs font-medium px-2 py-1 rounded-full"
            style={{
              color,
              backgroundColor: `${COLORS.background}ee`,
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {cursorText}
          </span>
        )}

        {/* Loading spinner border */}
        {state === 'loading' && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              borderTop: `3px solid ${secondaryColor}`,
              borderRight: '3px solid transparent',
              borderBottom: '3px solid transparent',
              borderLeft: '3px solid transparent',
            }}
          />
        )}
      </div>

      {/* Center dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full transition-transform duration-100"
        style={{
          width: state === 'text' ? 2 : 5,
          height: state === 'text' ? 20 : 5,
          backgroundColor: color,
          mixBlendMode,
          opacity: isVisible && state !== 'hidden' ? 1 : 0,
          borderRadius: state === 'text' ? '1px' : '50%',
          willChange: 'transform',
        }}
        aria-hidden="true"
      />

      {/* Styles for hiding cursor on interactive elements */}
      <style jsx global>{`
        a,
        button,
        [role='button'],
        input,
        textarea,
        select,
        [data-cursor-hover],
        [data-cursor] {
          cursor: none !important;
        }

        * {
          cursor: none !important;
        }
      `}</style>
    </>
  );
}

// ============================================
// CURSOR TRAIL (Canvas-based)
// ============================================

interface CursorTrailProps {
  color?: string;
  length?: number;
  decay?: number;
  thickness?: number;
}

export function CursorTrail({
  color = COLORS.primary,
  length = 30,
  decay = 0.92,
  thickness = 3,
}: CursorTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number; age: number }[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      pointsRef.current.push({ x: e.clientX, y: e.clientY, age: 1 });
      if (pointsRef.current.length > length) {
        pointsRef.current.shift();
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw trail as connected line
      if (pointsRef.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pointsRef.current[0].x, pointsRef.current[0].y);

        for (let i = 1; i < pointsRef.current.length; i++) {
          const point = pointsRef.current[i];
          point.age *= decay;

          ctx.lineTo(point.x, point.y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.4;
        ctx.stroke();
      }

      // Draw glow dots
      pointsRef.current.forEach((point) => {
        if (point.age > 0.1) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, thickness * point.age, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = point.age * 0.6;
          ctx.fill();
        }
      });

      // Clean up dead points
      pointsRef.current = pointsRef.current.filter((p) => p.age > 0.05);

      rafRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [color, length, decay, thickness]);

  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9996]"
      style={{ mixBlendMode: 'screen' }}
      aria-hidden="true"
    />
  );
}

// ============================================
// MAGNETIC CURSOR AREA
// ============================================

interface MagneticCursorAreaProps {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}

export function MagneticCursorArea({
  children,
  strength = 0.35,
  className = '',
}: MagneticCursorAreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const element = ref.current;

    const updateBounds = () => {
      boundsRef.current = element.getBoundingClientRect();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!boundsRef.current) return;

      const bounds = boundsRef.current;
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      const x = (e.clientX - centerX) * strength;
      const y = (e.clientY - centerY) * strength;

      gsap.to(element, {
        x,
        y,
        duration: 0.4,
        ease: EASING.smooth,
      });
    };

    const handleMouseEnter = () => {
      updateBounds();
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: EASING.elastic,
      });
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mousemove', handleMouseMove, { passive: true });
    element.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, { passive: true });

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds);
    };
  }, [strength]);

  return (
    <div ref={ref} className={className} data-magnetic data-magnetic-strength={strength}>
      {children}
    </div>
  );
}

// ============================================
// CURSOR CONTEXT PROVIDER
// ============================================

import { createContext, useContext } from 'react';

interface CursorContextType {
  setCursorState: (state: CursorState) => void;
  setCursorText: (text: string) => void;
  resetCursor: () => void;
}

const CursorContext = createContext<CursorContextType | null>(null);

export function useCursor() {
  const context = useContext(CursorContext);
  if (!context) {
    return {
      setCursorState: () => {},
      setCursorText: () => {},
      resetCursor: () => {},
    };
  }
  return context;
}

interface CursorProviderProps {
  children: React.ReactNode;
  cursorProps?: CustomCursorProps;
}

export function CursorProvider({ children, cursorProps }: CursorProviderProps) {
  const [_cursorState, setCursorStateInternal] = useState<CursorState>('default');
  const [_cursorText, setCursorTextInternal] = useState('');

  const setCursorState = useCallback((state: CursorState) => {
    setCursorStateInternal(state);
  }, []);

  const setCursorText = useCallback((text: string) => {
    setCursorTextInternal(text);
  }, []);

  const resetCursor = useCallback(() => {
    setCursorStateInternal('default');
    setCursorTextInternal('');
  }, []);

  return (
    <CursorContext.Provider value={{ setCursorState, setCursorText, resetCursor }}>
      <CustomCursor {...cursorProps} />
      {children}
    </CursorContext.Provider>
  );
}
