'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { EASING, COLORS, prefersReducedMotion } from '@/lib/animations/gsap-config';

interface CustomCursorProps {
  color?: string;
  size?: number;
  trailLength?: number;
  showTrail?: boolean;
  mixBlendMode?: string;
}

export default function CustomCursor({
  color = COLORS.primary,
  size = 20,
  trailLength = 5,
  showTrail = true,
  mixBlendMode = 'difference',
}: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [cursorText, setCursorText] = useState('');
  const mousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (prefersReducedMotion()) return;

    // Hide default cursor
    document.body.style.cursor = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };

      // Animate main cursor
      if (cursorRef.current) {
        gsap.to(cursorRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.15,
          ease: EASING.smooth,
        });
      }

      // Animate dot
      if (cursorDotRef.current) {
        gsap.to(cursorDotRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.05,
        });
      }

      // Animate trail
      if (showTrail) {
        trailRefs.current.forEach((trail, i) => {
          if (trail) {
            gsap.to(trail, {
              x: e.clientX,
              y: e.clientY,
              duration: 0.1 + i * 0.05,
              ease: EASING.smooth,
            });
          }
        });
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Handle hoverable elements
    const handleElementEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.hasAttribute('data-cursor-hover')
      ) {
        setIsHovering(true);
        
        // Check for custom cursor text
        const cursorLabel = target.getAttribute('data-cursor-text') ||
          target.closest('[data-cursor-text]')?.getAttribute('data-cursor-text');
        
        if (cursorLabel) {
          setCursorText(cursorLabel);
        }
      }
    };

    const handleElementLeave = () => {
      setIsHovering(false);
      setCursorText('');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleElementEnter);
    document.addEventListener('mouseout', handleElementLeave);

    return () => {
      document.body.style.cursor = 'auto';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleElementEnter);
      document.removeEventListener('mouseout', handleElementLeave);
    };
  }, [showTrail]);

  // Cursor state animations
  useEffect(() => {
    if (!cursorRef.current || prefersReducedMotion()) return;

    if (isClicking) {
      gsap.to(cursorRef.current, {
        scale: 0.8,
        duration: 0.1,
      });
    } else if (isHovering) {
      gsap.to(cursorRef.current, {
        scale: 1.5,
        duration: 0.3,
        ease: EASING.snappy,
      });
    } else {
      gsap.to(cursorRef.current, {
        scale: 1,
        duration: 0.3,
        ease: EASING.elastic,
      });
    }
  }, [isHovering, isClicking]);

  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <>
      {/* Trail */}
      {showTrail &&
        Array.from({ length: trailLength }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { if (el) trailRefs.current[i] = el; }}
            className="fixed pointer-events-none z-[9998] rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              width: size * (1 - i * 0.15),
              height: size * (1 - i * 0.15),
              border: `1px solid ${color}`,
              opacity: 0.2 - i * 0.03,
              mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'],
            }}
            aria-hidden="true"
          />
        ))}

      {/* Main cursor ring */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-[9999] rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
        style={{
          width: size,
          height: size,
          border: `2px solid ${color}`,
          mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'],
          transition: 'width 0.3s, height 0.3s',
        }}
        aria-hidden="true"
      >
        {cursorText && (
          <span
            className="absolute whitespace-nowrap text-xs font-medium"
            style={{ color }}
          >
            {cursorText}
          </span>
        )}
      </div>

      {/* Center dot */}
      <div
        ref={cursorDotRef}
        className="fixed pointer-events-none z-[9999] rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 4,
          height: 4,
          background: color,
          mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'],
        }}
        aria-hidden="true"
      />
    </>
  );
}

// Cursor trail effect (simpler alternative)
interface CursorTrailProps {
  color?: string;
  length?: number;
  decay?: number;
}

export function CursorTrail({
  color = COLORS.primary,
  length = 20,
  decay = 0.95,
}: CursorTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number; age: number }[]>([]);

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

      pointsRef.current.forEach((point) => {
        point.age *= decay;
        
        if (point.age > 0.01) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3 * point.age, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = point.age * 0.5;
          ctx.fill();
        }
      });

      // Remove dead points
      pointsRef.current = pointsRef.current.filter((p) => p.age > 0.01);

      requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [color, length, decay]);

  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9997]"
      aria-hidden="true"
    />
  );
}

// Magnetic cursor effect for specific elements
interface MagneticCursorAreaProps {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}

export function MagneticCursorArea({
  children,
  strength = 0.3,
  className = '',
}: MagneticCursorAreaProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const element = ref.current;
    const bounds = element.getBoundingClientRect();

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - bounds.left - bounds.width / 2;
      const y = e.clientY - bounds.top - bounds.height / 2;

      gsap.to(element, {
        x: x * strength,
        y: y * strength,
        duration: 0.3,
        ease: EASING.smooth,
      });
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: EASING.elastic,
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}






