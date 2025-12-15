'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASING, DURATION, COLORS, prefersReducedMotion, getDuration, getStagger } from '@/lib/animations/gsap-config';
import { MagneticButton, ScroungersBrand } from '../ui';
import { FloatingParticles } from '../effects/Particles';

gsap.registerPlugin(ScrollTrigger);

export default function IntroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const paragraphsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      // Set final states immediately
      gsap.set([ctaRef.current], { opacity: 1 });
      const paragraphs = paragraphsRef.current?.querySelectorAll('.intro-paragraph');
      if (paragraphs) gsap.set(paragraphs, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      // Animate paragraphs with stagger
      const paragraphs = paragraphsRef.current?.querySelectorAll('.intro-paragraph');
      if (paragraphs) {
        gsap.fromTo(paragraphs,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: getDuration(DURATION.medium),
            stagger: getStagger(0.15),
            ease: EASING.snappy,
            scrollTrigger: {
              trigger: paragraphsRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Animate CTA buttons
      gsap.fromTo(ctaRef.current,
        { y: 30, opacity: 0 },
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
      className="pt-4 pb-16 px-4 md:px-8 relative overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Subtle floating particles */}
      <FloatingParticles count={15} color="var(--secondary)" minSize={1} maxSize={3} />

      {/* Background gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255, 215, 0, 0.03) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Mission statement paragraphs */}
        <div ref={paragraphsRef} className="space-y-4 text-base md:text-lg">
          <p className="intro-paragraph font-medium" style={{ color: 'var(--foreground)', lineHeight: 1.5 }}>
            For years, the left media has been owned, controlled, and profited by two friend groups.
          </p>
          
          <p 
            className="intro-paragraph font-bold text-lg md:text-xl"
            style={{ 
              color: COLORS.secondary,
              textShadow: `0 0 20px ${COLORS.glowSecondary}, 0 2px 4px rgba(0,0,0,0.3)`,
              lineHeight: 1.4,
            }}
          >
            We are taking back the media and giving you the keys.
          </p>

          <p className="intro-paragraph font-medium" style={{ color: 'var(--foreground)', lineHeight: 1.5 }}>
            Want to write an article? Want to make a video? Want to make some art?
          </p>

          <p className="intro-paragraph font-medium" style={{ color: 'var(--foreground)', lineHeight: 1.5 }}>
            <ScroungersBrand size="xl" glow animated /> is giving real people with skin in the game the opportunity to profit from their own political analysis.
          </p>

          <p className="intro-paragraph font-medium" style={{ color: 'var(--foreground)', lineHeight: 1.5 }}>
            All posts come with a user-inputted Ko-fi link. Want to support the creator? Go ahead!
          </p>

          <p
            className="intro-paragraph font-bold text-lg md:text-xl"
            style={{ 
              color: COLORS.secondary,
              textShadow: `0 0 20px ${COLORS.glowSecondary}, 0 2px 4px rgba(0,0,0,0.3)`,
              lineHeight: 1.4,
            }}
          >
            We retain 0% of the creators&apos; intellectual property and we don&apos;t take a penny from their profit.
          </p>
        </div>

        {/* CTA Buttons */}
        <div ref={ctaRef} className="mt-12 flex flex-wrap justify-center gap-6">
          <MagneticButton
            href="/apply"
            variant="primary"
            size="sm"
            glow={false}
            ripple={false}
            className="w-[180px]"
          >
            Become a Contributor
          </MagneticButton>
          
          <MagneticButton
            href="/articles"
            variant="outline"
            size="sm"
            glow={false}
            className="w-[180px]"
          >
            Explore Content
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
