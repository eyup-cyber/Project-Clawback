'use client';

import gsap from 'gsap';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Track mouse for interactive effect
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Animate 404 number
      if (numberRef.current) {
        const digits = numberRef.current.querySelectorAll('.digit');
        gsap.fromTo(
          digits,
          { y: 100, opacity: 0, rotateX: -90 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            stagger: 0.15,
            duration: getDuration(DURATION.slow),
            ease: EASING.bounce,
          }
        );
      }

      // Animate content
      const content = containerRef.current?.querySelectorAll('.animate-in');
      if (content) {
        gsap.fromTo(
          content,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            delay: 0.5,
            duration: getDuration(DURATION.medium),
            ease: EASING.snappy,
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Floating particles animation
  useEffect(() => {
    if (!particlesRef.current || prefersReducedMotion()) return;

    const particles = particlesRef.current.children;

    Array.from(particles).forEach((particle, i) => {
      gsap.to(particle, {
        y: `${-20 + Math.random() * 40}`,
        x: `${-20 + Math.random() * 40}`,
        rotation: Math.random() * 360,
        duration: 3 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.2,
      });
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(1, 60, 35, 1) 0%, var(--background) 70%)',
      }}
    >
      {/* Floating particles */}
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => {
          // Use seeded random for deterministic positions
          const seededRandom = (seed: number) => {
            const x = Math.sin(seed * 9999) * 10000;
            return x - Math.floor(x);
          };
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full opacity-30"
              style={{
                left: `${seededRandom(i * 2) * 100}%`,
                top: `${seededRandom(i * 2 + 1) * 100}%`,
                backgroundColor: i % 2 === 0 ? COLORS.primary : COLORS.secondary,
              }}
            />
          );
        })}
      </div>

      {/* Glow effect that follows mouse */}
      <div
        className="absolute w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{
          background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)`,
          left: `calc(50% + ${mousePos.x * 100}px)`,
          top: `calc(50% + ${mousePos.y * 100}px)`,
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.3s ease-out, top 0.3s ease-out',
        }}
      />

      {/* 404 Number */}
      <div
        ref={numberRef}
        className="text-[8rem] sm:text-[12rem] md:text-[16rem] font-bold leading-none mb-8"
        style={{
          perspective: '1000px',
          transform: `rotateX(${mousePos.y * 5}deg) rotateY(${mousePos.x * 5}deg)`,
          transition: 'transform 0.2s ease-out',
        }}
      >
        <span
          className="digit inline-block"
          style={{
            color: COLORS.primary,
            textShadow: `0 0 60px ${COLORS.glowPrimary}, 0 0 120px ${COLORS.glowPrimary}`,
          }}
        >
          4
        </span>
        <span
          className="digit inline-block mx-2"
          style={{
            color: COLORS.secondary,
            textShadow: `0 0 60px ${COLORS.glowSecondary}, 0 0 120px ${COLORS.glowSecondary}`,
          }}
        >
          0
        </span>
        <span
          className="digit inline-block"
          style={{
            color: COLORS.primary,
            textShadow: `0 0 60px ${COLORS.glowPrimary}, 0 0 120px ${COLORS.glowPrimary}`,
          }}
        >
          4
        </span>
      </div>

      {/* Content */}
      <h1 className="animate-in text-2xl sm:text-3xl font-medium text-foreground mb-4 text-center">
        Page Not Found
      </h1>

      <p className="animate-in text-foreground/60 text-center max-w-md mb-8">
        Looks like you&apos;ve wandered into uncharted territory. The page you&apos;re looking for
        doesn&apos;t exist or has been moved.
      </p>

      {/* Actions */}
      <div className="animate-in flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="px-8 py-3 bg-primary text-background font-medium rounded-full hover:bg-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 text-center"
        >
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="px-8 py-3 border-2 border-primary text-primary font-medium rounded-full hover:bg-primary hover:text-background transition-all duration-300 hover:scale-105"
        >
          Go Back
        </button>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-in">
        <p className="text-foreground/30 text-sm">
          Lost? Try searching or browse our{' '}
          <Link href="/articles" className="text-primary hover:underline">
            articles
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
