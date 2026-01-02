'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FOOTER_LINKS, SOCIAL_LINKS } from '@/lib/constants';

// Animated link component with underline draw effect
function AnimatedLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const Component = external ? 'a' : Link;
  const externalProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Component
      href={href}
      {...externalProps}
      className="relative inline-block text-sm transition-colors duration-200 py-1"
      style={{
        color: isHovered ? 'var(--primary)' : 'var(--foreground)',
        opacity: isHovered ? 1 : 0.7,
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {/* Underline draw effect */}
      <span
        className="absolute bottom-0 left-0 h-[1px] transition-all duration-300 ease-out"
        style={{
          width: isHovered ? '100%' : '0%',
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
        }}
      />
    </Component>
  );
}

// Social icon with glow effect
function SocialIcon({
  href,
  label,
  children,
  glowColor = 'var(--primary)',
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  glowColor?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300"
      style={{
        border: `1px solid ${isHovered ? glowColor : 'var(--border)'}`,
        color: isHovered ? glowColor : 'var(--foreground)',
        background: isHovered ? `${glowColor}15` : 'transparent',
        boxShadow: isHovered ? `0 0 20px ${glowColor}40` : 'none',
        transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={label}
    >
      {children}
    </a>
  );
}

// Wave SVG component
function WaveBorder() {
  return (
    <div
      className="absolute top-0 left-0 right-0 overflow-hidden"
      style={{ height: '60px', marginTop: '-59px' }}
    >
      <svg
        viewBox="0 0 1440 60"
        fill="none"
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ transform: 'rotate(180deg)' }}
      >
        <path
          d="M0 60L48 55C96 50 192 40 288 35C384 30 480 30 576 32.5C672 35 768 40 864 42.5C960 45 1056 45 1152 42.5C1248 40 1344 35 1392 32.5L1440 30V60H1392C1344 60 1248 60 1152 60C1056 60 960 60 864 60C768 60 672 60 576 60C480 60 384 60 288 60C192 60 96 60 48 60H0Z"
          fill="var(--background)"
        />
        <path
          d="M0 60L48 55C96 50 192 40 288 35C384 30 480 30 576 32.5C672 35 768 40 864 42.5C960 45 1056 45 1152 42.5C1248 40 1344 35 1392 32.5L1440 30V60H1392C1344 60 1248 60 1152 60C1056 60 960 60 864 60C768 60 672 60 576 60C480 60 384 60 288 60C192 60 96 60 48 60H0Z"
          stroke="var(--border)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative py-20 px-4 md:px-8" style={{ background: 'var(--background)' }}>
      {/* Wave border at top */}
      <WaveBorder />

      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(50, 205, 50, 0.02) 0%, transparent 50%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-6 group">
              <span
                className="text-3xl block transition-all duration-300 group-hover:text-shadow-glow"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--primary)',
                }}
              >
                scroungers
              </span>
              <span
                className="text-xs tracking-[0.25em] uppercase block -mt-1"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--accent)',
                  fontWeight: 500,
                }}
              >
                MULTIMEDIA
              </span>
            </Link>
            <p
              className="text-sm mb-6 leading-relaxed"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--foreground)',
                opacity: 0.6,
              }}
            >
              Political journalism from the people who live it. No credentials required. 100% your
              revenue.
            </p>

            {/* Social links */}
            <div className="flex gap-3">
              <SocialIcon
                href={SOCIAL_LINKS.twitter}
                label="X (Twitter)"
                glowColor="var(--foreground)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </SocialIcon>
              <SocialIcon href={SOCIAL_LINKS.patreon} label="Patreon" glowColor="#FF424D">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z" />
                </svg>
              </SocialIcon>
              <SocialIcon href={SOCIAL_LINKS.kofi} label="Ko-fi" glowColor="var(--secondary)">
                <span className="text-lg">☕</span>
              </SocialIcon>
            </div>
          </div>

          {/* Platform links */}
          <div>
            <h4
              className="text-sm font-bold uppercase tracking-wider mb-6"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--foreground)',
              }}
            >
              Platform
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.platform.map((link) => (
                <li key={link.href}>
                  <AnimatedLink href={link.href}>{link.label}</AnimatedLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4
              className="text-sm font-bold uppercase tracking-wider mb-6"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--foreground)',
              }}
            >
              Legal
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.href}>
                  <AnimatedLink href={link.href}>{link.label}</AnimatedLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h4
              className="text-sm font-bold uppercase tracking-wider mb-6"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--foreground)',
              }}
            >
              Support
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <AnimatedLink href={link.href}>{link.label}</AnimatedLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider with gradient */}
        <div
          className="h-px mb-8"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
          }}
        />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p
            className="text-sm"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)',
              opacity: 0.5,
            }}
          >
            © {currentYear} Scroungers Multimedia. All rights reserved.
          </p>
          <p
            className="text-sm flex items-center gap-2"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)',
              opacity: 0.5,
            }}
          >
            <span>Built for the margins, by the margins</span>
            <span style={{ color: 'var(--accent)' }}>♥</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
