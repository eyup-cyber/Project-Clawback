'use client';

import gsap from 'gsap';
import { type ReactNode, useEffect, useRef } from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'search' | 'posts' | 'notifications' | 'error';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion()) return;

    const elements = containerRef.current.querySelectorAll('.animate-item');

    gsap.fromTo(
      elements,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: getDuration(DURATION.medium),
        ease: EASING.snappy,
      }
    );
  }, []);

  // Icon animation
  useEffect(() => {
    if (!iconRef.current || prefersReducedMotion()) return;

    const icon = iconRef.current;

    // Gentle floating animation
    gsap.to(icon, {
      y: -5,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    return () => {
      gsap.killTweensOf(icon);
    };
  }, []);

  // Default icons for variants
  const defaultIcons: Record<string, ReactNode> = {
    default: (
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    ),
    search: (
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    ),
    posts: (
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
    notifications: (
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
    ),
    error: (
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
  };

  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      {/* Icon */}
      <div ref={iconRef} className="animate-item text-foreground/30 mb-6">
        {displayIcon}
      </div>

      {/* Title */}
      <h3 className="animate-item text-lg font-medium text-foreground mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="animate-item text-foreground/60 max-w-sm mb-6">{description}</p>
      )}

      {/* Action */}
      {action && <div className="animate-item">{action}</div>}
    </div>
  );
}

// Pre-configured empty states
export function NoSearchResults({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search.`}
      action={
        onClear && (
          <button
            onClick={onClear}
            className="px-4 py-2 bg-primary text-background rounded-full text-sm hover:bg-primary/90 transition-colors"
          >
            Clear search
          </button>
        )
      }
    />
  );
}

export function NoPosts({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      variant="posts"
      title="No posts yet"
      description="Start creating content to share with your audience."
      action={
        onCreate && (
          <button
            onClick={onCreate}
            className="px-6 py-3 bg-primary text-background rounded-full hover:bg-primary/90 transition-colors"
          >
            Create your first post
          </button>
        )
      }
    />
  );
}

export function NoNotifications() {
  return (
    <EmptyState
      variant="notifications"
      title="All caught up!"
      description="You have no new notifications. We'll let you know when something happens."
    />
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description="We're having trouble loading this content. Please try again."
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 border border-primary text-primary rounded-full hover:bg-primary hover:text-background transition-colors"
          >
            Try again
          </button>
        )
      }
    />
  );
}
