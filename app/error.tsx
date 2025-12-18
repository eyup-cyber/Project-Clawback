'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error Boundary Page - Client Component
 *
 * Must be a Client Component to receive error/reset props.
 * Avoids auth-dependent components (Nav, Footer) to prevent prerender errors.
 * No animations or external dependencies to ensure stability during error states.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    console.error('Application error:', error);
  }, [error]);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
      <div className="text-center max-w-2xl">
        <div
          className="text-7xl mb-6"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(255, 77, 109, 0.5))' }}
        >
          &#9888;&#65039;
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
          We encountered an unexpected error. Don&apos;t worry, our team has been notified. You can
          try again or head back to the home page.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-transform hover:scale-105"
            style={{
              background: 'var(--primary)',
              color: 'var(--background)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium border transition-colors hover:bg-[var(--surface)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            &#8592; Back Home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details
            className="mt-8 text-left p-4 rounded-lg"
            style={{ background: 'var(--surface)' }}
          >
            <summary
              className="cursor-pointer font-mono text-sm"
              style={{ color: 'var(--accent)' }}
            >
              Error Details (Dev Only)
            </summary>
            <pre
              className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap"
              style={{ color: 'var(--foreground)', opacity: 0.7 }}
            >
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}
