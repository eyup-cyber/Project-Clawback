'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import Nav from './components/Nav';
import Footer from './components/layout/Footer';

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.not-found-content > *',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out' }
      );

      // Glitch effect on 404
      gsap.to('.glitch-text', {
        skewX: 5,
        duration: 0.1,
        repeat: -1,
        yoyo: true,
        ease: 'steps(1)',
        repeatDelay: 3,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <Nav />
      <main
        ref={containerRef}
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--background)' }}
      >
        <div className="not-found-content text-center max-w-2xl">
          <div
            className="glitch-text text-9xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
          >
            404
          </div>
          <h1
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
          >
            Page Not Found
          </h1>
          <p
            className="text-lg mb-8"
            style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
          >
            Looks like this page has been scrounged away. The content you&apos;re looking for might have
            been moved, deleted, or maybe never existed in the first place.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-transform hover:scale-105"
              style={{ background: 'var(--primary)', color: 'var(--background)', fontFamily: 'var(--font-kindergarten)' }}
            >
              ← Back Home
            </Link>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium border transition-colors hover:bg-[var(--surface)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Browse Articles
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

