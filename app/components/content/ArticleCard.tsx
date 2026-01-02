'use client';
import gsap from 'gsap';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

interface ArticleCardProps {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  authorKofi?: string;
  date: string;
  category: string;
  imageUrl: string;
  contentType?: 'written' | 'video' | 'audio' | 'visual';
}

export default function ArticleCard({
  slug,
  title,
  excerpt,
  author,
  authorKofi,
  date,
  category,
  imageUrl,
  contentType = 'written',
}: ArticleCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  const contentTypeIcons = {
    written: '📝',
    video: '🎬',
    audio: '🎙️',
    visual: '🎨',
  };

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseEnter = () => {
      gsap.to(card, {
        scale: 1.02,
        y: -5,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(card.querySelector('.card-image'), {
        scale: 1.1,
        duration: 0.4,
        ease: 'power2.out',
      });
      gsap.to(card.querySelector('.card-glow'), {
        opacity: 1,
        duration: 0.3,
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        scale: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(card.querySelector('.card-image'), {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      });
      gsap.to(card.querySelector('.card-glow'), {
        opacity: 0,
        duration: 0.3,
      });
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <article
      ref={cardRef}
      className="group bg-[var(--background-card)] border border-[var(--border)] rounded-lg overflow-hidden relative"
    >
      {/* Glow effect */}
      <div
        className="card-glow absolute inset-0 opacity-0 pointer-events-none z-10"
        style={{
          boxShadow: 'inset 0 0 30px rgba(190, 255, 58, 0.1), 0 0 20px rgba(190, 255, 58, 0.2)',
        }}
      />

      {/* Image */}
      <Link href={`/articles/${slug}`} className="block relative aspect-[16/9] overflow-hidden">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="card-image object-cover transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background-card)] to-transparent opacity-60" />
        <span className="absolute top-3 left-3 bg-[var(--accent)] text-white text-xs font-bold px-2 py-1 rounded">
          {category}
        </span>
        <span className="absolute top-3 right-3 bg-[var(--background)]/80 text-xs px-2 py-1 rounded">
          {contentTypeIcons[contentType]}
        </span>
      </Link>

      {/* Content */}
      <div className="p-5 relative z-20">
        <Link href={`/articles/${slug}`}>
          <h3 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
        </Link>

        <p className="text-[var(--foreground-muted)] text-sm line-clamp-2 mb-4">{excerpt}</p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--foreground)]">{author}</span>
            <span>•</span>
            <span>{date}</span>
          </div>

          {authorKofi && (
            <a
              href={`https://ko-fi.com/${authorKofi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:text-[var(--primary)] font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              ☕ Support
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
