'use client';

import gsap from 'gsap';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import Footer from '../components/layout/Footer';
import Nav from '../components/Nav';

export default function DonatePage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, []);

  return (
    <>
      <Nav />
      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div ref={heroRef} className="text-center mb-16">
            <span className="text-6xl block mb-4">💚</span>
            <h1
              className="text-5xl font-bold mb-4"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--primary)',
              }}
            >
              support scroungers
            </h1>
            <p
              className="text-xl max-w-2xl mx-auto"
              style={{
                color: 'var(--foreground)',
                opacity: 0.8,
                fontFamily: 'var(--font-body)',
              }}
            >
              Your donations help keep this platform running and ensure we can continue amplifying
              marginalized voices.
            </p>
          </div>

          {/* Our model */}
          <div
            className="p-8 rounded-lg mb-12"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <h2
              className="text-2xl font-bold mb-4"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--secondary)',
              }}
            >
              Our Revenue Model
            </h2>
            <p
              className="mb-4"
              style={{
                color: 'var(--foreground)',
                opacity: 0.85,
                fontFamily: 'var(--font-body)',
              }}
            >
              Scroungers Multimedia is built on a radical principle:{' '}
              <strong style={{ color: 'var(--primary)' }}>0% platform fees</strong>. Every donation
              made to a contributor through their Ko-fi link goes directly to them—we don&apos;t
              take a cut.
            </p>
            <p
              className="mb-4"
              style={{
                color: 'var(--foreground)',
                opacity: 0.85,
                fontFamily: 'var(--font-body)',
              }}
            >
              So how do we keep the lights on? Through direct donations to the platform itself, and
              eventually through optional membership tiers that provide cosmetic benefits while
              keeping all content free and open.
            </p>
            <p
              style={{
                color: 'var(--foreground)',
                opacity: 0.85,
                fontFamily: 'var(--font-body)',
              }}
            >
              We believe media platforms shouldn&apos;t profit from the labor of the people who
              create the content.
            </p>
          </div>

          {/* Ways to support */}
          <h2
            className="text-2xl font-bold mb-6 text-center"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--primary)',
            }}
          >
            Ways to Support
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Support the platform */}
            <div
              className="p-8 rounded-lg text-center"
              style={{
                background: 'var(--surface)',
                border: '2px solid var(--primary)',
              }}
            >
              <span className="text-4xl block mb-4">🏛️</span>
              <h3
                className="text-xl font-bold mb-3"
                style={{
                  fontFamily: 'var(--font-kindergarten)',
                  color: 'var(--primary)',
                }}
              >
                Support the Platform
              </h3>
              <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Donations to Scroungers Multimedia help cover hosting, development, and moderation
                costs.
              </p>
              <a
                href="https://ko-fi.com/scroungers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-transform hover:scale-105"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--background)',
                }}
              >
                ☕ Ko-fi/Scroungers
              </a>
            </div>

            {/* Support contributors */}
            <div
              className="p-8 rounded-lg text-center"
              style={{
                background: 'var(--surface)',
                border: '2px solid var(--secondary)',
              }}
            >
              <span className="text-4xl block mb-4">✍️</span>
              <h3
                className="text-xl font-bold mb-3"
                style={{
                  fontFamily: 'var(--font-kindergarten)',
                  color: 'var(--secondary)',
                }}
              >
                Support Contributors
              </h3>
              <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Love a specific contributor&apos;s work? Donate directly to them through their Ko-fi
                link.
              </p>
              <Link
                href="/contributors"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-transform hover:scale-105"
                style={{
                  background: 'var(--secondary)',
                  color: 'var(--background)',
                }}
              >
                Browse Contributors →
              </Link>
            </div>
          </div>

          {/* Other ways to help */}
          <div
            className="p-8 rounded-lg"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <h2
              className="text-2xl font-bold mb-4 text-center"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--secondary)',
              }}
            >
              Other Ways to Help
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center">
                <span className="text-3xl block mb-2">📢</span>
                <h4 className="font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                  Spread the Word
                </h4>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Share articles and tell others about Scroungers.
                </p>
              </div>
              <div className="text-center">
                <span className="text-3xl block mb-2">💬</span>
                <h4 className="font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                  Engage
                </h4>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Comment, star, and discuss. Active communities thrive.
                </p>
              </div>
              <div className="text-center">
                <span className="text-3xl block mb-2">✏️</span>
                <h4 className="font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                  Contribute
                </h4>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Have a story?{' '}
                  <Link href="/apply" style={{ color: 'var(--primary)' }}>
                    Apply to become a contributor
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Transparency */}
          <div className="mt-12 text-center">
            <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              We&apos;re committed to transparency. Questions about how funds are used?{' '}
              <Link href="/contact" style={{ color: 'var(--primary)' }}>
                Contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
