'use client';

import { useEffect, useLayoutEffect, useRef, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  COLORS,
  EASING,
  DURATION,
  prefersReducedMotion,
  getDuration,
} from '@/lib/animations/gsap-config';
import { FloatingParticles } from './effects/Particles';
import { GridPattern } from './effects/Noise';
import { playXylophoneNote, initializeAudio } from '@/lib/audio';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================
// SEEDED PSEUDO-RANDOM FOR DETERMINISTIC PARTICLES
// ============================================

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// ============================================
// WEBGL PARTICLE FIELD
// ============================================

interface ParticleFieldProps {
  count?: number;
  color?: string;
  mousePosition: { x: number; y: number };
}

function ParticleField({ count = 500, color = COLORS.primary, mousePosition }: ParticleFieldProps) {
  const mesh = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  // Generate particle positions using seeded random for determinism
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Spread across viewport using seeded random
      pos[i3] = (seededRandom(i * 3) - 0.5) * viewport.width * 2;
      pos[i3 + 1] = (seededRandom(i * 3 + 1) - 0.5) * viewport.height * 2;
      pos[i3 + 2] = (seededRandom(i * 3 + 2) - 0.5) * 3;

      // Seeded velocities
      vel[i3] = (seededRandom(i * 6) - 0.5) * 0.01;
      vel[i3 + 1] = (seededRandom(i * 6 + 1) - 0.5) * 0.01;
      vel[i3 + 2] = (seededRandom(i * 6 + 2) - 0.5) * 0.01;
    }

    return [pos, vel];
  }, [count, viewport.width, viewport.height]);

  // Generate sizes using seeded random
  const sizes = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = seededRandom(i * 100) * 3 + 1;
    }
    return arr;
  }, [count]);

  // Animation loop
  useFrame((state) => {
    if (!mesh.current) return;

    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    // Mouse influence
    const mouseX = mousePosition.x * viewport.width * 0.5;
    const mouseY = mousePosition.y * viewport.height * 0.5;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Base movement
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += Math.sin(time * 0.5 + i * 0.1) * 0.002;

      // Mouse repulsion
      const dx = positions[i3] - mouseX;
      const dy = positions[i3 + 1] - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        const force = (2 - dist) * 0.02;
        positions[i3] += (dx / dist) * force;
        positions[i3 + 1] += (dy / dist) * force;
      }

      // Wrap around edges
      if (positions[i3] > viewport.width) positions[i3] = -viewport.width;
      if (positions[i3] < -viewport.width) positions[i3] = viewport.width;
      if (positions[i3 + 1] > viewport.height) positions[i3 + 1] = -viewport.height;
      if (positions[i3 + 1] < -viewport.height) positions[i3 + 1] = viewport.height;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;

    // Gentle rotation
    mesh.current.rotation.z = time * 0.02;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ============================================
// ANIMATED LETTER COMPONENT
// ============================================

interface AnimatedLetterProps {
  char: string;
  index: number;
  isLoaded: boolean;
  onHover: (index: number) => void;
  onLeave: (index: number) => void;
}

function AnimatedLetter({ char, index, isLoaded, onHover, onLeave }: AnimatedLetterProps) {
  const letterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!letterRef.current || !isLoaded) return;

    // Add continuous subtle floating animation
    const floatAnimation = gsap.to(letterRef.current, {
      y: -2,
      duration: 2 + index * 0.1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: index * 0.1,
    });

    return () => {
      floatAnimation.kill();
    };
  }, [isLoaded, index]);

  const handleMouseEnter = () => {
    if (!letterRef.current || prefersReducedMotion()) return;

    onHover(index);
    playXylophoneNote(index);

    gsap.to(letterRef.current, {
      color: COLORS.secondary,
      scale: 1.2,
      y: -15,
      rotateZ: (Math.random() - 0.5) * 10,
      textShadow: `0 0 30px ${COLORS.glowSecondary}, 0 0 60px ${COLORS.glowSecondary}`,
      duration: 0.3,
      ease: EASING.bounce,
    });
  };

  const handleMouseLeave = () => {
    if (!letterRef.current) return;

    onLeave(index);

    gsap.to(letterRef.current, {
      color: COLORS.primary,
      scale: 1,
      y: 0,
      rotateZ: 0,
      textShadow: `0 0 20px ${COLORS.glowPrimary}`,
      duration: 0.5,
      ease: EASING.elastic,
    });
  };

  return (
    <span
      ref={letterRef}
      className="letter inline-block cursor-pointer select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        color: COLORS.primary,
        willChange: 'transform, opacity',
        transformStyle: 'preserve-3d',
        textShadow: `0 0 20px ${COLORS.glowPrimary}`,
      }}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  );
}

// ============================================
// TAGLINE TYPEWRITER
// ============================================

interface TypewriterTaglineProps {
  text: string;
  startDelay?: number;
}

function TypewriterTagline({ text, startDelay = 1.5 }: TypewriterTaglineProps) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayText(text);
      setShowCursor(false);
      return;
    }

    let charIndex = 0;
    const chars = text.split('');

    const startTyping = setTimeout(() => {
      const typeInterval = setInterval(() => {
        if (charIndex < chars.length) {
          setDisplayText(text.substring(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typeInterval);
          // Hide cursor after typing
          setTimeout(() => setShowCursor(false), 500);
        }
      }, 50);

      return () => clearInterval(typeInterval);
    }, startDelay * 1000);

    return () => clearTimeout(startTyping);
  }, [text, startDelay]);

  return (
    <p className="text-lg sm:text-xl md:text-2xl text-foreground/80 font-medium mt-6 max-w-2xl mx-auto">
      {displayText}
      {showCursor && <span className="animate-pulse ml-1 text-primary">|</span>}
    </p>
  );
}

// ============================================
// SCROLL INDICATOR
// ============================================

function ScrollIndicator() {
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!indicatorRef.current || prefersReducedMotion()) return;

    // Fade out on scroll
    gsap.to(indicatorRef.current, {
      opacity: 0,
      y: -20,
      scrollTrigger: {
        trigger: indicatorRef.current,
        start: 'top 80%',
        end: 'top 60%',
        scrub: true,
      },
    });

    // Bounce animation
    gsap.to(indicatorRef.current.querySelector('.scroll-arrow'), {
      y: 8,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, []);

  return (
    <div
      ref={indicatorRef}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/50"
    >
      <span className="text-xs uppercase tracking-widest">Scroll</span>
      <div className="scroll-arrow">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </div>
  );
}

// ============================================
// MAIN HERO COMPONENT
// ============================================

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const scroungerRef = useRef<HTMLHeadingElement>(null);
  const multimediaRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const [isLoaded, setIsLoaded] = useState(() => prefersReducedMotion());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [_hoveredLetter, setHoveredLetter] = useState<number | null>(null);

  const scroungers = 'scroungers'.split('');
  const tagline = 'Political journalism from the people who live it.';

  // Track mouse for parallax and WebGL
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

  // Initial animation setup
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;

    const letters = scroungerRef.current?.querySelectorAll('.letter');
    if (letters) {
      gsap.set(letters, {
        y: 80,
        opacity: 0,
        rotateX: -45,
        transformOrigin: 'center bottom',
      });
    }
    if (multimediaRef.current) {
      gsap.set(multimediaRef.current, { y: 40, opacity: 0, scale: 0.9 });
    }
    if (glowRef.current) {
      gsap.set(glowRef.current, { scale: 0.5, opacity: 0 });
    }
    if (contentRef.current) {
      gsap.set(contentRef.current.querySelectorAll('.fade-in'), { y: 30, opacity: 0 });
    }
  }, []);

  // Main entrance animation
  useEffect(() => {
    if (prefersReducedMotion()) {
      setIsLoaded(true);
      return;
    }

    const ctx = gsap.context(() => {
      const letters = scroungerRef.current?.querySelectorAll('.letter');
      const multimedia = multimediaRef.current;
      const glow = glowRef.current;
      const fadeElements = contentRef.current?.querySelectorAll('.fade-in');

      if (!letters?.length || !multimedia || !glow) {
        setIsLoaded(true);
        return;
      }

      const tl = gsap.timeline({
        onComplete: () => setIsLoaded(true),
      });

      // Glow builds up
      tl.to(
        glow,
        {
          scale: 1,
          opacity: 0.6,
          duration: getDuration(DURATION.slow),
          ease: EASING.smooth,
        },
        0
      );

      // Letters reveal from center outward
      tl.to(
        letters,
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: getDuration(DURATION.medium),
          stagger: {
            each: 0.04,
            from: 'center',
          },
          ease: EASING.bounce,
        },
        0.3
      );

      // Multimedia slides up
      tl.to(
        multimedia,
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: getDuration(DURATION.medium),
          ease: EASING.snappy,
        },
        0.8
      );

      // Logo pulse
      tl.to(
        scroungerRef.current,
        {
          scale: 1.03,
          duration: 0.2,
          ease: EASING.smooth,
        },
        1.1
      );

      tl.to(
        scroungerRef.current,
        {
          scale: 1,
          duration: 0.4,
          ease: EASING.elastic,
        },
        1.3
      );

      // Fade in additional content
      if (fadeElements?.length) {
        tl.to(
          fadeElements,
          {
            y: 0,
            opacity: 1,
            duration: getDuration(DURATION.medium),
            stagger: 0.1,
            ease: EASING.snappy,
          },
          1.2
        );
      }

      // Continuous glow animation
      gsap.to(glow, {
        opacity: 0.3,
        scale: 1.2,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2,
      });
    }, containerRef);

    const fallback = setTimeout(() => setIsLoaded(true), 4000);

    return () => {
      clearTimeout(fallback);
      ctx.revert();
    };
  }, []);

  // Parallax scroll effect
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Content parallax
      if (contentRef.current) {
        gsap.to(contentRef.current, {
          y: 100,
          opacity: 0.5,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Mouse-based parallax styles
  const parallaxStyle = (intensity: number) => ({
    transform: prefersReducedMotion()
      ? undefined
      : `translate(${mousePosition.x * intensity}px, ${mousePosition.y * intensity}px)`,
    transition: 'transform 0.2s ease-out',
  });

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at center top, rgba(1, 60, 35, 1) 0%, var(--background) 70%)',
      }}
    >
      {/* WebGL Particle Field */}
      {!prefersReducedMotion() && (
        <div className="absolute inset-0 z-0">
          <Canvas
            camera={{ position: [0, 0, 5], fov: 75 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={null}>
              <ParticleField count={300} color={COLORS.primary} mousePosition={mousePosition} />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* Grid Pattern */}
      <GridPattern size={80} opacity={0.02} />

      {/* Floating Particles (2D fallback/supplement) */}
      <FloatingParticles count={20} color="var(--primary)" minSize={1} maxSize={4} />

      {/* Background Glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: `radial-gradient(ellipse at ${50 + mousePosition.x * 10}% ${50 + mousePosition.y * 10}%, rgba(50, 205, 50, 0.25) 0%, transparent 50%)`,
          willChange: 'transform, opacity',
        }}
      />

      {/* Secondary Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
        style={{
          background: `radial-gradient(ellipse at ${50 - mousePosition.x * 15}% ${50 - mousePosition.y * 15}%, rgba(255, 215, 0, 0.15) 0%, transparent 40%)`,
          ...parallaxStyle(-15),
        }}
      />

      {/* Main Content */}
      <div
        ref={contentRef}
        className="relative z-10 text-center px-4"
        style={parallaxStyle(8)}
        onMouseEnter={initializeAudio}
      >
        {/* scroungers - split letters */}
        <h1
          ref={scroungerRef}
          className="logo-scroungers text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-medium leading-none lowercase mb-2"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            perspective: '1200px',
          }}
        >
          {scroungers.map((char, i) => (
            <AnimatedLetter
              key={i}
              char={char}
              index={i}
              isLoaded={isLoaded}
              onHover={setHoveredLetter}
              onLeave={() => setHoveredLetter(null)}
            />
          ))}
        </h1>

        {/* MULTIMEDIA */}
        <span
          ref={multimediaRef}
          className="logo-multimedia block text-xl sm:text-2xl md:text-3xl lowercase tracking-[0.2em]"
          style={{
            fontFamily: 'var(--font-display)',
            color: COLORS.secondary,
            textShadow: `0 0 20px ${COLORS.glowSecondary}`,
            willChange: 'transform, opacity',
          }}
        >
          {'multimedia'.split('').map((char, i) => (
            <span
              key={i}
              className="inline-block hover:scale-110 transition-transform duration-200"
              style={{
                animationDelay: `${1.5 + i * 0.1}s`,
              }}
            >
              {char}
            </span>
          ))}
        </span>

        {/* Tagline with typewriter */}
        <div className="fade-in mt-8">
          <TypewriterTagline text={tagline} startDelay={2} />
        </div>

        {/* CTA Buttons */}
        <div className="fade-in flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            href="/articles"
            className="group relative px-8 py-3 bg-primary text-background font-medium rounded-full overflow-hidden transition-all duration-300 hover:scale-105"
            data-cursor="pointer"
            data-cursor-text="Read"
          >
            <span className="relative z-10">Read Articles</span>
            <div className="absolute inset-0 bg-secondary scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" />
          </Link>
          <a
            href="/apply"
            className="px-8 py-3 border-2 border-primary text-primary font-medium rounded-full hover:bg-primary hover:text-background transition-all duration-300 hover:scale-105"
            data-cursor="pointer"
            data-cursor-text="Join"
          >
            Become a Contributor
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <ScrollIndicator />

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[5]"
        style={{
          background: 'linear-gradient(to top, var(--background), transparent)',
        }}
      />
    </section>
  );
}
