'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Nav from '@/app/components/Nav';
import Footer from '@/app/components/layout/Footer';
import { formatRelativeTime, getContentTypeIcon, getContentTypeLabel } from '@/lib/utils';
import { CONTENT_TYPES, DEFAULT_CATEGORIES, ITEMS_PER_PAGE } from '@/lib/constants';
// createClient imported but used conditionally in effects

gsap.registerPlugin(ScrollTrigger);

// Fallback mock data when Supabase is unavailable or empty - abstract titles and drawings
const mockPosts = [
  {
    id: '1',
    title: 'The Queue That Never Moves',
    slug: 'housing-crisis-view-from-queue',
    excerpt: 'After three years on the housing waiting list, I have some thoughts on what\'s really happening to social housing in this country.',
    content_type: 'written' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop&q=80', // Abstract architectural drawing
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reading_time: 8,
    reaction_count: 234,
    comment_count: 45,
    author: { display_name: 'Eyup Lovely', username: 'eyup_lovely', avatar_url: null, kofi_username: 'eyuplovely' },
    category: { name: 'Housing', slug: 'housing', color: '#32CD32' },
  },
  {
    id: '2',
    title: 'The System and Its Shadows',
    slug: 'universal-credit-documentary',
    excerpt: 'A 20-minute deep dive into the system that\'s failing millions. Featuring interviews with claimants, advisors, and critics.',
    content_type: 'video' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=630&fit=crop&q=80', // Abstract geometric pattern
    published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    media_duration: 1200,
    reaction_count: 567,
    comment_count: 89,
    author: { display_name: 'Dave Number 7', username: 'davenumber7', avatar_url: null, kofi_username: 'davenumber7' },
    category: { name: 'Benefits', slug: 'benefits', color: '#32CD32' },
  },
  {
    id: '3',
    title: 'SCROUNGERS EPISODE 12',
    slug: 'voices-margins-ep-12',
    excerpt: 'This week we talk to three disability activists about the latest PIP reforms and what they mean for claimants.',
    content_type: 'audio' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1200&h=630&fit=crop&q=80', // Abstract sound wave illustration
    published_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    media_duration: 3600,
    reaction_count: 123,
    comment_count: 34,
    author: { display_name: 'Michael J. S. Walker', username: 'mjswalker', avatar_url: null, kofi_username: 'mjswalker' },
    category: { name: 'Health', slug: 'health', color: '#FF00FF' },
  },
  {
    id: '4',
    title: 'The Cost of Living in 40 Drawings',
    slug: 'cost-living-40-drawings',
    excerpt: 'A visual journey through a year of austerity Britain, told through the eyes of those at the sharp end.',
    content_type: 'visual' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=600&fit=crop&q=80', // Abstract sketch/drawing
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reaction_count: 892,
    comment_count: 156,
    author: { display_name: 'Sewer Correspondent', username: 'sewer_correspondent', avatar_url: null, kofi_username: 'sewercorrespondent' },
    category: { name: 'Culture', slug: 'culture', color: '#FFD700' },
  },
  {
    id: '5',
    title: 'Platforms and Precarity',
    slug: 'gig-economy-no-rights',
    excerpt: 'From Deliveroo to Uber to Amazon Flex, how platform capitalism is redefining what it means to work.',
    content_type: 'written' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&h=630&fit=crop&q=80', // Abstract line drawing
    published_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    reading_time: 12,
    reaction_count: 345,
    comment_count: 67,
    author: { display_name: 'Eyup Lovely', username: 'eyup_lovely', avatar_url: null, kofi_username: 'eyuplovely' },
    category: { name: 'Work', slug: 'work', color: '#32CD32' },
  },
  {
    id: '6',
    title: 'A Haiku for Every Tory MP',
    slug: 'haiku-every-tory-mp',
    excerpt: 'Exactly what it sounds like. 350 haikus of righteous fury, despair, and occasional dark humour.',
    content_type: 'written' as const,
    featured_image_url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&h=630&fit=crop&q=80', // Abstract illustration
    published_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    reading_time: 25,
    reaction_count: 1234,
    comment_count: 234,
    author: { display_name: 'Dave Number 7', username: 'davenumber7', avatar_url: null, kofi_username: 'davenumber7' },
    category: { name: 'Culture', slug: 'culture', color: '#FFD700' },
  },
];

type ContentType = 'all' | 'written' | 'video' | 'audio' | 'visual';
type SortOption = 'latest' | 'trending' | 'discussed';

// Tab button component with animated underline
function FilterTab({ 
  active, 
  onClick, 
  children,
  icon,
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
      style={{
        color: active ? 'var(--primary)' : 'var(--foreground)',
        opacity: active ? 1 : 0.7,
        fontFamily: 'var(--font-body)',
      }}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span className="hidden sm:inline">{children}</span>
      {/* Animated underline */}
      <span
        className="absolute bottom-0 left-0 h-[2px] transition-all duration-300"
        style={{
          width: active ? '100%' : '0%',
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
    </button>
  );
}

// Article card component with 3D hover
function ArticleCard({ post, viewMode }: { post: typeof mockPosts[0]; viewMode: 'grid' | 'list' }) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || viewMode === 'list') return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 8, y: -x * 8 });
  }, [viewMode]);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Link
      ref={cardRef}
      href={`/articles/${post.slug}`}
      className={`article-card group block rounded-xl overflow-hidden transition-all duration-300 ${
        viewMode === 'list' ? 'flex' : ''
      }`}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isHovered ? 'var(--primary)' : 'var(--border)'}`,
        transform: viewMode === 'grid' 
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`
          : undefined,
        boxShadow: isHovered 
          ? '0 20px 40px rgba(0,0,0,0.2), 0 0 30px var(--glow-primary)'
          : '0 4px 20px rgba(0,0,0,0.1)',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden ${
          viewMode === 'list' ? 'w-48 md:w-64 flex-shrink-0' : 'aspect-video'
        }`}
        style={{ background: 'linear-gradient(135deg, var(--background), var(--surface))' }}
      >
        {/* Featured Image */}
        {post.featured_image_url && (
           
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
            <span className="text-5xl opacity-20">{getContentTypeIcon(post.content_type)}</span>
          </div>
        )}
        
        {/* Category badge */}
        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{ background: post.category.color, color: '#000' }}
        >
          {post.category.name}
        </span>
        
        {/* Content type badge */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            isHovered ? 'animate-pulse' : ''
          }`}
          style={{ 
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
          }}
        >
          <span>{getContentTypeIcon(post.content_type)}</span>
          <span>{getContentTypeLabel(post.content_type)}</span>
        </span>

        {/* Duration / Reading time */}
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
            {Math.floor(post.media_duration / 60)} min
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1">
        <h3
          className="text-lg font-bold line-clamp-2 transition-colors duration-200 mb-2"
          style={{ 
            fontFamily: 'var(--font-body)',
            color: isHovered ? 'var(--primary)' : 'var(--foreground)',
          }}
        >
          {post.title}
        </h3>
        
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

        {/* Author */}
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="relative"
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              padding: '2px',
              borderRadius: '50%',
            }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--surface)', color: 'var(--primary)' }}
            >
              {getInitials(post.author.display_name)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="text-sm font-medium truncate"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--foreground)' }}
            >
              {post.author.display_name}
            </p>
            <p 
              className="text-xs"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--foreground)', opacity: 0.5 }}
            >
              {formatRelativeTime(post.published_at)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div 
          className="flex items-center gap-4 pt-3 text-sm"
          style={{ 
            borderTop: '1px solid var(--border)',
            color: 'var(--foreground)', 
            opacity: 0.6,
            fontFamily: 'var(--font-body)',
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
              className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium transition-all"
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

// Pagination component
function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Show max 5 page numbers
  let visiblePages = pages;
  if (totalPages > 5) {
    const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
    visiblePages = pages.slice(start, start + 5);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg transition-all disabled:opacity-30"
        style={{ 
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      
      {visiblePages[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-10 h-10 rounded-lg transition-all"
            style={{ 
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-body)',
            }}
          >
            1
          </button>
          {visiblePages[0] > 2 && <span style={{ color: 'var(--foreground)', opacity: 0.5 }}>...</span>}
        </>
      )}
      
      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className="w-10 h-10 rounded-lg font-medium transition-all"
          style={{ 
            background: currentPage === page ? 'var(--primary)' : 'transparent',
            border: currentPage === page ? 'none' : '1px solid var(--border)',
            color: currentPage === page ? 'var(--background)' : 'var(--foreground)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {page}
        </button>
      ))}
      
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span style={{ color: 'var(--foreground)', opacity: 0.5 }}>...</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            className="w-10 h-10 rounded-lg transition-all"
            style={{ 
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg transition-all disabled:opacity-30"
        style={{ 
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

export default function ArticlesPage() {
  const [contentType, setContentTypeRaw] = useState<ContentType>('all');
  const [category, setCategoryRaw] = useState<string>('all');
  const [sortBy, setSortByRaw] = useState<SortOption>('latest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // Wrap filter setters to also reset pagination
  const setContentType = (value: ContentType) => {
    setContentTypeRaw(value);
    setCurrentPage(1);
  };
  const setCategory = (value: string) => {
    setCategoryRaw(value);
    setCurrentPage(1);
  };
  const setSortBy = (value: SortOption) => {
    setSortByRaw(value);
    setCurrentPage(1);
  };
  
  const headerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate header
      gsap.from(headerRef.current, {
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
      });

      // Animate filters
      gsap.from(filtersRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.7,
        delay: 0.2,
        ease: 'power3.out',
      });

      // Staggered card reveal
      const cards = gridRef.current?.querySelectorAll('.article-card');
      if (cards) {
        gsap.from(cards, {
          y: 60,
          opacity: 0,
          rotateX: -10,
          duration: 0.7,
          stagger: 0.08,
          delay: 0.4,
          ease: 'power3.out',
        });
      }
    });

    return () => ctx.revert();
  }, []);

  // Filter posts
  const filteredPosts = mockPosts.filter(post => {
    if (contentType !== 'all' && post.content_type !== contentType) return false;
    if (category !== 'all' && post.category.slug !== category) return false;
    return true;
  });

  // Sort posts
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'trending':
        return b.reaction_count - a.reaction_count;
      case 'discussed':
        return b.comment_count - a.comment_count;
      default:
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    }
  });

  // Paginate
  const totalPages = Math.ceil(sortedPosts.length / ITEMS_PER_PAGE);
  const paginatedPosts = sortedPosts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-28 pb-20 px-4 md:px-8" style={{ background: 'var(--background)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div ref={headerRef} className="mb-12">
            <p 
              className="text-sm uppercase tracking-[0.3em] mb-3"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
            >
              Browse Content
            </p>
            <h1
              className="text-4xl md:text-6xl mb-4"
              style={{ 
                fontFamily: 'var(--font-display)',
                color: 'var(--secondary)',
              }}
            >
              The Newsroom
            </h1>
            <p 
              className="text-lg max-w-xl" 
              style={{ 
                fontFamily: 'var(--font-body)',
                color: 'var(--foreground)', 
                opacity: 0.7 
              }}
            >
              Political journalism from the people who live it. No credentials required.
            </p>
          </div>

          {/* Filters */}
          <div
            ref={filtersRef}
            className="rounded-2xl p-4 md:p-6 mb-10"
            style={{ 
              background: 'var(--surface)', 
              border: '1px solid var(--border)',
            }}
          >
            {/* Content type tabs */}
            <div className="flex flex-wrap items-center gap-1 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <FilterTab active={contentType === 'all'} onClick={() => setContentType('all')}>
                All
              </FilterTab>
              {CONTENT_TYPES.map(type => (
                <FilterTab
                  key={type.id}
                  active={contentType === type.id}
                  onClick={() => setContentType(type.id as ContentType)}
                  icon={type.icon}
                >
                  {type.label}
                </FilterTab>
              ))}
            </div>

            {/* Secondary filters row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Category filter */}
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="appearance-none px-4 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <option value="all">All Categories</option>
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <svg 
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="var(--foreground)" 
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none px-4 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <option value="latest">Latest</option>
                  <option value="trending">🔥 Trending</option>
                  <option value="discussed">💬 Most Discussed</option>
                </select>
                <svg 
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="var(--foreground)" 
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Results count */}
              <span 
                className="text-sm hidden md:block"
                style={{ color: 'var(--foreground)', opacity: 0.5, fontFamily: 'var(--font-body)' }}
              >
                {sortedPosts.length} {sortedPosts.length === 1 ? 'result' : 'results'}
              </span>

              {/* View toggle */}
              <div className="ml-auto flex gap-2 p-1 rounded-xl" style={{ background: 'var(--background)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-2 rounded-lg transition-all"
                  style={{
                    background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--background)' : 'var(--foreground)',
                  }}
                  aria-label="Grid view"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 rounded-lg transition-all"
                  style={{
                    background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'list' ? 'var(--background)' : 'var(--foreground)',
                  }}
                  aria-label="List view"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="3" cy="6" r="1" fill="currentColor" />
                    <circle cx="3" cy="12" r="1" fill="currentColor" />
                    <circle cx="3" cy="18" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Articles Grid */}
          <div
            ref={gridRef}
            className={`${
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'flex flex-col gap-4'
            }`}
            style={{ perspective: '2000px' }}
          >
            {paginatedPosts.map((post) => (
              <ArticleCard key={post.id} post={post} viewMode={viewMode} />
            ))}
          </div>

          {/* Pagination */}
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />

          {/* No results */}
          {sortedPosts.length === 0 && (
            <div className="text-center py-20">
              <div 
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface)' }}
              >
                <span className="text-4xl">🔍</span>
              </div>
              <p 
                className="text-xl mb-2" 
                style={{ 
                  fontFamily: 'var(--font-body)',
                  color: 'var(--foreground)', 
                }}
              >
                No articles found
              </p>
              <p 
                className="text-sm mb-6" 
                style={{ 
                  fontFamily: 'var(--font-body)',
                  color: 'var(--foreground)', 
                  opacity: 0.5,
                }}
              >
                Try adjusting your filters to see more results
              </p>
              <button
                onClick={() => {
                  setContentType('all');
                  setCategory('all');
                }}
                className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
                style={{ 
                  background: 'var(--primary)', 
                  color: 'var(--background)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
