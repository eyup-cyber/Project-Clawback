'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Nav from './components/Nav';
import Footer from './components/layout/Footer';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Log error for debugging
    console.error('Application error:', error);

    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.error-content > *',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [error]);

  return (
    <>
      <Nav />
      <main
        ref={containerRef}
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--background)' }}
      >
        <div className="error-content text-center max-w-2xl">
          <div
            className="text-7xl mb-6"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(255, 77, 109, 0.5))' }}
          >
            ⚠️
          </div>
          <h1
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--accent)' }}
          >
            Something went wrong
          </h1>
          <p
            className="text-lg mb-8"
            style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
          >
            We encountered an unexpected error. Don&apos;t worry, our team has been notified.
            You can try again or head back to the home page.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-transform hover:scale-105"
              style={{ background: 'var(--primary)', color: 'var(--background)', fontFamily: 'var(--font-kindergarten)' }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium border transition-colors hover:bg-[var(--surface)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              ← Back Home
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 text-left p-4 rounded-lg" style={{ background: 'var(--surface)' }}>
              <summary className="cursor-pointer font-mono text-sm" style={{ color: 'var(--accent)' }}>
                Error Details (Dev Only)
              </summary>
              <pre className="mt-2 text-xs overflow-x-auto" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

