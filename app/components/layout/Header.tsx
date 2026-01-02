'use client';
import Link from 'next/link';
import { useState } from 'react';

const navLinks = [
  { href: '/about', label: 'ABOUT' },
  { href: '/articles', label: 'NEWSROOM' },
  { href: '/articles?type=audio', label: 'AUDIO' },
  { href: '/articles?type=video', label: 'VIDEO' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[var(--background)] border-b border-[var(--border)]">
      <div className="container">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex flex-col leading-none">
            <span
              className="text-xl tracking-wider text-[var(--primary)]"
              style={{ fontFamily: 'var(--font-kindergarten)' }}
            >
              SCROUNGERS
            </span>
            <span className="text-[10px] tracking-[0.3em] text-[var(--accent)]">MULTIMEDIA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium tracking-wide text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/articles?breaking=true"
              className="text-sm font-medium tracking-wide text-[var(--accent)] hover:text-[var(--primary-light)] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              BREAKING
            </Link>
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              SIGN IN
            </Link>
            <Link
              href="/apply"
              className="text-sm bg-[var(--primary)] text-[var(--background)] px-5 py-2 rounded hover:bg-[var(--primary-light)] transition-colors font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              APPLY NOW
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-[var(--foreground)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)]">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-3 text-[var(--foreground)] hover:text-[var(--primary)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/apply"
              className="block py-3 text-[var(--primary)] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              APPLY NOW
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
