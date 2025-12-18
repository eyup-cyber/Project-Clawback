'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  EASING,
  DURATION,
  COLORS,
  prefersReducedMotion,
  getDuration,
} from '@/lib/animations/gsap-config';
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

  useEffect(() => {
    // Skip animation if user prefers reduced motion (already set loaded=true via useState initializer)
    if (prefersReducedMotion()) return;

    // Fallback timer: ensure isLoaded becomes true even if animation doesn't complete
    const fallbackTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 5000);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: EASING.dramatic },
        onComplete: () => {
          clearTimeout(fallbackTimer);
          setIsLoaded(true);
        },
      });

      // Get all letter spans
      const letters = scroungerRef.current?.querySelectorAll('.letter');
      if (!letters || letters.length === 0) {
        clearTimeout(fallbackTimer);
        setIsLoaded(true);
        return;
      }

      // Check all refs exist before animating
      if (!multimediaRef.current || !glowRef.current || !scroungerRef.current) {
        clearTimeout(fallbackTimer);
        setIsLoaded(true);
        return;
      }

      // Initial states
      gsap.set(letters, { y: 120, opacity: 0, rotateX: -90 });
      gsap.set(multimediaRef.current, {
        y: 10,
        opacity: 0,
        letterSpacing: '0.15em',
      });
      gsap.set(glowRef.current, { scale: 0.5, opacity: 0 });

      // T+0.2s - Ambient glow starts
      tl.to(
        glowRef.current,
        {
          scale: 1,
          opacity: 0.4,
          duration: getDuration(1.2),
          ease: EASING.smooth,
        },
        0.2
      );

      // T+0.4s - Letters flip and drop in
      tl.to(
        letters,
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: getDuration(DURATION.slow),
          stagger: {
            each: 0.06,
            from: 'center',
          },
          ease: EASING.bounce,
        },
        0.4
      );

      // T+1.0s - Logo pulse effect
      tl.to(
        scroungerRef.current,
        {
          scale: 1.03,
          textShadow: `0 0 40px ${COLORS.glowPrimary}, 0 0 80px ${COLORS.glowPrimary}`,
          duration: getDuration(0.2),
          ease: EASING.smooth,
        },
        1.0
      );

      tl.to(
        scroungerRef.current,
        {
          scale: 1,
          textShadow: `0 0 20px ${COLORS.glowPrimary}, 0 0 40px rgba(50, 205, 50, 0.2)`,
          duration: getDuration(0.3),
          ease: EASING.elastic,
        },
        1.2
      );

      // T+1.2s - MULTIMEDIA slides up with letter spacing animation
      tl.to(
        multimediaRef.current,
        {
          y: 0,
          opacity: 1,
          letterSpacing: '0.05em',
          duration: getDuration(DURATION.slow),
          ease: EASING.expo,
        },
        1.2
      );

      // T+1.8s - Glow expands and pulses
      tl.to(
        glowRef.current,
        {
          scale: 1.5,
          opacity: 0.3,
          duration: getDuration(1.5),
          ease: EASING.smooth,
        },
        1.8
      );

      // Continuous subtle glow pulsing
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0.2,
          scale: 1.6,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: EASING.smoothInOut,
          delay: 3,
        });
      }
    }, containerRef);

    return () => {
      clearTimeout(fallbackTimer);
      ctx.revert();
    };
  }, []);

  // Letter hover interactions with xylophone sounds
  useEffect(() => {
    if (prefersReducedMotion() || !isLoaded) return;

    const letters = scroungerRef.current?.querySelectorAll('.letter');
    if (!letters || letters.length === 0) return;

    const cleanupFunctions: Array<() => void> = [];

    letters.forEach((letter, index) => {
      const handleMouseEnter = () => {
        // Play xylophone note for this letter
        playXylophoneNote(index);

        gsap.to(letter, {
          color: '#FFD700', // Yellow/Gold
          scale: 1.15,
          y: -8, // More pronounced upward pop
          rotation: 0, // No rotation
          textShadow: '0 0 20px #FFD700, 0 0 40px rgba(255, 215, 0, 0.2)',
          duration: 0.3,
          ease: 'power3.out', // Graceful motion
        });
      };

      const handleMouseLeave = () => {
        gsap.to(letter, {
          color: 'var(--primary)', // Back to lime green
          scale: 1,
          y: 0,
          rotation: 0,
          textShadow: 'none',
          duration: 0.4,
          ease: EASING.elastic,
        });
      };

      letter.addEventListener('mouseenter', handleMouseEnter);
      letter.addEventListener('mouseleave', handleMouseLeave);

      cleanupFunctions.push(() => {
        letter.removeEventListener('mouseenter', handleMouseEnter);
        letter.removeEventListener('mouseleave', handleMouseLeave);
      });
    });

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
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
          className="logo-multimedia block text-lg sm:text-xl md:text-2xl -mt-5 lowercase"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: COLORS.secondary,
            textShadow: `0 0 20px ${COLORS.glowSecondary}`,
            willChange: 'transform, opacity, letter-spacing',
            letterSpacing: '0.05em',
          }}
        >
          multimedia
        </span>
      </div>
    </section>
  );
}
