'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'Apply',
    description: 'Fill out a simple application. No credentials needed—just passion.',
    icon: '📝',
  },
  {
    number: '02',
    title: 'Create',
    description: 'Use our editor to write, embed videos, and craft your content.',
    icon: '✨',
  },
  {
    number: '03',
    title: 'Publish',
    description: 'Quick review, published within 48 hours. Your voice, unfiltered.',
    icon: '🚀',
  },
  {
    number: '04',
    title: 'Earn',
    description: 'Add your Ko-fi link. Every penny goes to you—we take 0%.',
    icon: '💰',
  },
];

export default function HowItWorksCondensed() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set([headingRef.current, stepsRef.current, ctaRef.current], {
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

      // Steps stagger animation
      const stepCards = stepsRef.current?.querySelectorAll('.step-card');
      if (stepCards) {
        gsap.fromTo(
          stepCards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: getDuration(DURATION.medium),
            stagger: 0.12,
            ease: EASING.snappy,
            scrollTrigger: {
              trigger: stepsRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // CTA animation
      gsap.fromTo(
        ctaRef.current,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: getDuration(DURATION.medium),
          ease: EASING.snappy,
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 90%',
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
      style={{ background: 'var(--background)' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Section heading */}
        <h2
          ref={headingRef}
          className="text-2xl md:text-3xl lg:text-4xl mb-10 text-center lowercase"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--primary)',
            textShadow: `0 0 20px ${COLORS.glowPrimary}, 0 2px 4px rgba(0,0,0,0.3)`,
          }}
        >
          how it works
        </h2>

        {/* Steps - horizontal on desktop, vertical on mobile */}
        <div ref={stepsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {steps.map((step) => (
            <div
              key={step.number}
              className="step-card relative p-5 rounded-lg border text-center transition-all duration-300 hover:border-[var(--secondary)] hover:shadow-[0_0_20px_var(--glow-secondary)]"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Step number - faded background */}
              <span
                className="absolute top-2 right-3 text-4xl font-bold opacity-10"
                style={{
                  fontFamily: 'var(--font-kindergarten)',
                  color: 'var(--primary)',
                }}
              >
                {step.number}
              </span>

              <span className="text-3xl block mb-3">{step.icon}</span>
              <h3
                className="text-lg font-bold mb-2 lowercase"
                style={{
                  fontFamily: 'var(--font-kindergarten)',
                  color: COLORS.secondary,
                }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm font-medium"
                style={{
                  color: 'var(--foreground)',
                  opacity: 0.85,
                  lineHeight: 1.5,
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div ref={ctaRef} className="text-center">
          <Link
            href="/apply"
            className="inline-block px-8 py-3 rounded-full font-medium text-base transition-all duration-300 hover:shadow-[0_0_30px_var(--glow-secondary)] hover:scale-105"
            style={{
              background: COLORS.secondary,
              color: 'var(--background)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
            }}
          >
            Apply Now
          </Link>
        </div>
      </div>
    </section>
  );
}
