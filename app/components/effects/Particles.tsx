'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { prefersReducedMotion } from '@/lib/animations/gsap-config';

// Hook to check if we're on the client side (hydration-safe)
const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // Client: mounted
    () => false // Server: not mounted
  );
}

// Seeded random for deterministic particle generation
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

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
}: ParticlesProps) {
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
}: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const mousePosition = useRef({ x: 0, y: 0 });

  // Generate initial positions using seeded random for determinism
  const [particles] = useState(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);
    const random = createSeededRandom(42);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (random() - 0.5) * spread;
      positions[i3 + 1] = (random() - 0.5) * spread;
      positions[i3 + 2] = (random() - 0.5) * spread;

      originalPositions[i3] = positions[i3];
      originalPositions[i3 + 1] = positions[i3 + 1];
      originalPositions[i3 + 2] = positions[i3 + 2];

      velocities[i3] = (random() - 0.5) * speed;
      velocities[i3 + 1] = (random() - 0.5) * speed;
      velocities[i3 + 2] = (random() - 0.5) * speed;
    }

    return { positions, velocities, originalPositions };
  });

  // Track mouse position
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2 * spread * 0.5,
        y: -(e.clientY / window.innerHeight - 0.5) * 2 * spread * 0.5,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
        positions[i3] = (-Math.sign(positions[i3]) * spread) / 2;
      }
      if (Math.abs(positions[i3 + 1]) > spread / 2) {
        positions[i3 + 1] = (-Math.sign(positions[i3 + 1]) * spread) / 2;
      }
      if (Math.abs(positions[i3 + 2]) > spread / 2) {
        positions[i3 + 2] = (-Math.sign(positions[i3 + 2]) * spread) / 2;
      }

      // Interactive - push particles away from mouse
      if (interactive) {
        const dx = positions[i3] - mousePosition.current.x;
        const dy = positions[i3 + 1] - mousePosition.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
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
        <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
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
}: FloatingParticlesProps) {
  const mounted = useIsMounted();

  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const random = createSeededRandom(i * 1000);
      return {
        id: i,
        x: random() * 100,
        y: random() * 100,
        size: minSize + random() * (maxSize - minSize),
        duration: 10 + random() * 20,
        delay: random() * 10,
        opacity: 0.3 + random() * 0.3,
      };
    })
  );

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
          0%,
          100% {
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

export function Sparkle({ color = 'var(--secondary)', count = 3, className = '' }: SparkleProps) {
  const [sparkles] = useState(() => {
    const random = createSeededRandom(123);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 20 + random() * 60,
      y: 20 + random() * 60,
      size: 4 + random() * 8,
      duration: 1 + random() * 2,
      delay: random() * 2,
    }));
  });

  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {sparkles.map((s) => (
        <svg
          key={s.id}
          className="absolute animate-sparkle"
          aria-hidden="true"
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
          <title>Sparkle</title>
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      ))}

      <style jsx>{`
        @keyframes sparkle {
          0%,
          100% {
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

// SpaceDust: slow, downward drifting particles (space-like)
interface SpaceDustProps {
  count?: number;
}

export function SpaceDust({ count = 2200 }: SpaceDustProps) {
  const mounted = useIsMounted();

  // 80% lime green, 20% gold
  const getColor = (seed: number) => {
    return seed > 0.8 ? 'var(--secondary)' : 'var(--primary)';
  };

  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const random = createSeededRandom(i * 9999);
      return {
        id: i,
        left: random() * 100,
        size: 1 + random() * 3, // 1-4px for more depth variation
        duration: 110 + random() * 210, // 110-320s
        delay: -random() * 320, // Start mid-cycle
        opacity: 0.3 + random() * 0.3, // 0.3-0.6 for better visibility
        blur: random() * 1.5, // 0-1.5px blur (slightly less for clarity)
        color: getColor(random()),
        sway: 10 + random() * 30, // Horizontal sway amount
      };
    })
  );

  if (prefersReducedMotion() || !mounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-spacedust"
          style={
            {
              left: `${p.left}%`,
              top: '-10px', // Start slightly above
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
              filter: `blur(${p.blur}px)`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              // Custom property for horizontal sway
              '--sway': `${p.sway}px`,
            } as React.CSSProperties
          }
        />
      ))}

      <style jsx>{`
        @keyframes spacedust {
          0% {
            transform: translateY(0) translateX(calc(var(--sway) * -1));
          }
          50% {
            transform: translateY(55vh) translateX(var(--sway));
          }
          100% {
            transform: translateY(110vh) translateX(calc(var(--sway) * -1));
          }
        }
        .animate-spacedust {
          animation: spacedust linear infinite;
        }
      `}</style>
    </div>
  );
}
