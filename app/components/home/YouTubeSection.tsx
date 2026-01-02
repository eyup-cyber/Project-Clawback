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

// Sample videos from @SCROUNGERSPODCAST - these would ideally be fetched from YouTube API
const podcastEpisodes = [
  {
    id: 'episode-1',
    title: 'Episode 12: The Universal Credit Trap',
    videoId: 'dQw4w9WgXcQ', // Placeholder - replace with actual video IDs
    description: 'We discuss the realities of navigating the benefits system.',
  },
  {
    id: 'episode-2',
    title: 'Episode 11: Housing Crisis Special',
    videoId: 'dQw4w9WgXcQ', // Placeholder
    description: "Stories from the frontlines of Britain's housing emergency.",
  },
  {
    id: 'episode-3',
    title: 'Episode 10: Cost of Living with Lived Experience',
    videoId: 'dQw4w9WgXcQ', // Placeholder
    description: 'Real voices, real struggles, real solutions.',
  },
];

export default function YouTubeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const videosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set([headingRef.current, videosRef.current], { opacity: 1 });
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

      // Videos stagger animation
      const videoCards = videosRef.current?.querySelectorAll('.video-card');
      if (videoCards) {
        gsap.fromTo(
          videoCards,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: getDuration(DURATION.medium),
            stagger: 0.15,
            ease: EASING.snappy,
            scrollTrigger: {
              trigger: videosRef.current,
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
      className="py-16 px-4 md:px-8"
      style={{ background: 'var(--surface)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-10">
          <h2
            ref={headingRef}
            className="text-2xl md:text-3xl lg:text-4xl mb-3 lowercase"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: COLORS.secondary,
              textShadow: `0 0 20px ${COLORS.glowSecondary}, 0 2px 4px rgba(0,0,0,0.3)`,
            }}
          >
            scroungers podcast
          </h2>
          <p className="text-base font-medium" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            Listen to our conversations with those who live it.
          </p>
          <a
            href="https://www.youtube.com/@SCROUNGERSPODCAST"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-sm font-medium transition-colors hover:text-[var(--primary)]"
            style={{ color: COLORS.secondary }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Subscribe on YouTube →
          </a>
        </div>

        {/* Featured Episode - Main embed */}
        <div className="mb-8">
          <div
            className="relative aspect-video rounded-xl overflow-hidden border"
            style={{
              borderColor: 'var(--border)',
              boxShadow: `0 0 40px ${COLORS.glowSecondary}`,
            }}
          >
            {/* YouTube embed placeholder - replace with actual embed */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'var(--background)' }}
            >
              <div className="text-center">
                <div
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(255, 0, 0, 0.1)',
                    border: '2px solid rgba(255, 0, 0, 0.3)',
                  }}
                >
                  <svg
                    className="w-10 h-10 text-red-500 ml-1"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                  Latest Episode
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Click to watch on YouTube
                </p>
              </div>
            </div>

            {/* Uncomment this for actual YouTube embed:
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${podcastEpisodes[0].videoId}?rel=0&modestbranding=1`}
              title={podcastEpisodes[0].title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            */}
          </div>
        </div>

        {/* Episode list */}
        <div ref={videosRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podcastEpisodes.map((episode) => (
            <a
              key={episode.id}
              href={`https://www.youtube.com/watch?v=${episode.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="video-card group p-4 rounded-lg border transition-all duration-300 hover:border-[var(--primary)] hover:shadow-[0_0_20px_var(--glow-primary)]"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Thumbnail placeholder */}
              <div
                className="aspect-video rounded-md mb-3 flex items-center justify-center relative overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.3)' }}
              >
                <svg
                  className="w-10 h-10 text-red-500 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>

              <h3
                className="text-sm font-bold mb-1 line-clamp-2 group-hover:text-[var(--primary)] transition-colors"
                style={{
                  color: 'var(--foreground)',
                }}
              >
                {episode.title}
              </h3>
              <p
                className="text-xs font-medium line-clamp-2"
                style={{
                  color: 'var(--foreground)',
                  opacity: 0.7,
                }}
              >
                {episode.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
