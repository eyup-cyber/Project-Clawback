/**
 * Offline Page
 * Displayed when the user is offline and content is not cached
 */

import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--background)' }}
    >
      <div className="text-center max-w-md">
        {/* Offline icon */}
        <div
          className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'var(--surface)' }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--foreground)', opacity: 0.5 }}
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="text-3xl font-bold mb-4"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--foreground)',
          }}
        >
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
          It looks like you&apos;ve lost your internet connection. Some features may be unavailable
          until you reconnect.
        </p>

        {/* Cached content note */}
        <div className="p-4 rounded-xl mb-6" style={{ background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            💡 <strong>Tip:</strong> Previously viewed articles may still be accessible offline.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
            style={{
              background: 'var(--primary)',
              color: 'var(--background)',
              boxShadow: '0 0 20px var(--glow-primary)',
            }}
          >
            Try Again
          </button>

          <Link
            href="/"
            className="w-full px-6 py-3 rounded-xl font-medium transition-colors text-center"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          >
            Go to Homepage
          </Link>
        </div>

        {/* Connection status indicator */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ef4444' }} />
          <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
            Waiting for connection...
          </span>
        </div>
      </div>

      {/* Auto-refresh script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Check for connectivity and reload when back online
            window.addEventListener('online', function() {
              window.location.reload();
            });
          `,
        }}
      />
    </div>
  );
}
