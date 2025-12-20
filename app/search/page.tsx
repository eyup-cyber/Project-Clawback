'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import gsap from 'gsap';
import Nav from '@/app/components/Nav';
import Footer from '@/app/components/layout/Footer';
import { getContentTypeIcon, formatRelativeTime } from '@/lib/utils';
import debounce from 'lodash.debounce';

interface SearchResult {
  id: string;
  type: 'post' | 'author' | 'page';
  title: string;
  content: string;
  excerpt?: string;
  url: string;
  imageUrl?: string;
  author?: string;
  category?: string;
  tags?: string[];
  publishedAt?: string;
  score?: number;
  highlights?: {
    title?: string;
    content?: string;
  };
}

interface SearchFilters {
  category: string;
  contentType: string;
  dateRange: string;
  sortBy: string;
}

const CONTENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'article', label: 'Articles' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'gallery', label: 'Galleries' },
];

const DATE_RANGES = [
  { value: '', label: 'Any Time' },
  { value: 'day', label: 'Past 24 Hours' },
  { value: 'week', label: 'Past Week' },
  { value: 'month', label: 'Past Month' },
  { value: 'year', label: 'Past Year' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'date', label: 'Most Recent' },
  { value: 'popularity', label: 'Most Popular' },
];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [executionTime, setExecutionTime] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({
    category: searchParams.get('category') || '',
    contentType: searchParams.get('type') || '',
    dateRange: searchParams.get('date') || '',
    sortBy: searchParams.get('sort') || 'relevance',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.data || []);
        }
      } catch {
        // Categories are optional
      }
    };
    void fetchCategories();
  }, []);

  // Animation on mount
  useEffect(() => {
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

  // Search when initial query is present or when filters change
  useEffect(() => {
    if (initialQuery) {
      void performSearch(initialQuery, 1);
    }
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced suggestion fetcher
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchSuggestions = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.data?.suggestions || []);
        }
      } catch {
        // Suggestions are optional
      }
    }, 200),
    []
  );

  // Update suggestions as user types
  useEffect(() => {
    if (query.length >= 2) {
      void fetchSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query, fetchSuggestions]);

  const performSearch = async (searchQuery: string, pageNum: number) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setShowSuggestions(false);

    try {
      // Build query params
      const params = new URLSearchParams({
        q: searchQuery,
        page: String(pageNum),
        limit: String(limit),
        sort: filters.sortBy,
      });

      if (filters.category) params.set('category', filters.category);
      if (filters.contentType) params.set('type', filters.contentType);

      // Calculate date range
      if (filters.dateRange) {
        const now = new Date();
        let dateFrom: Date | undefined;
        switch (filters.dateRange) {
          case 'day':
            dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }
        if (dateFrom) params.set('dateFrom', dateFrom.toISOString());
      }

      const res = await fetch(`/api/search/advanced?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setResults(data.data?.results || []);
        setTotal(data.data?.pagination?.total || 0);
        setExecutionTime(data.data?.meta?.executionTimeMs || 0);
        setPage(pageNum);
      } else {
        // Fallback to basic search
        const basicRes = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=${limit}`
        );
        if (basicRes.ok) {
          const basicData = await basicRes.json();
          // Transform basic results to SearchResult format
          const transformedResults = (basicData.data?.results || []).map(
            (r: Record<string, unknown>) => ({
              id: r.id,
              type: 'post' as const,
              title: r.title,
              content: r.excerpt || '',
              excerpt: r.excerpt,
              url: `/articles/${r.slug}`,
              imageUrl: r.featured_image_url,
              author:
                (r.author as Record<string, string>)?.display_name ||
                (r.author as Record<string, string>)?.username,
              category: (r.category as Record<string, string>)?.name,
              publishedAt: r.published_at as string,
            })
          );
          setResults(transformedResults);
          setTotal(basicData.data?.pagination?.total || 0);
        }
      }

      // Update URL
      const urlParams = new URLSearchParams();
      urlParams.set('q', searchQuery);
      if (filters.category) urlParams.set('category', filters.category);
      if (filters.contentType) urlParams.set('type', filters.contentType);
      if (filters.dateRange) urlParams.set('date', filters.dateRange);
      if (filters.sortBy !== 'relevance') urlParams.set('sort', filters.sortBy);
      router.push(`/search?${urlParams.toString()}`, { scroll: false });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void performSearch(query, 1);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Remove @ or # prefix for search
    const cleanSuggestion = suggestion.replace(/^[@#]/, '');
    setQuery(cleanSuggestion);
    setShowSuggestions(false);
    void performSearch(cleanSuggestion, 1);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (query.trim()) {
      void performSearch(query, 1);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      contentType: '',
      dateRange: '',
      sortBy: 'relevance',
    });
    if (query.trim()) {
      void performSearch(query, 1);
    }
  };

  const hasActiveFilters =
    filters.category || filters.contentType || filters.dateRange || filters.sortBy !== 'relevance';

  const totalPages = Math.ceil(total / limit);

  // Highlight matched text
  const highlightText = (text: string, highlight?: string) => {
    if (!highlight) return text;
    // Remove HTML tags from highlight and use the plain content
    const plainHighlight = highlight.replace(/<[^>]*>/g, '');
    return plainHighlight || text;
  };

  return (
    <>
      <Nav />
      <main
        ref={containerRef}
        className="min-h-screen pt-24 pb-16 px-4 md:px-8"
        style={{ background: 'var(--background)' }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Search form */}
          <div className="search-container mb-8">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative" ref={suggestionsRef}>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search articles, videos, audio, art..."
                  className="w-full px-6 py-5 pr-14 rounded-xl border text-xl outline-none transition-all focus:ring-2"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                  aria-label="Search"
                  aria-autocomplete="list"
                  aria-controls="search-suggestions"
                />

                {/* Search button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all"
                  style={{ background: 'var(--primary)', color: '#000' }}
                  aria-label="Search"
                >
                  {loading ? (
                    <div
                      className="w-6 h-6 border-2 rounded-full animate-spin"
                      style={{ borderColor: '#000', borderTopColor: 'transparent' }}
                    />
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                </button>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    id="search-suggestions"
                    className="absolute z-50 w-full mt-2 rounded-xl border shadow-lg overflow-hidden"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    role="listbox"
                  >
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-[var(--surface-elevated)] transition-colors flex items-center gap-3"
                        style={{ color: 'var(--foreground)' }}
                        role="option"
                        aria-selected="false"
                      >
                        {suggestion.startsWith('@') ? (
                          <span className="text-blue-500">👤</span>
                        ) : suggestion.startsWith('#') ? (
                          <span className="text-green-500">#</span>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="opacity-50"
                            aria-hidden="true"
                          >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        )}
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Filter toggle */}
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:bg-[var(--surface-elevated)]"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                  <circle cx="8" cy="6" r="2" fill="currentColor" />
                  <circle cx="16" cy="12" r="2" fill="currentColor" />
                  <circle cx="10" cy="18" r="2" fill="currentColor" />
                </svg>
                <span>Filters</span>
                {hasActiveFilters && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: 'var(--primary)', color: '#000' }}
                  >
                    Active
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div
                className="mt-4 p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                {/* Category filter */}
                <div>
                  <label
                    htmlFor="filter-category"
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--foreground)', opacity: 0.7 }}
                  >
                    Category
                  </label>
                  <select
                    id="filter-category"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={{
                      background: 'var(--background)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content type filter */}
                <div>
                  <label
                    htmlFor="filter-type"
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--foreground)', opacity: 0.7 }}
                  >
                    Content Type
                  </label>
                  <select
                    id="filter-type"
                    value={filters.contentType}
                    onChange={(e) => handleFilterChange('contentType', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={{
                      background: 'var(--background)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {CONTENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range filter */}
                <div>
                  <label
                    htmlFor="filter-date"
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--foreground)', opacity: 0.7 }}
                  >
                    Date
                  </label>
                  <select
                    id="filter-date"
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={{
                      background: 'var(--background)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {DATE_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort filter */}
                <div>
                  <label
                    htmlFor="filter-sort"
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--foreground)', opacity: 0.7 }}
                  >
                    Sort By
                  </label>
                  <select
                    id="filter-sort"
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={{
                      background: 'var(--background)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results header */}
          {query && total > 0 && (
            <div className="flex items-center justify-between mb-6">
              <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                {total.toLocaleString()} result{total !== 1 ? 's' : ''} for &quot;{query}&quot;
                {executionTime > 0 && (
                  <span className="ml-2 text-sm opacity-50">({executionTime}ms)</span>
                )}
              </p>
            </div>
          )}

          {/* Results */}
          {query && (
            <div>
              <div className="space-y-4">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={result.url || `/articles/${result.id}`}
                    className="block p-6 rounded-lg border transition-all hover:border-opacity-50 hover:shadow-lg"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-start gap-4">
                      {result.imageUrl && (
                        <img
                          src={result.imageUrl}
                          alt=""
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      {!result.imageUrl && (
                        <span className="text-3xl" aria-hidden="true">
                          {getContentTypeIcon(result.type === 'post' ? 'written' : result.type)}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-lg font-medium mb-1 hover:text-[var(--primary)] truncate"
                          style={{ color: 'var(--foreground)' }}
                          dangerouslySetInnerHTML={{
                            __html: highlightText(result.title, result.highlights?.title),
                          }}
                        />
                        <p
                          className="text-sm mb-2 line-clamp-2"
                          style={{ color: 'var(--foreground)', opacity: 0.7 }}
                          dangerouslySetInnerHTML={{
                            __html: highlightText(
                              result.excerpt || result.content?.substring(0, 200) || '',
                              result.highlights?.content
                            ),
                          }}
                        />
                        <div
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                          style={{ color: 'var(--foreground)', opacity: 0.5 }}
                        >
                          {result.author && <span>{result.author}</span>}
                          {result.category && <span>{result.category}</span>}
                          {result.publishedAt && (
                            <span>{formatRelativeTime(result.publishedAt)}</span>
                          )}
                          {result.score !== undefined && result.score > 0 && (
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ background: 'var(--primary)', color: '#000', opacity: 0.7 }}
                            >
                              {Math.round(result.score * 100)}% match
                            </span>
                          )}
                        </div>
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {result.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded text-xs"
                                style={{
                                  background: 'var(--surface-elevated)',
                                  color: 'var(--foreground)',
                                  opacity: 0.7,
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    type="button"
                    onClick={() => void performSearch(query, page - 1)}
                    disabled={page === 1 || loading}
                    className="px-4 py-2 rounded-lg border transition-all disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    Previous
                  </button>
                  <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => void performSearch(query, page + 1)}
                    disabled={page === totalPages || loading}
                    className="px-4 py-2 rounded-lg border transition-all disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    Next
                  </button>
                </div>
              )}

              {/* No results */}
              {results.length === 0 && !loading && (
                <div className="text-center py-16">
                  <p className="text-xl mb-4" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                    No results found for &quot;{query}&quot;
                  </p>
                  <p className="mb-4" style={{ color: 'var(--foreground)', opacity: 0.4 }}>
                    Try different keywords or adjust your filters
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-4 py-2 rounded-lg transition-all"
                      style={{ background: 'var(--primary)', color: '#000' }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!query && (
            <div className="text-center py-16">
              <div className="text-6xl mb-6">🔍</div>
              <p className="text-xl mb-4" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                Search for articles, videos, podcasts, and art
              </p>
              <p style={{ color: 'var(--foreground)', opacity: 0.4 }}>
                Type in the search box above to get started
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                <span className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Popular searches:
                </span>
                {['housing', 'benefits', 'mental health', 'food banks'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      void performSearch(term, 1);
                    }}
                    className="px-3 py-1 rounded-full text-sm border transition-all hover:bg-[var(--surface-elevated)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
