'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'Apply',
    description:
      'Fill out a simple application telling us who you are and what you want to create. No credentials needed — just passion and a story to tell.',
    icon: '📝',
    details: ['5-minute application', 'No CV or portfolio required', 'Tell us your perspective'],
  },
  {
    number: '02',
    title: 'Create',
    description:
      'Use our word processor to write articles, embed videos, add images, and craft your content exactly how you want it.',
    icon: '✨',
    details: ['Rich text editor', 'Video & image embedding', 'Draft auto-saving'],
  },
  {
    number: '03',
    title: 'Publish',
    description:
      'Submit your work for a quick review. We check for basic guidelines only — your voice stays yours. Published within 48 hours.',
    icon: '🚀',
    details: ['48-hour review time', 'No editorial interference', 'Your voice, unfiltered'],
  },
  {
    number: '04',
    title: 'Earn',
    description:
      'Add your Ko-fi link to every post. Readers support you directly. We take 0% — every penny goes to you.',
    icon: '💰',
    details: ['100% of earnings are yours', 'Direct Ko-fi integration', 'Build your audience'],
  },
];

const stats = [
  { value: '1,722+', label: 'Community Members' },
  { value: '£2,180', label: 'Monthly Creator Earnings' },
  { value: '0%', label: 'Platform Cut' },
  { value: '48hrs', label: 'Review Time' },
];

export default function HowItWorksPage() {
  const heroRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animation
      gsap.fromTo(
        '.hero-title',
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.2 }
      );
      gsap.fromTo(
        '.hero-subtitle',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.4 }
      );

      // Stats animation
      const statItems = statsRef.current?.querySelectorAll('.stat-item');
      if (statItems && statItems.length > 0) {
        gsap.fromTo(
          statItems,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: statsRef.current,
              start: 'top 80%',
            },
          }
        );
      }

      // Steps animation
      const stepCards = stepsRef.current?.querySelectorAll('.step-card');
      if (stepCards && stepCards.length > 0) {
        stepCards.forEach((card, index) => {
          gsap.fromTo(
            card,
            { x: index % 2 === 0 ? -60 : 60, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
              },
            }
          );
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="min-h-[60vh] sm:min-h-[70vh] flex flex-col items-center justify-center text-center px-4 sm:px-8 pt-20"
      >
        <p
          className="hero-subtitle text-xs sm:text-sm uppercase tracking-[0.3em] mb-4 italic"
          style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
        >
          A View From The Sewer
        </p>
        <h1
          className="hero-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--primary)',
            textShadow: '0 0 40px var(--glow-primary)',
          }}
        >
          How It Works
        </h1>
        <p
          className="hero-subtitle text-base sm:text-lg md:text-xl max-w-2xl mx-auto"
          style={{
            color: 'var(--foreground)',
            fontFamily: 'var(--font-body)',
            opacity: 0.8,
            letterSpacing: '-0.02em',
          }}
        >
          From application to publication in four simple steps. No gatekeepers, no middlemen, no
          bullshit.
        </p>
      </section>

      {/* Stats Section */}
      <section
        ref={statsRef}
        className="py-12 sm:py-16 px-4 sm:px-8"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="stat-item text-center p-4 sm:p-6 rounded-xl"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <p
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2"
                style={{
                  fontFamily: 'var(--font-kindergarten)',
                  color: 'var(--secondary)',
                }}
              >
                {stat.value}
              </p>
              <p
                className="text-xs sm:text-sm"
                style={{
                  color: 'var(--foreground)',
                  opacity: 0.7,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps Section */}
      <section ref={stepsRef} className="py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto space-y-12 sm:space-y-16">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`step-card flex flex-col ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } gap-6 sm:gap-8 items-center`}
            >
              {/* Number & Icon */}
              <div className="flex-shrink-0 text-center">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center mb-2"
                  style={{
                    background: 'var(--surface)',
                    border: '2px solid var(--primary)',
                    boxShadow: '0 0 30px var(--glow-primary)',
                  }}
                >
                  <span className="text-3xl sm:text-4xl md:text-5xl">{step.icon}</span>
                </div>
                <p
                  className="text-4xl sm:text-5xl md:text-6xl font-bold"
                  style={{
                    fontFamily: 'var(--font-kindergarten)',
                    color: 'var(--primary)',
                    opacity: 0.3,
                  }}
                >
                  {step.number}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h2
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4"
                  style={{
                    fontFamily: 'var(--font-kindergarten)',
                    color: 'var(--secondary)',
                  }}
                >
                  {step.title}
                </h2>
                <p
                  className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6"
                  style={{
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.7,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {step.description}
                </p>
                <ul className="space-y-2">
                  {step.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-center justify-center md:justify-start gap-2 text-sm"
                      style={{
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-body)',
                        opacity: 0.8,
                      }}
                    >
                      <span style={{ color: 'var(--accent)' }}>✓</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-16 sm:py-24 px-4 sm:px-8 text-center"
        style={{
          background: 'linear-gradient(to bottom, var(--background), var(--surface))',
        }}
      >
        <h2
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--primary)',
          }}
        >
          Ready to Start?
        </h2>
        <p
          className="text-base sm:text-lg max-w-xl mx-auto mb-6 sm:mb-8"
          style={{
            color: 'var(--foreground)',
            fontFamily: 'var(--font-body)',
            opacity: 0.8,
            letterSpacing: '-0.02em',
          }}
        >
          Join 1,722+ community members already sharing their stories. Your voice matters —
          let&apos;s hear it.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/apply"
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-medium transition-all duration-300 hover:scale-105"
            style={{
              background: 'var(--primary)',
              color: 'var(--background)',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 0 20px var(--glow-primary)',
            }}
          >
            Apply Now
          </Link>
          <Link
            href="/articles"
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-medium transition-all duration-300 hover:scale-105"
            style={{
              background: 'transparent',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-body)',
              border: '1px solid var(--border)',
            }}
          >
            Explore Content
          </Link>
        </div>
      </section>

      {/* Back Link */}
      <div className="py-8 text-center">
        <Link
          href="/"
          className="text-sm hover:underline"
          style={{
            color: 'var(--foreground)',
            opacity: 0.6,
            fontFamily: 'var(--font-body)',
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
