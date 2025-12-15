'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Nav from '../components/Nav';
import Footer from '../components/layout/Footer';

gsap.registerPlugin(ScrollTrigger);

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animation
      if (heroRef.current?.children) {
        gsap.fromTo(
          Array.from(heroRef.current.children),
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power3.out' }
        );
      }

      // Section animations
      sectionsRef.current.forEach((section) => {
        gsap.fromTo(
          section,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  const pillars = [
    {
      title: 'No Gatekeepers',
      description: 'We don\'t require journalism degrees, media connections, or formal credentials. If you have skin in the game and a story to tell, you belong here.',
      icon: '🚪',
    },
    {
      title: '100% Creator Revenue',
      description: 'Unlike traditional platforms that take a cut, we pass every penny of donations directly to creators. Your work, your profit.',
      icon: '💰',
    },
    {
      title: 'Full IP Ownership',
      description: 'You retain complete intellectual property rights to everything you create. We\'re a platform, not a publisher claiming your work.',
      icon: '📜',
    },
    {
      title: 'Marginalized Voices First',
      description: 'We prioritize perspectives from those most affected by political and economic systems—not commentators watching from the sidelines.',
      icon: '📢',
    },
  ];

  return (
    <>
      <Nav />

      {/* Hero */}
      <section
        className="min-h-[60vh] flex items-center justify-center pt-24 px-4"
        style={{ background: 'var(--background)' }}
      >
        <div ref={heroRef} className="max-w-4xl mx-auto text-center">
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
          >
            who we are
          </h1>
          <p
            className="text-xl sm:text-2xl max-w-3xl mx-auto"
            style={{ color: 'var(--foreground)', opacity: 0.8, fontFamily: 'var(--font-body)' }}
          >
            Scroungers Multimedia is a platform for political journalism by the people who live it.
            No credentials required. No gatekeeping. Just raw, unfiltered perspective.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4" style={{ background: 'var(--surface)' }}>
        <div
          ref={(el) => { if (el) sectionsRef.current[0] = el; }}
          className="max-w-4xl mx-auto"
        >
          <h2
            className="text-4xl font-bold mb-8"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--secondary)' }}
          >
            our mission
          </h2>
          <div className="space-y-6" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}>
            <p className="text-lg">
              For years, the left media has been owned, controlled, and profited by two friend groups.
              They decide who gets a platform, who gets paid, and whose stories get told. We&apos;re changing that.
            </p>
            <p className="text-lg">
              Scroungers Multimedia gives real people with skin in the game the opportunity to profit from
              their own political analysis. Whether you want to write an article, make a video, record a podcast,
              or create visual art—we&apos;re giving you the keys.
            </p>
            <p className="text-lg">
              All posts come with a user-inputted Ko-fi link. We retain 0% of the creators&apos; intellectual property
              and we don&apos;t take a penny from their profit. It&apos;s theirs.
            </p>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          <h2
            ref={(el) => { if (el) sectionsRef.current[1] = el; }}
            className="text-4xl font-bold mb-12 text-center"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
          >
            our pillars
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pillars.map((pillar, index) => (
              <div
                key={pillar.title}
                ref={(el) => { if (el) sectionsRef.current[index + 2] = el; }}
                className="p-8 rounded-lg border transition-all hover:border-[var(--primary)]"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <span className="text-5xl block mb-4">{pillar.icon}</span>
                <h3
                  className="text-2xl font-bold mb-4"
                  style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--secondary)' }}
                >
                  {pillar.title}
                </h3>
                <p style={{ color: 'var(--foreground)', opacity: 0.8, fontFamily: 'var(--font-body)' }}>
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Name */}
      <section className="py-20 px-4" style={{ background: 'var(--surface)' }}>
        <div
          ref={(el) => { if (el) sectionsRef.current[6] = el; }}
          className="max-w-4xl mx-auto"
        >
          <h2
            className="text-4xl font-bold mb-8"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--accent)' }}
          >
            why &quot;scroungers&quot;?
          </h2>
          <div className="space-y-6" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}>
            <p className="text-lg">
              &quot;Scrounger&quot; is what they call us. The tabloids, the politicians, the comfortable classes.
              It&apos;s meant to shame us into silence—to make us feel unworthy of speaking, let alone being heard.
            </p>
            <p className="text-lg">
              We&apos;re reclaiming the word. Because the so-called scroungers—the disabled, the unemployed,
              the precariously employed, the working poor—are the ones who understand these systems best.
              Not from textbooks, but from lived experience.
            </p>
            <p className="text-lg" style={{ color: 'var(--primary)' }}>
              <strong>Our &quot;low esteem&quot; is our authority.</strong>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
