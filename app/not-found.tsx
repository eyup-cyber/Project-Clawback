import Link from 'next/link';

/**
 * 404 Not Found Page - Server Component
 *
 * This must be a pure Server Component to avoid prerender errors.
 * No auth-dependent components (Nav, Footer) to prevent useReducer/useContext errors
 * during Next.js 16 static prerendering.
 */
export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
      <div className="text-center max-w-2xl">
        <div
          className="text-9xl font-bold mb-4"
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
          Looks like this page has been scrounged away. The content you&apos;re looking for might
          have been moved, deleted, or maybe never existed in the first place.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-transform hover:scale-105"
            style={{
              background: 'var(--primary)',
              color: 'var(--background)',
              fontFamily: 'var(--font-kindergarten)',
            }}
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
  );
}
