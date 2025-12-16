'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { formatRelativeTime, getContentTypeIcon } from '@/lib/utils';
import BackgroundEffects from '@/app/components/effects/BackgroundEffects';
import { FloatingParticles } from '@/app/components/effects/Particles';

gsap.registerPlugin(ScrollTrigger);

// Mock data - abstract titles and drawings/illustrations - replace with Supabase data
const mockPosts = [
  {
    id: '1',
    title: 'The Queue That Never Moves',
    slug: 'three-years-housing-list',
    excerpt: 'A personal account of navigating the council housing system and what it reveals about our priorities.',
    content_type: 'written' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop&q=80', // Abstract architectural drawing
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reaction_count: 234,
    comment_count: 45,
    reading_time: 8,
    author: { display_name: 'Sarah Mitchell', username: 'sarah_m', kofi_username: 'sarahm', avatar_url: null },
    category: { name: 'Housing', slug: 'housing', color: '#32CD32' },
  },
  {
    id: '2',
    title: 'The System and Its Shadows',
    slug: 'inside-jobcentre-both-sides',
    excerpt: 'A former DWP worker shares their experience of a system designed to fail.',
    content_type: 'written' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=630&fit=crop&q=80', // Abstract geometric pattern
    published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    reaction_count: 567,
    comment_count: 89,
    reading_time: 12,
    author: { display_name: 'Anonymous', username: 'anonymous_dwp', kofi_username: null, avatar_url: null },
    category: { name: 'Benefits', slug: 'benefits', color: '#32CD32' },
  },
  {
    id: '3',
    title: 'SCROUNGERS EPISODE 12',
    slug: 'scroungers-podcast-ep-12',
    excerpt: 'Disability activists discuss the latest PIP assessment changes and what they mean for claimants.',
    content_type: 'audio' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1200&h=630&fit=crop&q=80', // Abstract sound wave illustration
    published_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    reaction_count: 123,
    comment_count: 34,
    media_duration: 3600,
    author: { display_name: 'Scroungers Team', username: 'scroungers', kofi_username: 'scroungers', avatar_url: null },
    category: { name: 'Podcast', slug: 'podcast', color: '#FFD700' },
  },
  {
    id: '4',
    title: 'Empty Shelves, Full Hearts',
    slug: 'food-bank-britain-numbers',
    excerpt: 'Volunteers share what they see week after week, and why the statistics don\'t tell the whole story.',
    content_type: 'written' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&h=630&fit=crop&q=80', // Abstract line drawing
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reaction_count: 892,
    comment_count: 156,
    reading_time: 10,
    author: { display_name: 'Trussell Trust Volunteer', username: 'trussell_vol', kofi_username: null, avatar_url: null },
    category: { name: 'Report', slug: 'report', color: '#FF00FF' },
  },
];

// Format duration to human readable
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
}

// Get initials from display name
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

interface PostCardProps {
  post: typeof mockPosts[0];
  featured?: boolean;
}

function PostCard({ post, featured = false }: PostCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // 3D Tilt effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 10, y: -x * 10 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  return (
    <Link
      ref={cardRef}
      href={`/articles/${post.slug}`}
      className={`group block rounded-xl overflow-hidden border transition-all duration-300 ${
        featured ? 'row-span-2' : ''
      }`}
      style={{
        background: 'var(--surface)',
        borderColor: isHovered ? 'var(--primary)' : 'var(--border)',
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`,
        transformStyle: 'preserve-3d',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(0,0,0,0.3), 0 0 30px var(--glow-primary)' 
          : '0 4px 20px rgba(0,0,0,0.1)',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden ${featured ? 'aspect-[16/10]' : 'aspect-video'}`}
        style={{ background: 'linear-gradient(135deg, var(--background), var(--surface))' }}
      >
        {/* Featured Image */}
        {post.featured_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 1 }}
          />
        )}
        
        {/* Placeholder for image (fallback) */}
        {!post.featured_image_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-20">{getContentTypeIcon(post.content_type)}</span>
          </div>
        )}
        
        {/* Category badge */}
        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{ background: post.category.color, color: '#000' }}
        >
          {post.category.name}
        </span>
        
        {/* Content type icon with pulse */}
        <span
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-sm ${
            isHovered ? 'animate-pulse' : ''
          }`}
          style={{ 
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            boxShadow: isHovered ? `0 0 15px ${post.category.color}40` : 'none',
          }}
        >
          {getContentTypeIcon(post.content_type)}
        </span>

        {/* Duration/Reading time badge */}
        {'reading_time' in post && post.reading_time && (
          <span
            className="absolute bottom-3 right-3 px-2 py-1 rounded text-xs font-medium"
            style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--foreground)' }}
          >
            {post.reading_time} min read
          </span>
        )}
        {'media_duration' in post && post.media_duration && (
          <span
            className="absolute bottom-3 right-3 px-2 py-1 rounded text-xs font-medium"
            style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--foreground)' }}
          >
            {formatDuration(post.media_duration)}
          </span>
        )}

        {/* Hover overlay with gradient */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ 
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)',
            opacity: isHovered ? 1 : 0,
          }}
        />
      </div>

      {/* Content */}
      <div className={`p-4 ${featured ? 'p-6' : ''}`} style={{ transform: 'translateZ(20px)' }}>
        <h3
          className={`font-bold line-clamp-2 transition-colors duration-200 ${
            featured ? 'text-xl mb-3' : 'text-base mb-2'
          }`}
          style={{ 
            fontFamily: 'var(--font-body)',
            color: isHovered ? 'var(--primary)' : 'var(--foreground)',
          }}
        >
          {post.title}
        </h3>
        
        {featured && (
          <p 
            className="text-sm line-clamp-2 mb-4" 
            style={{ 
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)', 
              opacity: 0.7 
            }}
          >
            {post.excerpt}
          </p>
        )}

        {/* Author with avatar ring */}
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar with glowing ring */}
          <div 
            className="relative"
            style={{
              background: `linear-gradient(135deg, var(--primary), var(--secondary))`,
              padding: '2px',
              borderRadius: '50%',
              boxShadow: isHovered ? '0 0 12px var(--glow-primary)' : 'none',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ 
                background: 'var(--surface)',
                color: 'var(--primary)',
              }}
            >
              {post.author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={post.author.avatar_url} 
                  alt={post.author.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(post.author.display_name)
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="text-sm font-medium truncate"
              style={{ color: 'var(--foreground)' }}
            >
              {post.author.display_name}
            </p>
            <p 
              className="text-xs"
              style={{ color: 'var(--foreground)', opacity: 0.5 }}
            >
              {formatRelativeTime(post.published_at)}
            </p>
          </div>
        </div>

        {/* Stats and Ko-fi */}
        <div 
          className="flex items-center gap-4 text-sm pt-3"
          style={{ 
            borderTop: '1px solid var(--border)',
            color: 'var(--foreground)', 
            opacity: 0.6 
          }}
        >
          <span className="flex items-center gap-1">
            <span className={isHovered ? 'animate-bounce' : ''}>⭐</span> 
            {post.reaction_count}
          </span>
          <span className="flex items-center gap-1">
            <span>💬</span> 
            {post.comment_count}
          </span>
          {post.author.kofi_username && (
            <span
              className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-200"
              style={{ 
                background: isHovered ? 'var(--secondary)' : 'rgba(255, 215, 0, 0.15)', 
                color: isHovered ? '#000' : 'var(--secondary)',
              }}
            >
              ☕ Tip
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Newsfeed() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate heading
      gsap.from(headingRef.current, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: headingRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });

      // Staggered card reveal
      const cards = cardsRef.current?.querySelectorAll('.post-card');
      if (cards) {
        gsap.from(cards, {
          y: 80,
          opacity: 0,
          rotateX: -15,
          duration: 0.9,
          stagger: {
            each: 0.12,
            from: 'start',
          },
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardsRef.current,
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
      className="py-6 px-4 md:px-8 relative overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Background Effects */}
      <BackgroundEffects variant="all" intensity={1.2} />
      <FloatingParticles count={60} color="var(--primary)" minSize={1} maxSize={4} />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2
              ref={headingRef}
              className="text-2xl md:text-3xl lg:text-4xl lowercase"
              style={{ 
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--secondary)',
                textShadow: '0 0 20px var(--glow-secondary), 0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              latest articles
            </h2>
          </div>
          <Link
            href="/articles"
            className="group hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-[var(--background)]"
            style={{ 
              borderColor: 'var(--border)', 
              color: 'var(--foreground)',
              fontFamily: 'var(--font-body)',
            }}
          >
            View All
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

        {/* Grid */}
        <div 
          ref={cardsRef} 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{ perspective: '2000px' }}
        >
          {mockPosts.map((post, i) => (
            <div 
              key={post.id} 
              className={`post-card ${i === 0 ? 'md:col-span-2 lg:col-span-2 lg:row-span-2' : ''}`}
            >
              <PostCard post={post} featured={i === 0} />
            </div>
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-10 sm:hidden text-center">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full border font-medium transition-all hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-[var(--background)]"
            style={{ 
              borderColor: 'var(--border)', 
              color: 'var(--foreground)',
              fontFamily: 'var(--font-body)',
            }}
          >
            View All Content
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
