'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface BackgroundEffectsProps {
  variant?: 'gradient-mesh' | 'particles' | 'noise' | 'grid' | 'liquid' | 'all';
  intensity?: number;
  color?: string;
  className?: string;
}

export default function BackgroundEffects({
  variant = 'all',
  intensity = 1,
  color = 'var(--primary)',
  className = '',
}: BackgroundEffectsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientMeshRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const noiseRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const liquidRef = useRef<HTMLDivElement>(null);

  // Animated gradient mesh
  useEffect(() => {
    if (
      (variant !== 'gradient-mesh' && variant !== 'all') ||
      !gradientMeshRef.current ||
      prefersReducedMotion()
    ) {
      return;
    }

    const canvas = gradientMeshRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.01 * intensity;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, `rgba(50, 205, 50, ${0.1 * intensity})`);
      gradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.05 * intensity})`);
      gradient.addColorStop(1, `rgba(255, 0, 255, ${0.1 * intensity})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated mesh points
      const points = 20;
      for (let i = 0; i < points; i++) {
        const x = (canvas.width / points) * i + Math.sin(time + i) * 20;
        const y = (canvas.height / points) * i + Math.cos(time + i) * 20;

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [variant, intensity, color]);

  // Particle system with physics
  useEffect(() => {
    if (
      (variant !== 'particles' && variant !== 'all') ||
      !particlesRef.current ||
      prefersReducedMotion()
    ) {
      return;
    }

    const container = particlesRef.current;
    const particles: Array<{
      element: HTMLDivElement;
      x: number;
      y: number;
      vx: number;
      vy: number;
    }> = [];

    const particleCount = Math.floor(30 * intensity);

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: ${color};
        border-radius: 50%;
        opacity: ${0.3 * intensity};
        pointer-events: none;
      `;
      container.appendChild(particle);

      particles.push({
        element: particle,
        x: Math.random() * container.offsetWidth,
        y: Math.random() * container.offsetHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }

    let animationId: number;

    const animate = () => {
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > container.offsetWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > container.offsetHeight) particle.vy *= -1;

        particle.element.style.left = `${particle.x}px`;
        particle.element.style.top = `${particle.y}px`;
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      particles.forEach((p) => p.element.remove());
    };
  }, [variant, intensity, color]);

  // Noise texture overlay
  useEffect(() => {
    if ((variant !== 'noise' && variant !== 'all') || !noiseRef.current || prefersReducedMotion()) {
      return;
    }

    const noise = noiseRef.current;

    gsap.to(noise, {
      opacity: 0.03 * intensity,
      duration: getDuration(DURATION.slow),
      ease: EASING.smooth,
    });

    // Animated noise pattern
    const animateNoise = () => {
      const pattern = Array.from({ length: 1000 }, () => (Math.random() > 0.5 ? '█' : '░')).join(
        ''
      );
      noise.textContent = pattern;
    };

    const interval = setInterval(animateNoise, 100);
    animateNoise();

    return () => clearInterval(interval);
  }, [variant, intensity]);

  // Grid pattern with parallax
  useEffect(() => {
    if ((variant !== 'grid' && variant !== 'all') || !gridRef.current || prefersReducedMotion()) {
      return;
    }

    const grid = gridRef.current;

    gsap.to(grid, {
      opacity: 0.1 * intensity,
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  }, [variant, intensity]);

  // Liquid/morphing shapes
  useEffect(() => {
    if (
      (variant !== 'liquid' && variant !== 'all') ||
      !liquidRef.current ||
      prefersReducedMotion()
    ) {
      return;
    }

    const liquid = liquidRef.current;
    let morphValue = 0;

    const morph = () => {
      morphValue += 0.01 * intensity;
      const borderRadius = `${50 + Math.sin(morphValue) * 20}% ${50 - Math.sin(morphValue) * 20}% ${50 + Math.cos(morphValue) * 20}% ${50 - Math.cos(morphValue) * 20}%`;

      gsap.to(liquid, {
        borderRadius,
        duration: getDuration(DURATION.medium),
        ease: EASING.liquid,
      });

      requestAnimationFrame(morph);
    };

    morph();
  }, [variant, intensity]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Gradient mesh */}
      {(variant === 'gradient-mesh' || variant === 'all') && (
        <canvas
          ref={gradientMeshRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.5 * intensity }}
        />
      )}

      {/* Particles */}
      {(variant === 'particles' || variant === 'all') && (
        <div ref={particlesRef} className="absolute inset-0 w-full h-full" />
      )}

      {/* Noise overlay */}
      {(variant === 'noise' || variant === 'all') && (
        <div
          ref={noiseRef}
          className="absolute inset-0 w-full h-full font-mono text-xs leading-none opacity-0"
          style={{
            color: color,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Grid pattern */}
      {(variant === 'grid' || variant === 'all') && (
        <div
          ref={gridRef}
          className="absolute inset-0 w-full h-full opacity-0"
          style={{
            backgroundImage: `
              linear-gradient(${color}33 1px, transparent 1px),
              linear-gradient(90deg, ${color}33 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      )}

      {/* Liquid morphing shapes */}
      {(variant === 'liquid' || variant === 'all') && (
        <div
          ref={liquidRef}
          className="absolute inset-0 w-full h-full"
          style={{
            background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
            borderRadius: '50%',
            filter: 'blur(40px)',
          }}
        />
      )}
    </div>
  );
}
