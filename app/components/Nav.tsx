'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {
  EASING,
  COLORS,
  prefersReducedMotion,
  getDuration,
  DURATION,
} from '@/lib/animations/gsap-config';
import { useAuth } from '@/lib/hooks/useAuth';
import { getInitials } from '@/lib/utils';

interface NavLink {
  label: string;
  id?: string;
  href?: string;
}

const navLinks: NavLink[] = [
  { label: 'Home', id: 'hero' },
  { label: 'About', href: '/about' },
  { label: 'Explore', href: '/articles' },
  { label: 'Apply', href: '/apply' },
];

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLButtonElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Entry animation
  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set(navRef.current, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        navRef.current,
        { y: -100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: getDuration(DURATION.slow),
          ease: EASING.expo,
          delay: 4.5,
        }
      );

      // Stagger nav links
      const links = linksRef.current?.querySelectorAll('.nav-link');
      if (links) {
        gsap.fromTo(
          links,
          { opacity: 0, y: -20 },
          {
            opacity: 1,
            y: 0,
            duration: getDuration(DURATION.normal),
            stagger: 0.1,
            delay: 4.8,
            ease: EASING.snappy,
          }
        );
      }
    }, navRef);

    return () => ctx.revert();
  }, []);

  // Randomized floating animation for nav elements (space-like, extremely subtle, always running)
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Float logo - randomized, extremely subtle
      if (logoRef.current) {
        const createRandomFloat = () => {
          const randomY = (Math.random() - 0.5) * 0.3; // Very limited: -0.15 to 0.15
          const randomDuration = 4 + Math.random() * 3; // 4-7 seconds
          const randomDelay = Math.random() * 0.5;

          gsap.to(logoRef.current, {
            y: randomY,
            duration: randomDuration,
            ease: 'power1.inOut',
            onComplete: createRandomFloat, // Chain to next random movement
            delay: randomDelay,
          });
        };
        createRandomFloat();
      }

      // Float nav links together as a group - extremely subtle, synchronized
      const links = linksRef.current?.querySelectorAll('.nav-link');
      if (links && links.length > 0) {
        // Create a shared float value for all links
        const sharedFloat = { y: 0 };

        const createGroupFloat = () => {
          const randomY = (Math.random() - 0.5) * 0.2; // Very limited: -0.1 to 0.1
          const randomDuration = 5 + Math.random() * 4; // 5-9 seconds
          const randomDelay = Math.random() * 0.3;

          gsap.to(sharedFloat, {
            y: randomY,
            duration: randomDuration,
            ease: 'power1.inOut',
            onUpdate: () => {
              // Apply same y position to all links to keep them aligned
              links.forEach((link) => {
                gsap.set(link, { y: sharedFloat.y });
              });
            },
            onComplete: createGroupFloat, // Chain to next random movement
            delay: randomDelay,
          });
        };
        createGroupFloat();
      }
    }, navRef);

    return () => ctx.revert();
  }, []);

  // Magnetic effect for logo
  const handleLogoMouseMove = useCallback((e: React.MouseEvent) => {
    if (!logoRef.current || prefersReducedMotion()) return;

    const rect = logoRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(logoRef.current, {
      x: x * 0.2,
      y: y * 0.2,
      duration: 0.3,
      ease: EASING.smooth,
    });
  }, []);

  const handleLogoMouseLeave = useCallback(() => {
    if (!logoRef.current || prefersReducedMotion()) return;

    gsap.to(logoRef.current, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: EASING.elastic,
    });
  }, []);

  // Animate underline to active link
  const handleLinkHover = useCallback((index: number) => {
    if (!linksRef.current || !underlineRef.current || prefersReducedMotion()) return;

    const links = linksRef.current.querySelectorAll('.nav-link');
    const activeLink = links[index] as HTMLElement;

    if (activeLink) {
      const rect = activeLink.getBoundingClientRect();
      const containerRect = linksRef.current.getBoundingClientRect();

      gsap.to(underlineRef.current, {
        width: rect.width,
        x: rect.left - containerRect.left,
        opacity: 1,
        duration: 0.3,
        ease: EASING.snappy,
      });
    }

    setActiveIndex(index);
  }, []);

  const handleLinkLeave = useCallback(() => {
    if (!underlineRef.current || prefersReducedMotion()) return;

    gsap.to(underlineRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: EASING.smooth,
    });

    setActiveIndex(null);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-8 py-5 flex items-center justify-between transition-all duration-500"
        style={{
          backgroundColor: scrolled ? 'var(--surface-elevated)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          boxShadow: scrolled ? '0 4px 30px rgba(0, 0, 0, 0.1)' : 'none',
        }}
      >
        {/* Logo with magnetic effect - horizontal layout */}
        <button
          ref={logoRef}
          onClick={() => scrollToSection('hero')}
          onMouseMove={handleLogoMouseMove}
          onMouseLeave={handleLogoMouseLeave}
          className="relative group flex items-baseline flex-shrink-0"
          style={{
            willChange: 'transform',
            gap: '0.4em', // Space between scroungers and multimedia
          }}
        >
          {/* Glow effect on hover */}
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
            style={{ background: COLORS.glowSecondary }}
            aria-hidden="true"
          />
          {/* scroungers - HelveticaNow */}
          <span
            className="relative z-10 text-2xl sm:text-3xl lg:text-4xl font-medium lowercase tracking-tight group-hover:text-[var(--secondary)] transition-colors duration-300"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              color: 'var(--primary)',
              textShadow: `0 0 15px ${COLORS.glowPrimary}`,
            }}
          >
            scroungers
          </span>
          {/* multimedia - Kindergarten */}
          <span
            className="relative z-10 text-xl sm:text-2xl lg:text-3xl lowercase group-hover:text-[var(--secondary)] transition-colors duration-300"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: COLORS.secondary,
              textShadow: `0 0 10px ${COLORS.glowSecondary}`,
            }}
          >
            multimedia
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <div
          ref={linksRef}
          className="hidden sm:flex items-center gap-6 lg:gap-8 relative ml-8 lg:ml-16"
          onMouseLeave={handleLinkLeave}
        >
          {/* Animated underline */}
          <span
            ref={underlineRef}
            className="absolute bottom-0 h-[2px] pointer-events-none"
            style={{
              background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.primary})`,
              opacity: 0,
              width: 0,
              boxShadow: `0 0 10px ${COLORS.glowSecondary}`,
            }}
            aria-hidden="true"
          />

          {navLinks.map((link, index) => (
            <NavItem
              key={link.label}
              link={link}
              index={index}
              isActive={activeIndex === index}
              onHover={handleLinkHover}
              onScrollTo={scrollToSection}
            />
          ))}
        </div>

        {/* Auth buttons / User menu */}
        <div className="hidden sm:flex items-center gap-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-[var(--surface)] animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:border-[var(--primary)] hover:bg-[var(--surface)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--primary)', color: 'var(--background)' }}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(profile?.display_name || user.email || 'U')
                  )}
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}
                >
                  {profile?.display_name?.split(' ')[0] || 'Dashboard'}
                </span>
              </Link>
              <button
                onClick={() => void signOut()}
                className="text-sm px-3 py-1.5 rounded-full border transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="group relative text-sm font-medium px-5 py-2.5 rounded-full border-2 transition-all duration-300 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:shadow-[0_0_20px_var(--glow-primary)] overflow-hidden"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                }}
              >
                <span className="relative z-10">Sign In</span>
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ background: COLORS.primary }}
                />
              </Link>
              <Link
                href="/register"
                className="group relative text-sm font-medium px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_var(--glow-secondary)] overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.secondary} 0%, #FFA500 100%)`,
                  color: 'var(--background)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                }}
              >
                <span className="relative z-10">Sign Up</span>
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, #FFA500 0%, ${COLORS.secondary} 100%)`,
                  }}
                />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="sm:hidden flex flex-col gap-1.5 p-2 group"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span
            className={`w-6 h-0.5 bg-current transition-all duration-300 ${
              mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-current transition-all duration-300 ${
              mobileMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-current transition-all duration-300 ${
              mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
          />
        </button>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        links={navLinks}
        onClose={() => setMobileMenuOpen(false)}
        onScrollTo={scrollToSection}
      />
    </>
  );
}

// Nav item component with enhanced interactions - yellow hover
function NavItem({
  link,
  index,
  isActive,
  onHover,
  onScrollTo,
}: {
  link: NavLink;
  index: number;
  isActive: boolean;
  onHover: (index: number) => void;
  onScrollTo: (id: string) => void;
}) {
  const itemRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  const handleMouseEnter = () => {
    onHover(index);

    if (itemRef.current && !prefersReducedMotion()) {
      gsap.to(itemRef.current, {
        y: -2,
        color: COLORS.secondary, // Yellow on hover
        textShadow: `0 0 15px ${COLORS.glowSecondary}`,
        duration: 0.2,
        ease: EASING.smooth,
      });
    }
  };

  const handleMouseLeave = () => {
    if (itemRef.current && !prefersReducedMotion()) {
      gsap.to(itemRef.current, {
        y: 0,
        color: 'var(--foreground)',
        textShadow: 'none',
        duration: 0.3,
        ease: EASING.elastic,
      });
    }
  };

  const baseClassName = `nav-link relative text-sm uppercase tracking-wide font-medium`;

  if (link.href) {
    return (
      <Link
        ref={itemRef as React.Ref<HTMLAnchorElement>}
        href={link.href}
        className={baseClassName}
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          color: isActive ? COLORS.secondary : 'var(--foreground)',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <button
      ref={itemRef as React.Ref<HTMLButtonElement>}
      onClick={() => link.id && onScrollTo(link.id)}
      className={baseClassName}
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        color: isActive ? COLORS.secondary : 'var(--foreground)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {link.label}
    </button>
  );
}

// Mobile menu component
function MobileMenu({
  isOpen,
  links,
  onClose,
  onScrollTo,
}: {
  isOpen: boolean;
  links: NavLink[];
  onClose: () => void;
  onScrollTo: (id: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuRef.current || prefersReducedMotion()) return;

    if (isOpen) {
      gsap.to(menuRef.current, {
        opacity: 1,
        pointerEvents: 'auto',
        duration: 0.3,
        ease: EASING.smooth,
      });

      const links = linksRef.current?.querySelectorAll('.mobile-link');
      if (links) {
        gsap.fromTo(
          links,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            stagger: 0.08,
            delay: 0.1,
            ease: EASING.snappy,
          }
        );
      }
    } else {
      gsap.to(menuRef.current, {
        opacity: 0,
        pointerEvents: 'none',
        duration: 0.2,
        ease: EASING.smooth,
      });
    }
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      className="fixed inset-0 z-40 sm:hidden flex items-center justify-center opacity-0 pointer-events-none"
      style={{
        background: 'var(--surface-elevated)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div ref={linksRef} className="flex flex-col gap-8 text-center">
        {links.map((link) => (
          <div key={link.label} className="mobile-link">
            {link.href ? (
              <Link
                href={link.href}
                className="text-3xl font-medium uppercase tracking-wide hover:text-[var(--secondary)] transition-colors"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                onClick={onClose}
              >
                {link.label}
              </Link>
            ) : (
              <button
                onClick={() => {
                  if (link.id) onScrollTo(link.id);
                }}
                className="text-3xl font-medium uppercase tracking-wide hover:text-[var(--secondary)] transition-colors"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
              >
                {link.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
