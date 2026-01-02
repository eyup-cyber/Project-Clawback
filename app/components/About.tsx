'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const pillars = [
  {
    title: 'CREATE',
    description:
      'Share your voice through any medium — articles, videos, podcasts, art, poetry, and beyond.',
  },
  {
    title: 'OWN',
    description:
      'Retain 100% of your intellectual property rights. Your work remains yours, always.',
  },
  {
    title: 'EARN',
    description: 'Receive every penny from your supporters. No platform fees on creator donations.',
  },
];

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Decorative line draws in
      gsap.fromTo(
        lineRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.8,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Heading slides up
      gsap.fromTo(
        headingRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headingRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Body text fades in
      gsap.fromTo(
        textRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: textRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Pillars stagger in
      if (pillarsRef.current) {
        const cards = pillarsRef.current.querySelectorAll('.pillar-card');
        gsap.fromTo(
          cards,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: pillarsRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-8 py-24"
    >
      {/* Decorative line - gold */}
      <div
        ref={lineRef}
        className="w-20 h-[2px] mb-8"
        style={{
          backgroundColor: 'var(--secondary)',
          transformOrigin: 'center',
        }}
      />

      {/* Heading - Kindergarten font, gold */}
      <h2
        ref={headingRef}
        className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-center mb-8"
        style={{
          fontFamily: 'var(--font-kindergarten)',
          color: 'var(--secondary)',
        }}
      >
        who we are
      </h2>

      {/* Body text - Helvetica */}
      <p
        ref={textRef}
        className="text-lg sm:text-xl md:text-2xl text-center max-w-3xl mb-16 leading-relaxed"
        style={{
          fontFamily: 'var(--font-body)',
          opacity: 0.85,
        }}
      >
        Scroungers Multimedia is a platform for the unheard. We amplify voices silenced by
        credentialism, giving a megaphone to those with lived experience, self-taught skills, and
        stories that demand to be told.
      </p>

      {/* Pillar cards */}
      <div ref={pillarsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {pillars.map((pillar, index) => (
          <div
            key={index}
            className="pillar-card p-8 rounded-lg text-center transition-all duration-300 hover:-translate-y-1"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.boxShadow = '0 0 20px var(--glow-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Title - Kindergarten, lime green */}
            <h3
              className="text-2xl sm:text-3xl font-bold mb-4"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--primary)',
              }}
            >
              {pillar.title}
            </h3>
            {/* Description - Helvetica */}
            <p
              className="text-base leading-relaxed"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: 0.75,
              }}
            >
              {pillar.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
