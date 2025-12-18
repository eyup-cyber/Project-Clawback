'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { COLORS, prefersReducedMotion } from '@/lib/animations/gsap-config';
import { FloatingParticles } from './effects/Particles';
import { GridPattern } from './effects/Noise';
import { playXylophoneNote, initializeAudio } from '@/lib/audio';

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const scroungerRef = useRef<HTMLHeadingElement>(null);
  const multimediaRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  // Initialize to true if user prefers reduced motion (no animation needed)
  const [isLoaded, setIsLoaded] = useState(() => prefersReducedMotion());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse for parallax effect
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Set initial states synchronously before first paint
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;

    const letters = scroungerRef.current?.querySelectorAll('.letter');
    if (letters) {
      gsap.set(letters, {
        y: 60,
        opacity: 0,
        rotateX: -30,
        transformOrigin: 'center bottom',
      });
    }
    if (multimediaRef.current) {
      gsap.set(multimediaRef.current, { y: 30, opacity: 0 });
    }
    if (glowRef.current) {
      gsap.set(glowRef.current, { scale: 0.8, opacity: 0 });
    }
  }, []);

  // Main animation with GSAP context for proper cleanup
  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const letters = scroungerRef.current?.querySelectorAll('.letter');
      const multimedia = multimediaRef.current;
      const glow = glowRef.current;
      const scrounger = scroungerRef.current;

      if (!letters || letters.length === 0 || !multimedia || !glow || !scrounger) {
        setIsLoaded(true);
        return;
      }

      // Main animation timeline
      const tl = gsap.timeline({
        onComplete: () => setIsLoaded(true),
      });

      // Glow fades in first
      tl.to(
        glow,
        {
          scale: 1,
          opacity: 0.5,
          duration: 1,
          ease: 'power2.out',
        },
        0
      );

      // Letters animate in from center outward
      tl.to(
        letters,
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.6,
          stagger: { each: 0.03, from: 'center' },
          ease: 'back.out(1.4)',
        },
        0.2
      );

      // Multimedia slides up and fades in
      tl.to(
        multimedia,
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        },
        0.7
      );

      // Subtle pulse on scroungers
      tl.to(
        scrounger,
        {
          scale: 1.02,
          duration: 0.15,
          ease: 'power2.inOut',
        },
        1.0
      );

      tl.to(
        scrounger,
        {
          scale: 1,
          duration: 0.25,
          ease: 'elastic.out(1, 0.5)',
        },
        1.15
      );

      // Continuous glow animation (starts after intro)
      gsap.to(glow, {
        opacity: 0.3,
        scale: 1.3,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1.5,
      });
    }, containerRef);

    // Fallback to ensure isLoaded becomes true
    const fallback = setTimeout(() => setIsLoaded(true), 3000);

    return () => {
      clearTimeout(fallback);
      ctx.revert(); // Clean revert of all animations
    };
  }, []);

  // Letter hover interactions with xylophone sounds (debounced)
  useEffect(() => {
    if (prefersReducedMotion() || !isLoaded) return;

    const letters = scroungerRef.current?.querySelectorAll('.letter');
    if (!letters || letters.length === 0) return;

    const handlers: Array<{ el: HTMLElement; enter: () => void; leave: () => void }> = [];
    const HOVER_DEBOUNCE = 50; // ms
    const lastHoverTimes = new Map<HTMLElement, number>();

    letters.forEach((letter, index) => {
      const el = letter as HTMLElement;
      lastHoverTimes.set(el, 0);

      const enter = () => {
        const now = Date.now();
        const lastTime = lastHoverTimes.get(el) || 0;
        if (now - lastTime < HOVER_DEBOUNCE) return;
        lastHoverTimes.set(el, now);

        playXylophoneNote(index);
        gsap.to(el, {
          color: '#FFD700',
          scale: 1.15,
          y: -10,
          duration: 0.2,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };

      const leave = () => {
        gsap.to(el, {
          color: '#32CD32',
          scale: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };

      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
      handlers.push({ el, enter, leave });
    });

    return () => {
      handlers.forEach(({ el, enter, leave }) => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
    };
  }, [isLoaded]);

  // Mouse-based parallax for elements
  const parallaxStyle = (intensity: number) => ({
    transform: prefersReducedMotion()
      ? undefined
      : `translate(${mousePosition.x * intensity}px, ${mousePosition.y * intensity}px)`,
    transition: 'transform 0.3s ease-out',
  });

  // Split "scroungers" into individual letters
  const scroungers = 'scroungers'.split('');

  return (
    <section
      ref={containerRef}
      className="pt-24 pb-4 flex flex-col items-center justify-start relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at center top, rgba(1, 60, 35, 1) 0%, var(--background) 70%)',
      }}
    >
      {/* Animated grid pattern */}
      <GridPattern size={80} opacity={0.02} />

      {/* Floating particles */}
      <FloatingParticles count={30} color="var(--primary)" minSize={1} maxSize={4} />

      {/* Background glow effect - responds to mouse with parallax */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at ${50 + mousePosition.x * 5}% ${
            50 + mousePosition.y * 5
          }%, rgba(50, 205, 50, 0.2) 0%, transparent 50%)`,
          willChange: 'transform, opacity',
        }}
      />

      {/* Secondary accent glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(ellipse at ${50 - mousePosition.x * 10}% ${
            50 - mousePosition.y * 10
          }%, rgba(255, 215, 0, 0.1) 0%, transparent 40%)`,
          ...parallaxStyle(-10),
        }}
      />

      {/* Logo container with parallax */}
      <div
        className="relative z-10 text-center"
        style={parallaxStyle(5)}
        onMouseEnter={initializeAudio}
      >
        {/* scroungers - letter by letter - HelveticaNow font */}
        <h1
          ref={scroungerRef}
          className="logo-scroungers text-7xl sm:text-8xl md:text-9xl font-medium leading-none cursor-default select-none lowercase"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            perspective: '1000px',
            textShadow: `0 0 30px ${COLORS.glowPrimary}`,
          }}
        >
          {scroungers.map((letter, i) => (
            <span
              key={i}
              className="letter inline-block cursor-pointer"
              style={{
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity, color',
                transform: 'translateZ(0)', // Force GPU layer
                color: 'var(--primary)',
                display: 'inline-block',
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          ))}
        </h1>

        {/* MULTIMEDIA - Kindergarten font */}
        <span
          ref={multimediaRef}
          className="logo-multimedia block text-xl sm:text-2xl md:text-3xl mt-8 sm:mt-10 md:mt-12 lowercase"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: COLORS.secondary,
            textShadow: `0 0 20px ${COLORS.glowSecondary}`,
            willChange: 'transform, opacity',
            transform: 'translateZ(0)', // Force GPU layer
            letterSpacing: '0.15em',
            position: 'relative',
            zIndex: 10,
          }}
        >
          multimedia
        </span>
      </div>
    </section>
  );
}
