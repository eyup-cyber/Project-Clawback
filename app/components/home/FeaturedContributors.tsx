'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

gsap.registerPlugin(ScrollTrigger);

interface Contributor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  article_count: number | null;
  kofi_username: string | null;
  is_featured: boolean | null;
}

// Fallback contributors if Supabase is unavailable
const fallbackContributors: Contributor[] = [
  {
    id: '1',
    username: 'eyup_lovely',
    display_name: 'Eyup Lovely',
    avatar_url: null,
    bio: 'Yorkshire voice from the margins. Calling out nonsense since day one.',
    article_count: 18,
    kofi_username: 'eyuplovely',
    is_featured: true,
  },
  {
    id: '2',
    username: 'davenumber7',
    display_name: 'Dave Number 7',
    avatar_url: null,
    bio: 'The seventh Dave. Benefits scrounger extraordinaire.',
    article_count: 24,
    kofi_username: 'davenumber7',
    is_featured: true,
  },
  {
    id: '3',
    username: 'mjswalker',
    display_name: 'Michael J. S. Walker',
    avatar_url: null,
    bio: 'Political commentator. Working class perspective.',
    article_count: 31,
    kofi_username: 'mjswalker',
    is_featured: true,
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Contributor card component
function ContributorCard({ contributor }: { contributor: Contributor }) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={cardRef}
      href={`/contributors/${contributor.username}`}
      className="contributor-card group flex-shrink-0 w-72 md:w-80 p-6 rounded-2xl transition-all duration-300"
      style={{
        background: isHovered 
          ? 'linear-gradient(135deg, var(--surface) 0%, rgba(50, 205, 50, 0.05) 100%)'
          : 'var(--surface)',
        border: `1px solid ${isHovered ? 'var(--primary)' : 'var(--border)'}`,
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(0,0,0,0.2), 0 0 30px var(--glow-primary)'
          : '0 4px 20px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar with glowing ring */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          {/* Glowing ring */}
          <div
            className="absolute -inset-1 rounded-full transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, var(--primary), var(--secondary), var(--accent))`,
              opacity: isHovered ? 1 : 0.6,
              filter: isHovered ? 'blur(0px)' : 'blur(1px)',
              animation: isHovered ? 'spin 3s linear infinite' : 'none',
            }}
          />
          {/* Avatar container */}
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: 'var(--background)',
              color: 'var(--primary)',
              border: '3px solid var(--background)',
            }}
          >
            {contributor.avatar_url ? (
               
              <img
                src={contributor.avatar_url}
                alt={contributor.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(contributor.display_name)
            )}
          </div>
          {/* Featured indicator */}
          {contributor.is_featured && (
            <span 
              className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2"
              style={{ 
                background: 'var(--primary)',
                borderColor: 'var(--background)',
                boxShadow: '0 0 8px var(--primary)',
              }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-lg transition-colors duration-200 truncate"
            style={{ 
              fontFamily: 'var(--font-body)',
              color: isHovered ? 'var(--primary)' : 'var(--foreground)',
            }}
          >
            {contributor.display_name}
          </h3>
          <p 
            className="text-sm truncate" 
            style={{ 
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)', 
              opacity: 0.5 
            }}
          >
            @{contributor.username}
          </p>
        </div>
      </div>

      {/* Bio */}
      <p
        className="text-sm line-clamp-2 mb-4"
        style={{ 
          fontFamily: 'var(--font-body)',
          color: 'var(--foreground)', 
          opacity: 0.7,
          minHeight: '2.5rem',
        }}
      >
        {contributor.bio}
      </p>

      {/* Stats and Ko-fi */}
      <div 
        className="flex items-center justify-between pt-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Article count badge */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200"
          style={{ 
            background: isHovered ? 'var(--primary)' : 'rgba(50, 205, 50, 0.1)',
            color: isHovered ? 'var(--background)' : 'var(--primary)',
          }}
        >
          <span className="text-sm">📝</span>
          <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
            {contributor.article_count || 0} posts
          </span>
        </div>

        {/* Ko-fi button */}
        {contributor.kofi_username && (
          <span
            className="text-sm px-3 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center gap-1"
            style={{ 
              background: isHovered ? 'var(--secondary)' : 'rgba(255, 215, 0, 0.15)', 
              color: isHovered ? '#000' : 'var(--secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            ☕ Tip
          </span>
        )}
      </div>

      {/* Spin animation keyframes */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Link>
  );
}

export default function FeaturedContributors() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [contributors, setContributors] = useState<Contributor[]>(fallbackContributors);
  const supabase = createClient();

  // Fetch contributors from Supabase
  useEffect(() => {
    const fetchContributors = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, article_count, kofi_username, is_featured')
        .in('role', ['contributor', 'editor', 'admin'])
        .eq('status', 'active')
        .gt('article_count', 0)
        .order('is_featured', { ascending: false })
        .order('article_count', { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        setContributors(data);
      }
    };

    void fetchContributors();
  }, [supabase]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate heading
      gsap.from(headingRef.current, {
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: headingRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });

      // Staggered card reveal from right
      const cards = scrollRef.current?.querySelectorAll('.contributor-card');
      if (cards) {
        gsap.from(cards, {
          x: 80,
          opacity: 0,
          rotateY: 15,
          duration: 0.8,
          stagger: {
            each: 0.1,
            from: 'start',
          },
          ease: 'power3.out',
          scrollTrigger: {
            trigger: scrollRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 px-4 md:px-8 overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div ref={headingRef} className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <p 
              className="text-sm uppercase tracking-[0.3em] mb-2"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
            >
              Our Contributors
            </p>
            <h2
              className="text-3xl md:text-5xl"
              style={{ 
                fontFamily: 'var(--font-display)',
                color: 'var(--secondary)',
              }}
            >
              Voices From The Margins
            </h2>
            <p 
              className="mt-3 text-lg max-w-lg" 
              style={{ 
                fontFamily: 'var(--font-body)',
                color: 'var(--foreground)', 
                opacity: 0.7 
              }}
            >
              Meet the people telling the stories that matter
            </p>
          </div>
          <Link
            href="/contributors"
            className="group hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 hover:bg-[var(--secondary)] hover:border-[var(--secondary)] hover:text-[var(--background)]"
            style={{ 
              borderColor: 'var(--border)', 
              color: 'var(--foreground)',
              fontFamily: 'var(--font-body)',
            }}
          >
            All Contributors
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className="transition-transform group-hover:translate-x-1"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Horizontal scroll - touch friendly */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 md:-mx-8 md:px-8 snap-x snap-mandatory"
          style={{ 
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            perspective: '1500px',
          }}
        >
          {contributors.map((contributor) => (
            <div key={contributor.id} className="snap-start">
              <ContributorCard contributor={contributor} />
            </div>
          ))}
        </div>

        {/* Scroll hint for mobile */}
        <div className="sm:hidden text-center mt-4">
          <p 
            className="text-sm animate-pulse"
            style={{ color: 'var(--foreground)', opacity: 0.5, fontFamily: 'var(--font-body)' }}
          >
            ← Swipe to see more →
          </p>
        </div>

        {/* Mobile view all link */}
        <div className="sm:hidden text-center mt-6">
          <Link
            href="/contributors"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border font-medium"
            style={{ 
              borderColor: 'var(--border)', 
              color: 'var(--foreground)',
              fontFamily: 'var(--font-body)',
            }}
          >
            View All Contributors
          </Link>
        </div>
      </div>

      {/* Hide scrollbar globally for this component */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
