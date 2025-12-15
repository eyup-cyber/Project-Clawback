'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

gsap.registerPlugin(ScrollTrigger);

interface Category {
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  post_count: number | null;
}

// Fallback categories if Supabase is unavailable
const fallbackCategories: Category[] = [
  { name: 'Housing', slug: 'housing', icon: '🏠', color: '#32CD32', post_count: 0 },
  { name: 'Economics', slug: 'economics', icon: '💰', color: '#FFD700', post_count: 0 },
  { name: 'Health', slug: 'health', icon: '🏥', color: '#FF00FF', post_count: 0 },
  { name: 'Benefits', slug: 'benefits', icon: '📋', color: '#32CD32', post_count: 0 },
  { name: 'Culture', slug: 'culture', icon: '🎭', color: '#FFD700', post_count: 0 },
  { name: 'Work', slug: 'work', icon: '⚒️', color: '#32CD32', post_count: 0 },
  { name: 'Environment', slug: 'environment', icon: '🌍', color: '#32CD32', post_count: 0 },
  { name: 'International', slug: 'international', icon: '🌐', color: '#FFD700', post_count: 0 },
];

// Animated counter component
function AnimatedCounter({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!countRef.current || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          
          const startTime = performance.now();
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            
            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(target);
            }
          };
          
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(countRef.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={countRef}>{count}</span>;
}

// Category card component
function CategoryCard({ category }: { category: Category }) {
  const [isHovered, setIsHovered] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);

  // Float animation on hover
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        y: -8,
        scale: 1.1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        y: 0,
        scale: 1,
        duration: 0.4,
        ease: 'elastic.out(1, 0.5)',
      });
    }
  }, []);

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="category-card group relative p-6 md:p-8 rounded-2xl transition-all duration-300"
      style={{
        background: isHovered 
          ? `linear-gradient(135deg, var(--surface) 0%, ${category.color}10 100%)`
          : 'var(--surface)',
        transform: isHovered ? 'scale(1.03) translateY(-4px)' : 'scale(1)',
        boxShadow: isHovered 
          ? `0 20px 40px rgba(0,0,0,0.2), 0 0 40px ${category.color}30`
          : '0 4px 20px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient border */}
      <div
        className="absolute inset-0 rounded-2xl p-[1px] pointer-events-none transition-opacity duration-300"
        style={{
          background: isHovered
            ? `linear-gradient(135deg, ${category.color}, var(--primary), ${category.color})`
            : 'transparent',
          opacity: isHovered ? 1 : 0,
        }}
      >
        <div 
          className="w-full h-full rounded-2xl"
          style={{ background: 'var(--surface)' }}
        />
      </div>

      {/* Border fallback */}
      <div
        className="absolute inset-0 rounded-2xl border transition-colors duration-300"
        style={{
          borderColor: isHovered ? (category.color || 'var(--primary)') : 'var(--border)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon with float animation */}
        <span 
          ref={iconRef}
          className="text-4xl md:text-5xl block mb-4 inline-block"
          style={{ 
            filter: isHovered ? `drop-shadow(0 4px 12px ${category.color}60)` : 'none',
            transition: 'filter 0.3s ease',
          }}
        >
          {category.icon}
        </span>

        {/* Name */}
        <h3
          className="text-lg md:text-xl font-bold transition-colors duration-200"
          style={{ 
            fontFamily: 'var(--font-body)',
            color: isHovered ? (category.color || 'var(--primary)') : 'var(--foreground)',
          }}
        >
          {category.name}
        </h3>

        {/* Animated count */}
        <p 
          className="text-sm mt-2 flex items-center gap-1" 
          style={{ 
            fontFamily: 'var(--font-body)',
            color: 'var(--foreground)', 
            opacity: 0.6,
          }}
        >
          <AnimatedCounter target={category.post_count || 0} /> 
          <span>posts</span>
        </p>

        {/* Arrow indicator */}
        <div
          className="absolute bottom-6 right-6 transition-all duration-300"
          style={{ 
            color: category.color || 'var(--primary)',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateX(0)' : 'translateX(-8px)',
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function CategoriesShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const supabase = createClient();

  // Fetch categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name, slug, icon, color, post_count')
        .eq('is_featured', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        setCategories(data);
      }
    };

    fetchCategories();
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

      // Staggered card reveal
      const cards = cardsRef.current?.querySelectorAll('.category-card');
      if (cards) {
        gsap.from(cards, {
          y: 60,
          opacity: 0,
          scale: 0.9,
          rotateY: -10,
          duration: 0.7,
          stagger: {
            each: 0.08,
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
      className="py-24 px-4 md:px-8"
      style={{ 
        background: 'linear-gradient(180deg, var(--background) 0%, rgba(1, 60, 35, 0.5) 50%, var(--background) 100%)' 
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div ref={headingRef} className="text-center mb-16">
          <p 
            className="text-sm uppercase tracking-[0.3em] mb-3"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
          >
            Browse Topics
          </p>
          <h2
            className="text-3xl md:text-5xl"
            style={{ 
              fontFamily: 'var(--font-display)',
              color: 'var(--primary)',
            }}
          >
            Explore By Category
          </h2>
          <p 
            className="mt-4 text-lg max-w-lg mx-auto" 
            style={{ 
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)', 
              opacity: 0.7 
            }}
          >
            Find content that matters to you, written by people who live it
          </p>
        </div>

        {/* Grid */}
        <div
          ref={cardsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          style={{ perspective: '1500px' }}
        >
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>

        {/* View all link */}
        <div className="text-center mt-12">
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-[var(--primary)]"
            style={{ 
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)', 
              opacity: 0.7,
            }}
          >
            View all categories
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
