'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import Nav from '@/app/components/Nav';
import Footer from '@/app/components/layout/Footer';
import { getContentTypeIcon, formatRelativeTime } from '@/lib/utils';

// Mock search results
const mockResults = [
  {
    id: '1',
    title: 'The Housing Crisis: A View From the Queue',
    slug: 'housing-crisis-view-from-queue',
    excerpt: 'After three years on the housing waiting list...',
    content_type: 'written' as const,
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author_name: 'Sarah M.',
    category_name: 'Housing',
  },
  {
    id: '2',
    title: 'Universal Credit: The Documentary',
    slug: 'universal-credit-documentary',
    excerpt: 'A 20-minute deep dive into the system...',
    content_type: 'video' as const,
    published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    author_name: 'Mike T.',
    category_name: 'Benefits',
  },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(mockResults);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();

    const ctx = gsap.context(() => {
      gsap.from('.search-container', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setResults(mockResults.filter(r => 
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.excerpt.toLowerCase().includes(query.toLowerCase())
    ));
    setLoading(false);
  };

  return (
    <>
      <Nav />
      <main
        ref={containerRef}
        className="min-h-screen pt-24 pb-16 px-4 md:px-8"
        style={{ background: 'var(--background)' }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Search form */}
          <div className="search-container mb-12">
            <form onSubmit={handleSearch} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles, videos, audio, art..."
                className="w-full px-6 py-5 rounded-xl border text-xl outline-none transition-all focus:ring-2"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all"
                style={{ background: 'var(--primary)', color: '#000' }}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#000', borderTopColor: 'transparent' }} />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
              </button>
            </form>
          </div>

          {/* Results */}
          {query && (
            <div>
              <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                {results.length} results for &quot;{query}&quot;
              </p>

              <div className="space-y-4">
                {results.map(result => (
                  <Link
                    key={result.id}
                    href={`/articles/${result.slug}`}
                    className="block p-6 rounded-lg border transition-all hover:border-opacity-50"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{getContentTypeIcon(result.content_type)}</span>
                      <div className="flex-1">
                        <h3
                          className="text-lg font-medium mb-1 hover:text-[var(--primary)]"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {result.title}
                        </h3>
                        <p className="text-sm mb-2" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                          {result.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                          <span>{result.author_name}</span>
                          <span>{result.category_name}</span>
                          <span>{formatRelativeTime(result.published_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {results.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-xl mb-4" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                    No results found for &quot;{query}&quot;
                  </p>
                  <p style={{ color: 'var(--foreground)', opacity: 0.4 }}>
                    Try different keywords or browse our categories
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!query && (
            <div className="text-center py-16">
              <p className="text-xl mb-4" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                Search for articles, videos, podcasts, and art
              </p>
              <p style={{ color: 'var(--foreground)', opacity: 0.4 }}>
                Type in the search box above to get started
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}











