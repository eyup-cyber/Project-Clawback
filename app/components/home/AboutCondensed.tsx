'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

gsap.registerPlugin(ScrollTrigger);

const pillars = [
  {
    title: 'No Gatekeepers',
    description:
      'No journalism degrees required. If you have skin in the game and a story to tell, you belong here.',
    icon: '🚪',
  },
  {
    title: '100% Creator Revenue',
    description: 'We pass every penny of donations directly to creators. Your work, your profit.',
    icon: '💰',
  },
  {
    title: 'Full IP Ownership',
    description: 'You retain complete intellectual property rights to everything you create.',
    icon: '📜',
  },
  {
    title: 'Marginalized Voices First',
    description:
      'Perspectives from those most affected—not commentators watching from the sidelines.',
    icon: '📢',
  },
];

export default function AboutCondensed() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set([headingRef.current, pillarsRef.current, quoteRef.current], {
        opacity: 1,
      });
      return;
    }

    const ctx = gsap.context(() => {
      // Heading animation
      gsap.fromTo(
        headingRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: getDuration(DURATION.slow),
          ease: EASING.expo,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Pillars stagger animation
      const cards = pillarsRef.current?.querySelectorAll('.pillar-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 40, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: getDuration(DURATION.medium),
            stagger: 0.1,
            ease: EASING.snappy,
            scrollTrigger: {
              trigger: pillarsRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Quote animation
      gsap.fromTo(
        quoteRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: getDuration(DURATION.medium),
          ease: EASING.snappy,
          scrollTrigger: {
            trigger: quoteRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-16 px-4 md:px-8"
      style={{ background: 'var(--surface)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section heading */}
        <h2
          ref={headingRef}
          className="text-2xl md:text-3xl lg:text-4xl mb-10 text-center lowercase"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: COLORS.secondary,
            textShadow: `0 0 20px ${COLORS.glowSecondary}, 0 2px 4px rgba(0,0,0,0.3)`,
          }}
        >
          our pillars
        </h2>

        {/* Pillars grid */}
        <div
          ref={pillarsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="pillar-card p-5 rounded-lg border transition-all duration-300 hover:border-[var(--primary)] hover:shadow-[0_0_20px_var(--glow-primary)]"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
              }}
            >
              <span className="text-3xl block mb-3">{pillar.icon}</span>
              <h3
                className="text-lg font-bold mb-2 lowercase"
                style={{
                  fontFamily: 'var(--font-kindergarten)',
                  color: COLORS.secondary,
                }}
              >
                {pillar.title}
              </h3>
              <p
                className="text-sm font-medium"
                style={{
                  color: 'var(--foreground)',
                  opacity: 0.85,
                  lineHeight: 1.5,
                }}
              >
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* "Scroungers" explanation quote */}
        <div
          ref={quoteRef}
          className="max-w-3xl mx-auto text-center p-6 rounded-lg"
          style={{
            background: 'var(--background)',
            border: `1px solid var(--border)`,
          }}
        >
          <p
            className="text-base md:text-lg font-medium mb-3"
            style={{ color: 'var(--foreground)', lineHeight: 1.5 }}
          >
            &quot;Scrounger&quot; is what they call us. We&apos;re reclaiming the word—because the
            so-called scroungers understand these systems best. Not from textbooks, but from lived
            experience.
          </p>
          <p
            className="text-lg md:text-xl font-bold"
            style={{
              color: 'var(--primary)',
              textShadow: `0 0 15px ${COLORS.glowPrimary}`,
            }}
          >
            Our &quot;low esteem&quot; is our authority.
          </p>
        </div>
      </div>
    </section>
  );
}
