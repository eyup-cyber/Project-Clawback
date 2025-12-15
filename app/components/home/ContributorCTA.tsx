'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

const contentTypes = [
  { icon: '📝', label: 'Articles & Essays' },
  { icon: '🎬', label: 'Video Essays' },
  { icon: '🎙️', label: 'Podcasts & Audio' },
  { icon: '🎨', label: 'Visual Art' },
  { icon: '📜', label: 'Poetry & Fiction' },
  { icon: '🎭', label: 'Satire & Comedy' },
];

export default function ContributorCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate content
      gsap.from(contentRef.current, {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });

      // Animate content types
      const items = contentRef.current?.querySelectorAll('.content-type');
      if (items) gsap.from(items, {
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: contentRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 px-4 md:px-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, var(--background) 0%, rgba(1, 60, 35, 0.8) 50%, var(--background) 100%)',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(50, 205, 50, 0.1) 0%, transparent 60%)',
        }}
      />

      <div ref={contentRef} className="max-w-4xl mx-auto text-center relative z-10">
        {/* Heading */}
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-display mb-6"
          style={{ color: 'var(--secondary)' }}
        >
          YOUR VOICE MATTERS
        </h2>

        {/* Subheading */}
        <p className="text-xl md:text-2xl mb-12" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
          No degrees. No connections. No gatekeepers.
          <span className="block mt-2" style={{ color: 'var(--primary)' }}>
            Just you and your story.
          </span>
        </p>

        {/* Content types */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {contentTypes.map((type) => (
            <div
              key={type.label}
              className="content-type flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <span className="text-xl">{type.icon}</span>
              <span className="text-sm">{type.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Link
          href="/apply"
          className="inline-block px-10 py-5 rounded-xl font-medium text-xl transition-all duration-300 hover:scale-105"
          style={{
            background: 'var(--primary)',
            color: '#000',
            boxShadow: '0 0 40px rgba(50, 205, 50, 0.3)',
          }}
        >
          Apply to Become a Contributor
        </Link>

        {/* Note */}
        <p className="mt-6 text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
          Applications reviewed within 48 hours. Keep 100% of your earnings.
        </p>
      </div>
    </section>
  );
}



