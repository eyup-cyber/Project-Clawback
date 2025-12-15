'use client';

import Link from 'next/link';
import { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';

// Floating particles for background
function FloatingParticles() {
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
    })), 
  []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: 'var(--primary)',
            animation: `float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(20px, -30px); }
          50% { transform: translate(-10px, 20px); }
          75% { transform: translate(15px, 10px); }
        }
      `}</style>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate logo
      gsap.from(logoRef.current, {
        opacity: 0,
        y: -30,
        scale: 0.95,
        duration: 0.8,
        ease: 'power3.out',
      });

      // Animate card
      gsap.from('.auth-content', {
        opacity: 0,
        y: 40,
        scale: 0.98,
        duration: 0.9,
        delay: 0.2,
        ease: 'power3.out',
      });

      // Animate footer links
      gsap.from('.auth-footer', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 0.5,
        ease: 'power2.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ 
        background: 'radial-gradient(ellipse at center top, rgba(1, 60, 35, 1) 0%, var(--background) 60%)' 
      }}
    >
      {/* Floating particles */}
      <FloatingParticles />

      {/* Background glows */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 80%, rgba(255, 0, 255, 0.05) 0%, transparent 50%)',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(255, 215, 0, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* Grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(var(--foreground) 1px, transparent 1px),
            linear-gradient(90deg, var(--foreground) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Logo */}
      <Link
        ref={logoRef}
        href="/"
        className="mb-10 text-center relative z-10 group"
      >
        <span
          className="text-4xl md:text-5xl block transition-all duration-300 group-hover:scale-105"
          style={{ 
            fontFamily: 'var(--font-display)',
            color: 'var(--primary)',
            textShadow: '0 0 30px var(--glow-primary)',
          }}
        >
          scroungers
        </span>
        <span
          className="text-xs tracking-[0.3em] uppercase block mt-1"
          style={{ 
            fontFamily: 'var(--font-body)',
            color: 'var(--accent)',
            fontWeight: 500,
          }}
        >
          MULTIMEDIA
        </span>
      </Link>

      {/* Content */}
      <div className="auth-content w-full max-w-md relative z-10">
        {children}
      </div>

      {/* Footer links */}
      <div 
        className="auth-footer mt-10 text-center text-sm relative z-10" 
        style={{ fontFamily: 'var(--font-body)', color: 'var(--foreground)', opacity: 0.5 }}
      >
        <Link href="/terms" className="hover:text-[var(--primary)] transition-colors">Terms</Link>
        <span className="mx-3">·</span>
        <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy</Link>
        <span className="mx-3">·</span>
        <Link href="/contact" className="hover:text-[var(--primary)] transition-colors">Contact</Link>
      </div>
    </div>
  );
}
