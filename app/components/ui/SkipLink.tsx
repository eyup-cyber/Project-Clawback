'use client';

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2"
      style={{
        background: 'var(--primary)',
        color: 'var(--background)',
        fontFamily: 'var(--font-kindergarten)',
      }}
    >
      Skip to main content
    </a>
  );
}









