'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Nav from '@/app/components/Nav';
import Footer from '@/app/components/layout/Footer';
import { formatDate, getInitials } from '@/lib/utils';
import { REACTION_TYPES } from '@/lib/constants';
import { prefersReducedMotion, EASING, DURATION, getDuration } from '@/lib/animations/gsap-config';
import { createScrollReveal } from '@/lib/animations/scroll-animations';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Mock article data
const mockArticle = {
  id: '1',
  title: 'The Queue That Never Moves',
  subtitle: 'Three years waiting for a home taught me everything about modern Britain',
  slug: 'housing-crisis-view-from-queue',
  excerpt:
    "After three years on the housing waiting list, I have some thoughts on what's really happening to social housing in this country.",
  content_html: `
    <p>It starts with a number. Mine was 2,847. That was my position on the housing waiting list when I first applied, three years ago. Today, I'm at 1,203. Progress, you might think. But let me tell you what those numbers really mean.</p>
    
    <h2 id="the-queue">The Queue That Never Moves</h2>
    
    <p>Every month, I check the council website. Every month, I watch my number inch downwards by single digits. At this rate, I'll be eligible for a council flat sometime in the 2030s. By then, my children will have grown up in temporary accommodation, moved schools half a dozen times, and learned that home is just a word other people use.</p>
    
    <blockquote>
      "The housing crisis isn't a crisis of housing. It's a crisis of political will."
    </blockquote>
    
    <p>The politicians tell us there's a shortage of social housing. This is true. But they don't tell you why. They don't mention Right to Buy, which has sold off 2 million council homes since 1980. They don't mention the fact that for every council home sold, only one in seven has been replaced. They don't mention the developers who land-bank sites for decades while homelessness soars.</p>
    
    <h2 id="what-i-see">What I See From Here</h2>
    
    <p>From my position in the queue, I can see things the housing ministers cannot. I see the families in the B&amp;B down the road, paying £200 a night for one room with a hotplate. I see the elderly woman in the flat upstairs, choosing between heating and eating. I see the young couple who've given up on ever owning a home, given up on even renting a home, moving back in with parents they thought they'd left behind.</p>
    
    <p>What I see is a system designed to fail. Not by accident, but by design. Because someone is profiting from this misery. The landlords extracting housing benefit straight from the state. The developers turning former council estates into "luxury apartments." The politicians with property portfolios that mysteriously expand each year.</p>
    
    <h2 id="human-cost">The Human Cost</h2>
    
    <p>Numbers are easy to ignore. So let me tell you about the people behind them. Let me tell you about Marcus, who sleeps in his car in the supermarket car park because the shelters are full. About Lisa, who works two jobs and still can't afford the deposit on a flat. About the 135,000 children in temporary accommodation right now, tonight, as you read this.</p>
    
    <p>These aren't statistics. These are our neighbours. Our colleagues. Our families. And increasingly, ourselves.</p>
    
    <h2 id="what-next">What Can We Do?</h2>
    
    <p>The answer isn't simple, but it starts with recognition. Recognition that housing is a right, not a privilege. That the market has failed. That we need a massive programme of social housing construction, the likes of which we haven't seen since the post-war era.</p>
    
    <p>Until then, I'll be here. Number 1,203 in the queue. Waiting.</p>
  `,
  content_type: 'written' as const,
  featured_image_url:
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop&q=80', // Abstract architectural drawing
  published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  reading_time: 8,
  view_count: 1234,
  reaction_count: 234,
  comment_count: 45,
  author: {
    id: 'a1',
    display_name: 'Eyup Lovely',
    username: 'eyup_lovely',
    avatar_url: null,
    bio: 'Yorkshire voice from the margins. Calling out nonsense since day one.',
    kofi_username: 'eyuplovely',
    article_count: 18,
  },
  category: { id: 'c1', name: 'Housing', slug: 'housing', color: '#32CD32' },
  tags: ['housing', 'homelessness', 'social-housing', 'politics'],
};

// Mock comments
const mockComments = [
  {
    id: 'cm1',
    content:
      'This really hit home. Been on the waiting list for 5 years now. Proper job putting this into words.',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    author: { display_name: 'Dave Number 7', username: 'davenumber7', avatar_url: null },
    reaction_count: 12,
    replies: [
      {
        id: 'cm1-r1',
        content: "Solidarity mate. We're all in this together.",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        author: { display_name: 'Eyup Lovely', username: 'eyup_lovely', avatar_url: null },
        is_author_reply: true,
      },
    ],
  },
  {
    id: 'cm2',
    content:
      'The Right to Buy statistic is devastating. I had no idea only 1 in 7 homes sold had been replaced.',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: { display_name: 'Michael J. S. Walker', username: 'mjswalker', avatar_url: null },
    reaction_count: 8,
    replies: [],
  },
];

// Table of contents entries
const tocEntries = [
  { id: 'the-queue', title: 'The Queue That Never Moves' },
  { id: 'what-i-see', title: 'What I See From Here' },
  { id: 'human-cost', title: 'The Human Cost' },
  { id: 'what-next', title: 'What Can We Do?' },
];

// Reading Progress Bar Component with animation
function ReadingProgressBar() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.scrollY;
      const newProgress = Math.min((scrollTop / documentHeight) * 100, 100);

      if (progressRef.current) {
        gsap.to(progressRef.current, {
          width: `${newProgress}%`,
          duration: 0.1,
          ease: 'power2.out',
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[100]" style={{ background: 'var(--border)' }}>
      <div
        ref={progressRef}
        className="h-full"
        style={{
          width: '0%',
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
          boxShadow: '0 0 10px var(--glow-primary)',
        }}
      />
    </div>
  );
}

// Table of Contents Component
function TableOfContents({ entries, activeId }: { entries: typeof tocEntries; activeId: string }) {
  return (
    <nav className="sticky top-24 hidden xl:block w-64 shrink-0" aria-label="Table of contents">
      <p
        className="text-xs uppercase tracking-wider font-bold mb-4"
        style={{ color: 'var(--foreground)', opacity: 0.5, fontFamily: 'var(--font-body)' }}
      >
        On this page
      </p>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="block text-sm py-1 pl-3 border-l-2 transition-all"
              style={{
                borderColor: activeId === entry.id ? 'var(--primary)' : 'transparent',
                color: activeId === entry.id ? 'var(--primary)' : 'var(--foreground)',
                opacity: activeId === entry.id ? 1 : 0.6,
                fontFamily: 'var(--font-body)',
              }}
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Share buttons with animated feedback
function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleShare = useCallback(
    (platform: string) => {
      const button = buttonRefs.current[platform];

      // Animate button click
      if (button && !prefersReducedMotion()) {
        gsap.to(button, {
          scale: 0.9,
          duration: 0.1,
          ease: EASING.snappy,
          yoyo: true,
          repeat: 1,
        });
      }

      if (platform === 'twitter') {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          '_blank'
        );
      } else if (platform === 'facebook') {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank'
        );
      } else if (platform === 'linkedin') {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          '_blank'
        );
      } else if (platform === 'copy') {
        void navigator.clipboard.writeText(url);
        setCopied(true);

        if (button && !prefersReducedMotion()) {
          gsap.to(button, {
            scale: 1.1,
            duration: getDuration(DURATION.quick),
            ease: EASING.bounce,
          });
        }

        setTimeout(() => {
          setCopied(false);
          if (button && !prefersReducedMotion()) {
            gsap.to(button, {
              scale: 1,
              duration: getDuration(DURATION.quick),
              ease: EASING.smooth,
            });
          }
        }, 2000);
      }
    },
    [title, url]
  );

  return (
    <div className="flex items-center gap-2">
      {/* Twitter/X */}
      <button
        ref={(el) => {
          buttonRefs.current['twitter'] = el;
          return;
        }}
        onClick={() => handleShare('twitter')}
        className="p-2.5 rounded-xl border transition-all hover:border-[var(--primary)] hover:bg-[var(--surface)]"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--foreground)',
          fontFamily: 'var(--font-body)',
        }}
        aria-label="Share on X"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* Facebook */}
      <button
        ref={(el) => {
          buttonRefs.current['facebook'] = el;
          return;
        }}
        onClick={() => handleShare('facebook')}
        className="p-2.5 rounded-xl border transition-all hover:border-[var(--primary)] hover:bg-[var(--surface)]"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--foreground)',
          fontFamily: 'var(--font-body)',
        }}
        aria-label="Share on Facebook"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      {/* Copy Link */}
      <button
        ref={(el) => {
          buttonRefs.current['copy'] = el;
          return;
        }}
        onClick={() => handleShare('copy')}
        className="p-2.5 rounded-xl border transition-all flex items-center gap-2"
        style={{
          borderColor: copied ? 'var(--primary)' : 'var(--border)',
          background: copied ? 'var(--primary)' : 'transparent',
          color: copied ? 'var(--background)' : 'var(--foreground)',
          fontFamily: 'var(--font-body)',
        }}
        aria-label="Copy link"
      >
        {copied ? (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-body)' }}>
              Copied!
            </span>
          </>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function ArticlePage() {
  useParams();
  const [reactions, setReactions] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState('');
  const [activeSection, setActiveSection] = useState('the-queue');
  const articleRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Track active section for TOC
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -70% 0px' }
    );

    tocEntries.forEach((entry) => {
      const element = document.getElementById(entry.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set([articleRef.current, contentRef.current], { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      // Animate header
      gsap.from('.article-header', {
        y: 50,
        opacity: 0,
        duration: getDuration(DURATION.slow),
        ease: EASING.expo,
      });

      // Animate content with scroll reveal
      if (contentRef.current) {
        createScrollReveal(contentRef.current, {
          direction: 'up',
          distance: 40,
          delay: 0.3,
        });
      }

      // Animate comments on scroll
      const comments = document.querySelectorAll('.comment-item');
      if (comments.length > 0) {
        createScrollReveal(Array.from(comments), {
          direction: 'up',
          distance: 30,
          stagger: 0.1,
        });
      }
    }, articleRef);

    return () => ctx.revert();
  }, []);

  const toggleReaction = useCallback((type: string) => {
    setReactions((prev) => {
      const newState = { ...prev, [type]: !prev[type] };

      // Animate reaction button
      const button = document.querySelector(`[data-reaction="${type}"]`) as HTMLElement;
      if (button && !prefersReducedMotion()) {
        gsap.to(button, {
          scale: 1.2,
          duration: getDuration(DURATION.fast),
          ease: EASING.bounce,
          yoyo: true,
          repeat: 1,
        });
      }

      return newState;
    });
  }, []);

  return (
    <>
      <ReadingProgressBar />
      <Nav />
      <article
        ref={articleRef}
        className="min-h-screen pt-28 pb-20"
        style={{ background: 'var(--background)' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex gap-12">
            {/* Main Content */}
            <div className="flex-1 max-w-3xl">
              {/* Header */}
              <header className="article-header mb-12">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-6">
                  <Link
                    href="/articles"
                    className="hover:text-[var(--primary)] transition-colors"
                    style={{
                      color: 'var(--foreground)',
                      opacity: 0.6,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Newsroom
                  </Link>
                  <span style={{ color: 'var(--foreground)', opacity: 0.3 }}>/</span>
                  <Link
                    href={`/categories/${mockArticle.category.slug}`}
                    className="hover:opacity-80 transition-opacity"
                    style={{ color: mockArticle.category.color, fontFamily: 'var(--font-body)' }}
                  >
                    {mockArticle.category.name}
                  </Link>
                </div>

                {/* Title */}
                <h1
                  className="text-3xl md:text-4xl lg:text-5xl leading-tight mb-4"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
                >
                  {mockArticle.title}
                </h1>

                {/* Subtitle */}
                {mockArticle.subtitle && (
                  <p
                    className="text-xl mb-8"
                    style={{
                      fontFamily: 'var(--font-body)',
                      color: 'var(--foreground)',
                      opacity: 0.8,
                    }}
                  >
                    {mockArticle.subtitle}
                  </p>
                )}

                {/* Author & meta */}
                <div
                  className="flex flex-wrap items-center gap-6 pb-8"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <Link
                    href={`/contributors/${mockArticle.author.username}`}
                    className="flex items-center gap-3 group"
                  >
                    {/* Avatar with gradient ring */}
                    <div
                      className="p-[2px] rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ background: 'var(--background)', color: 'var(--primary)' }}
                      >
                        {getInitials(mockArticle.author.display_name)}
                      </div>
                    </div>
                    <div>
                      <p
                        className="font-bold group-hover:text-[var(--primary)] transition-colors"
                        style={{ fontFamily: 'var(--font-body)', color: 'var(--foreground)' }}
                      >
                        {mockArticle.author.display_name}
                      </p>
                      <p
                        className="text-sm"
                        style={{
                          fontFamily: 'var(--font-body)',
                          color: 'var(--foreground)',
                          opacity: 0.6,
                        }}
                      >
                        {formatDate(mockArticle.published_at)} · {mockArticle.reading_time} min read
                      </p>
                    </div>
                  </Link>

                  {/* Share buttons */}
                  <div className="ml-auto">
                    <ShareButtons
                      title={mockArticle.title}
                      url={typeof window !== 'undefined' ? window.location.href : ''}
                    />
                  </div>
                </div>
              </header>

              {/* Article Content */}
              <div
                ref={contentRef}
                className="prose prose-lg max-w-none mb-12"
                style={
                  {
                    '--tw-prose-body': 'var(--foreground)',
                    '--tw-prose-headings': 'var(--foreground)',
                    '--tw-prose-links': 'var(--primary)',
                    '--tw-prose-quotes': 'var(--foreground)',
                    '--tw-prose-quote-borders': 'var(--primary)',
                  } as React.CSSProperties
                }
              >
                <style jsx global>{`
                  .article-content {
                    font-family: var(--font-body);
                    line-height: 1.8;
                  }
                  .article-content h2 {
                    font-family: var(--font-display);
                    font-size: 1.75rem;
                    margin-top: 3rem;
                    margin-bottom: 1.5rem;
                    color: var(--secondary);
                    scroll-margin-top: 100px;
                  }
                  .article-content p {
                    margin-bottom: 1.5rem;
                    opacity: 0.9;
                  }
                  .article-content blockquote {
                    border-left: 4px solid var(--primary);
                    padding-left: 1.5rem;
                    margin: 2rem 0;
                    font-style: italic;
                    font-size: 1.25rem;
                    color: var(--primary);
                    background: rgba(50, 205, 50, 0.05);
                    padding: 1.5rem;
                    border-radius: 0 1rem 1rem 0;
                  }
                  .article-content a {
                    color: var(--primary);
                    text-decoration: underline;
                    text-underline-offset: 3px;
                  }
                  .article-content a:hover {
                    color: var(--secondary);
                  }
                `}</style>
                <div
                  dangerouslySetInnerHTML={{ __html: mockArticle.content_html }}
                  className="article-content"
                />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {mockArticle.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${tag}`}
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:border-[var(--primary)] hover:bg-[var(--surface)]"
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>

              {/* Reactions */}
              <div
                className="flex flex-wrap items-center gap-4 p-6 rounded-2xl mb-12"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span
                  className="text-sm font-medium"
                  style={{
                    color: 'var(--foreground)',
                    opacity: 0.7,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  React:
                </span>
                {REACTION_TYPES.map((reaction, index) => (
                  <button
                    key={reaction.type}
                    data-reaction={reaction.type}
                    onClick={() => toggleReaction(reaction.type)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:scale-105"
                    style={{
                      borderColor: reactions[reaction.type] ? reaction.color : 'var(--border)',
                      background: reactions[reaction.type] ? `${reaction.color}20` : 'transparent',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span className="text-xl">{reaction.emoji}</span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}
                    >
                      {[42, 18, 31, 27, 14][index] + (reactions[reaction.type] ? 1 : 0)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Author Card */}
              <div
                className="p-6 rounded-2xl mb-12"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="p-[2px] rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ background: 'var(--background)', color: 'var(--primary)' }}
                    >
                      {getInitials(mockArticle.author.display_name)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{
                        color: 'var(--foreground)',
                        opacity: 0.5,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      Written by
                    </p>
                    <Link
                      href={`/contributors/${mockArticle.author.username}`}
                      className="text-lg font-bold hover:text-[var(--primary)] transition-colors"
                      style={{ fontFamily: 'var(--font-body)', color: 'var(--foreground)' }}
                    >
                      {mockArticle.author.display_name}
                    </Link>
                    <p
                      className="text-sm mt-2"
                      style={{
                        fontFamily: 'var(--font-body)',
                        color: 'var(--foreground)',
                        opacity: 0.7,
                      }}
                    >
                      {mockArticle.author.bio}
                    </p>
                    <div className="flex items-center gap-4 mt-4">
                      <Link
                        href={`/contributors/${mockArticle.author.username}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)' }}
                      >
                        View all {mockArticle.author.article_count} posts
                      </Link>
                      {mockArticle.author.kofi_username && (
                        <a
                          href={`https://ko-fi.com/${mockArticle.author.kofi_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium px-4 py-1.5 rounded-full transition-all hover:scale-105"
                          style={{
                            background: 'var(--secondary)',
                            color: 'var(--background)',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          ☕ Buy a coffee
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <section>
                <h3
                  className="text-2xl mb-6"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
                >
                  Comments ({mockComments.length})
                </h3>

                {/* Comment form */}
                <div className="mb-8">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Join the conversation..."
                    rows={3}
                    className="w-full p-4 rounded-xl border outline-none resize-none transition-all focus:border-[var(--primary)]"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      className="px-6 py-2.5 rounded-xl font-bold transition-all hover:scale-105"
                      style={{
                        background: 'var(--primary)',
                        color: 'var(--background)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      Post Comment
                    </button>
                  </div>
                </div>

                {/* Comments list */}
                <div className="space-y-6">
                  {mockComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="comment-item p-5 rounded-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: 'var(--background)', color: 'var(--primary)' }}
                        >
                          {getInitials(comment.author.display_name)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="font-bold"
                              style={{ fontFamily: 'var(--font-body)', color: 'var(--foreground)' }}
                            >
                              {comment.author.display_name}
                            </span>
                            <span
                              className="text-xs"
                              style={{
                                fontFamily: 'var(--font-body)',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                              }}
                            >
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p
                            className="text-sm"
                            style={{
                              fontFamily: 'var(--font-body)',
                              color: 'var(--foreground)',
                              opacity: 0.9,
                            }}
                          >
                            {comment.content}
                          </p>

                          {/* Replies */}
                          {comment.replies?.map((reply) => (
                            <div
                              key={reply.id}
                              className="mt-4 ml-6 p-4 rounded-xl"
                              style={{
                                background: reply.is_author_reply
                                  ? 'rgba(50, 205, 50, 0.05)'
                                  : 'var(--background)',
                                borderLeft: reply.is_author_reply
                                  ? '3px solid var(--primary)'
                                  : 'none',
                              }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className="font-bold text-sm"
                                  style={{
                                    fontFamily: 'var(--font-body)',
                                    color: reply.is_author_reply
                                      ? 'var(--primary)'
                                      : 'var(--foreground)',
                                  }}
                                >
                                  {reply.author.display_name}
                                  {reply.is_author_reply && (
                                    <span
                                      className="ml-2 text-xs px-2 py-0.5 rounded"
                                      style={{
                                        background: 'var(--primary)',
                                        color: 'var(--background)',
                                      }}
                                    >
                                      Author
                                    </span>
                                  )}
                                </span>
                              </div>
                              <p
                                className="text-sm"
                                style={{
                                  fontFamily: 'var(--font-body)',
                                  color: 'var(--foreground)',
                                  opacity: 0.9,
                                }}
                              >
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Table of Contents Sidebar */}
            <TableOfContents entries={tocEntries} activeId={activeSection} />
          </div>
        </div>
      </article>
      <Footer />
    </>
  );
}
