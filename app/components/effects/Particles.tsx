'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { prefersReducedMotion } from '@/lib/animations/gsap-config';

interface ParticlesProps {
  count?: number;
  color?: string;
  size?: number;
  speed?: number;
  opacity?: number;
  spread?: number;
  className?: string;
  interactive?: boolean;
}

export default function Particles({
  count = 50,
  color = '#32CD32',
  size = 2,
  speed = 0.5,
  opacity = 0.6,
  spread = 50,
  className = '',
  interactive = true,
}: Readonly<ParticlesProps>) {
  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true }}
      >
        <ParticleField
          count={count}
          color={color}
          size={size}
          speed={speed}
          opacity={opacity}
          spread={spread}
          interactive={interactive}
        />
      </Canvas>
    </div>
  );
}

interface ParticleFieldProps {
  count: number;
  color: string;
  size: number;
  speed: number;
  opacity: number;
  spread: number;
  interactive: boolean;
}

function ParticleField({
  count,
  color,
  size,
  speed,
  opacity,
  spread,
  interactive,
}: Readonly<ParticleFieldProps>) {
  const pointsRef = useRef<THREE.Points>(null);
  const mousePosition = useRef({ x: 0, y: 0 });

  // Generate initial positions
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = (Math.random() - 0.5) * spread;
      positions[i3 + 2] = (Math.random() - 0.5) * spread;

      originalPositions[i3] = positions[i3];
      originalPositions[i3 + 1] = positions[i3 + 1];
      originalPositions[i3 + 2] = positions[i3 + 2];

      velocities[i3] = (Math.random() - 0.5) * speed;
      velocities[i3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * speed;
    }

    return { positions, velocities, originalPositions };
  }, [count, spread, speed]);

  // Track mouse position
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      const w = globalThis.window;
      if (!w) return;
      mousePosition.current = {
        x: (e.clientX / w.innerWidth - 0.5) * 2 * spread * 0.5,
        y: -(e.clientY / w.innerHeight - 0.5) * 2 * spread * 0.5,
      };
    };

    const w = globalThis.window;
    if (!w) return;
    w.addEventListener('mousemove', handleMouseMove);
    return () => w.removeEventListener('mousemove', handleMouseMove);
  }, [interactive, spread]);

  // Animation loop
  useFrame((state) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Apply velocities
      positions[i3] += particles.velocities[i3] * 0.01;
      positions[i3 + 1] += particles.velocities[i3 + 1] * 0.01;
      positions[i3 + 2] += particles.velocities[i3 + 2] * 0.01;

      // Add subtle wave motion
      positions[i3 + 1] += Math.sin(time + i * 0.1) * 0.01;

      // Wrap around edges
      if (Math.abs(positions[i3]) > spread / 2) {
        positions[i3] = -Math.sign(positions[i3]) * spread / 2;
      }
      if (Math.abs(positions[i3 + 1]) > spread / 2) {
        positions[i3 + 1] = -Math.sign(positions[i3 + 1]) * spread / 2;
      }
      if (Math.abs(positions[i3 + 2]) > spread / 2) {
        positions[i3 + 2] = -Math.sign(positions[i3 + 2]) * spread / 2;
      }

      // Interactive - push particles away from mouse
      if (interactive) {
        const dx = positions[i3] - mousePosition.current.x;
        const dy = positions[i3 + 1] - mousePosition.current.y;
        const distance = Math.hypot(dx, dy);
        const maxDistance = 10;

        if (distance < maxDistance) {
          const force = (maxDistance - distance) / maxDistance;
          positions[i3] += (dx / distance) * force * 0.2;
          positions[i3 + 1] += (dy / distance) * force * 0.2;
        }
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Simple CSS-based floating particles (lighter alternative)
interface FloatingParticlesProps {
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
  className?: string;
}

export function FloatingParticles({
  count = 20,
  color = 'var(--primary)',
  minSize = 2,
  maxSize = 6,
  className = '',
}: Readonly<FloatingParticlesProps>) {
  const [mounted, setMounted] = useState(false);
  
  const particles = useMemo(() => {
    // Use a seeded random function for consistent SSR/client values
    let seed = 0;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    return Array.from({ length: count }, (_, i) => {
      seed = i * 1000; // Reset seed for each particle based on index
      return {
        id: i,
        x: seededRandom() * 100,
        y: seededRandom() * 100,
        size: minSize + seededRandom() * (maxSize - minSize),
        duration: 10 + seededRandom() * 20,
        delay: seededRandom() * 10,
        opacity: 0.3 + seededRandom() * 0.3,
      };
    });
  }, [count, minSize, maxSize]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (prefersReducedMotion() || !mounted) {
    return null;
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: color,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20vh) translateX(10px);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}

// Sparkle effect for specific elements
interface SparkleProps {
  color?: string;
  count?: number;
  className?: string;
}

export function Sparkle({
  color = 'var(--secondary)',
  count = 3,
  className = '',
}: Readonly<SparkleProps>) {
  const sparkles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      size: 4 + Math.random() * 8,
      duration: 1 + Math.random() * 2,
      delay: Math.random() * 2,
    }));
  }, [count]);

  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {sparkles.map((s) => (
        <svg
          key={s.id}
          className="absolute animate-sparkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
          viewBox="0 0 24 24"
          fill={color}
        >
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      ))}

      <style jsx>{`
        @keyframes sparkle {
          0%, 100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
          }
        }
        .animate-sparkle {
          animation: sparkle ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Global SPACE DUST - applied page-wide for atmospheric effect
// Small dots that float in space with randomized focus (blur), always drifting downward.
interface SpaceDustProps {
  count?: number;
  className?: string;
}

export function FallingDebris({
  count = 1400,
  className = '',
}: Readonly<SpaceDustProps>) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    blur: number;
    duration: number;
    delay: number;
    driftX: number;
    opacity: number;
    color: string;
  }>>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    
    // Generate particles client-side only with true randomness.
    // NOTE: We intentionally do not SSR these to avoid visible patterns/lines.
    const generated = Array.from({ length: count }, (_, i) => {
      const colorRoll = Math.random();
      const depthRoll = Math.random();

      // Space depth: far = smaller + more blurred + dimmer; near = larger + sharper + brighter.
      const far = depthRoll < 0.55;
      const size = far ? 0.8 + Math.random() * 1.4 : 1.4 + Math.random() * 2.2; // ~0.8-2.2 or ~1.4-3.6
      const blur = far ? 0.8 + Math.random() * 1.8 : Math.random() * 0.6; // far blurier, near mostly sharp

      // Always downward drift (monotonic y). Keep it slooooooooooow.
      const duration = far ? 160 + Math.random() * 160 : 110 + Math.random() * 140; // seconds

      // Subtle sideways meander (no back-and-forth “upward phase” because Y is separate and monotonic).
      const driftX = (Math.random() - 0.5) * (far ? 40 : 70); // px

      return {
        id: i,
        // Random position across viewport, including slightly above and below to avoid “spawn lines”
        x: Math.random() * 100,
        y: -20 + Math.random() * 140, // -20% to 120%
        size,
        blur,
        duration,
        delay: Math.random() * duration,
        driftX,
        opacity: far ? 0.12 + Math.random() * 0.25 : 0.18 + Math.random() * 0.38,
        // Mostly green, some yellow accents. Never white.
        color: colorRoll < 0.82 ? 'var(--primary)' : 'var(--secondary)',
      };
    });
    
    setParticles(generated);
  }, [count]);

  if (prefersReducedMotion() || particles.length === 0) {
    return null;
  }

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-space-dust"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            // Custom properties for motion (Y is always downward via translateY)
            ['--drift-x' as string]: `${p.driftX}px`,
            filter: `blur(${p.blur}px)`,
            // Light glow, stronger on nearer particles (less blur tends to mean nearer)
            boxShadow:
              p.color === 'var(--primary)'
                ? `0 0 ${Math.max(2, p.size * 2.4)}px var(--glow-primary)`
                : `0 0 ${Math.max(2, p.size * 2.4)}px var(--glow-secondary)`,
          }}
        />
      ))}

      <style jsx>{`
        /* Always downward motion. No phase ever moves upward. */
        @keyframes space-dust {
          0% {
            transform: translate3d(0, 0, 0);
          }
          33% {
            transform: translate3d(calc(var(--drift-x) * 0.35), 45vh, 0);
          }
          66% {
            transform: translate3d(calc(var(--drift-x) * 0.8), 95vh, 0);
          }
          100% {
            transform: translate3d(var(--drift-x), 140vh, 0);
          }
        }
        .animate-space-dust {
          animation: space-dust linear infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  );
}



