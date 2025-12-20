/**
 * Full-Text Search Database Functions
 * Phase 18: PostgreSQL FTS, suggestions, filters
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchResult {
  id: string;
  type: 'post' | 'user' | 'category' | 'tag';
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  relevance: number;
  highlights: string[];
  metadata: Record<string, unknown>;
}

export interface PostSearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string;
  reading_time: number;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
  tags: string[];
  relevance: number;
  headline: string;
}

export interface SearchFilters {
  categorySlug?: string;
  authorUsername?: string;
  tags?: string[];
  contentType?: 'article' | 'video' | 'podcast' | 'gallery';
  dateFrom?: string;
  dateTo?: string;
  minReadingTime?: number;
  maxReadingTime?: number;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'autocomplete';
  count?: number;
}

export interface TrendingTopic {
  term: string;
  count: number;
  change: number; // Percentage change from previous period
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search posts using PostgreSQL full-text search
 */
export async function searchPosts(options: SearchOptions): Promise<{
  results: PostSearchResult[];
  total: number;
  page: number;
  totalPages: number;
  suggestions: string[];
}> {
  const {
    query,
    filters = {},
    page = 1,
    limit = 20,
    sortBy = 'relevance',
    sortOrder = 'desc',
  } = options;

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  // Build the search query
  const searchQuery = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 1)
    .map((term) => `${term}:*`) // Prefix matching
    .join(' & ');

  if (!searchQuery) {
    return {
      results: [],
      total: 0,
      page,
      totalPages: 0,
      suggestions: [],
    };
  }

  try {
    // Build the query with full-text search
    const queryBuilder = supabase.rpc('search_posts', {
      search_query: searchQuery,
      p_limit: limit,
      p_offset: offset,
      p_category_slug: filters.categorySlug || null,
      p_author_username: filters.authorUsername || null,
      p_content_type: filters.contentType || null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      p_min_reading_time: filters.minReadingTime || null,
      p_max_reading_time: filters.maxReadingTime || null,
      p_tags: filters.tags && filters.tags.length > 0 ? filters.tags : null,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
    });

    const { data, error } = await queryBuilder;

    if (error) {
      // Fallback to simple search if RPC doesn't exist
      logger.warn('[Search] RPC not available, using fallback', error);
      return fallbackSearch(options);
    }

    // Get total count
    const { count: total } = await supabase.rpc('search_posts_count', {
      search_query: searchQuery,
      p_category_slug: filters.categorySlug || null,
      p_author_username: filters.authorUsername || null,
      p_content_type: filters.contentType || null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      p_min_reading_time: filters.minReadingTime || null,
      p_max_reading_time: filters.maxReadingTime || null,
      p_tags: filters.tags && filters.tags.length > 0 ? filters.tags : null,
    });

    const totalCount = total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get search suggestions
    const suggestions = await getSearchSuggestions(query, 5);

    return {
      results: data || [],
      total: totalCount,
      page,
      totalPages,
      suggestions: suggestions.map((s) => s.text),
    };
  } catch (error) {
    logger.error('[Search] Search failed', error);
    return fallbackSearch(options);
  }
}

/**
 * Fallback search using ILIKE
 */
async function fallbackSearch(options: SearchOptions): Promise<{
  results: PostSearchResult[];
  total: number;
  page: number;
  totalPages: number;
  suggestions: string[];
}> {
  const {
    query,
    filters = {},
    page = 1,
    limit = 20,
    sortBy = 'relevance',
    sortOrder = 'desc',
  } = options;

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      featured_image_url,
      published_at,
      reading_time,
      content_type,
      tags,
      author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url),
      category:categories(id, name, slug, color)
    `,
      { count: 'exact' }
    )
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`);

  // Apply filters
  if (filters.categorySlug) {
    queryBuilder = queryBuilder.eq('category.slug', filters.categorySlug);
  }
  if (filters.authorUsername) {
    queryBuilder = queryBuilder.eq('author.username', filters.authorUsername);
  }
  if (filters.contentType) {
    queryBuilder = queryBuilder.eq('content_type', filters.contentType);
  }
  if (filters.dateFrom) {
    queryBuilder = queryBuilder.gte('published_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    queryBuilder = queryBuilder.lte('published_at', filters.dateTo);
  }
  if (filters.minReadingTime) {
    queryBuilder = queryBuilder.gte('reading_time', filters.minReadingTime);
  }
  if (filters.maxReadingTime) {
    queryBuilder = queryBuilder.lte('reading_time', filters.maxReadingTime);
  }

  // Apply sorting
  if (sortBy === 'date') {
    queryBuilder = queryBuilder.order('published_at', { ascending: sortOrder === 'asc' });
  } else if (sortBy === 'popularity') {
    queryBuilder = queryBuilder.order('view_count', { ascending: sortOrder === 'asc' });
  } else {
    queryBuilder = queryBuilder.order('published_at', { ascending: false });
  }

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, count, error } = await queryBuilder;

  if (error) {
    logger.error('[Search] Fallback search failed', error);
    throw error;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    results: (data || []).map((post) => ({
      ...post,
      relevance: 1,
      headline: post.excerpt || '',
    })) as PostSearchResult[],
    total,
    page,
    totalPages,
    suggestions: [],
  };
}

/**
 * Get search suggestions based on query
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 10
): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const supabase = await createClient();
  const suggestions: SearchSuggestion[] = [];

  try {
    // Get matching post titles
    const { data: posts } = await supabase
      .from('posts')
      .select('title')
      .eq('status', 'published')
      .ilike('title', `%${query}%`)
      .order('view_count', { ascending: false })
      .limit(5);

    if (posts) {
      suggestions.push(
        ...posts.map((p) => ({
          text: p.title,
          type: 'autocomplete' as const,
        }))
      );
    }

    // Get matching tags
    const { data: tagPosts } = await supabase
      .from('posts')
      .select('tags')
      .eq('status', 'published')
      .contains('tags', [query])
      .limit(10);

    if (tagPosts) {
      const tagCounts = new Map<string, number>();
      tagPosts.forEach((p) => {
        ((p.tags as string[]) || []).forEach((tag: string) => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        });
      });

      const tagSuggestions = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag, count]) => ({
          text: `#${tag}`,
          type: 'autocomplete' as const,
          count,
        }));

      suggestions.push(...tagSuggestions);
    }

    // Get matching categories
    const { data: categories } = await supabase
      .from('categories')
      .select('name')
      .ilike('name', `%${query}%`)
      .limit(3);

    if (categories) {
      suggestions.push(
        ...categories.map((c) => ({
          text: c.name,
          type: 'autocomplete' as const,
        }))
      );
    }

    return suggestions.slice(0, limit);
  } catch (error) {
    logger.error('[Search] Failed to get suggestions', error);
    return [];
  }
}

/**
 * Get popular search terms
 */
export async function getPopularSearches(limit: number = 10): Promise<SearchSuggestion[]> {
  const supabase = await createClient();

  try {
    const { data } = await supabase
      .from('search_history')
      .select('query, count')
      .order('count', { ascending: false })
      .limit(limit);

    return (data || []).map((s) => ({
      text: s.query,
      type: 'popular' as const,
      count: s.count,
    }));
  } catch {
    // Table might not exist yet
    return [];
  }
}

/**
 * Get trending topics
 */
export async function getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
  const supabase = await createClient();

  try {
    // Get tags from posts published in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentPosts } = await supabase
      .from('posts')
      .select('tags')
      .eq('status', 'published')
      .gte('published_at', weekAgo);

    const { data: olderPosts } = await supabase
      .from('posts')
      .select('tags')
      .eq('status', 'published')
      .gte('published_at', twoWeeksAgo)
      .lt('published_at', weekAgo);

    // Count tag occurrences
    const recentTagCounts = new Map<string, number>();
    (recentPosts || []).forEach((p) => {
      ((p.tags as string[]) || []).forEach((tag: string) => {
        recentTagCounts.set(tag, (recentTagCounts.get(tag) || 0) + 1);
      });
    });

    const olderTagCounts = new Map<string, number>();
    (olderPosts || []).forEach((p) => {
      ((p.tags as string[]) || []).forEach((tag: string) => {
        olderTagCounts.set(tag, (olderTagCounts.get(tag) || 0) + 1);
      });
    });

    // Calculate trending (most growth)
    const trending: TrendingTopic[] = [];
    for (const [tag, count] of recentTagCounts) {
      const oldCount = olderTagCounts.get(tag) || 0;
      const change = oldCount > 0 ? ((count - oldCount) / oldCount) * 100 : 100;
      trending.push({ term: tag, count, change });
    }

    return trending.sort((a, b) => b.change - a.change).slice(0, limit);
  } catch (error) {
    logger.error('[Search] Failed to get trending topics', error);
    return [];
  }
}

/**
 * Log a search query for analytics
 */
export async function logSearch(query: string, userId?: string): Promise<void> {
  const supabase = await createClient();

  try {
    await supabase.rpc('log_search_query', {
      p_query: query.toLowerCase().trim(),
      p_user_id: userId || null,
    });
  } catch {
    // Ignore errors - this is non-critical
  }
}

/**
 * Get related content based on a post
 */
export async function getRelatedContent(
  postId: string,
  limit: number = 5
): Promise<PostSearchResult[]> {
  const supabase = await createClient();

  try {
    // Get the current post's tags and category
    const { data: post } = await supabase
      .from('posts')
      .select('tags, category_id')
      .eq('id', postId)
      .single();

    if (!post) return [];

    const tags = (post.tags as string[]) || [];
    const categoryId = post.category_id;

    // Find posts with similar tags or same category
    let query = supabase
      .from('posts')
      .select(
        `
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        published_at,
        reading_time,
        tags,
        author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url),
        category:categories(id, name, slug, color)
      `
      )
      .eq('status', 'published')
      .neq('id', postId)
      .order('published_at', { ascending: false });

    // Filter by category or tags
    if (tags.length > 0) {
      query = query.overlaps('tags', tags);
    } else if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data } = await query.limit(limit);

    return (data || []).map((p) => ({
      ...p,
      relevance: 1,
      headline: p.excerpt || '',
    })) as PostSearchResult[];
  } catch (error) {
    logger.error('[Search] Failed to get related content', error);
    return [];
  }
}

const searchDb = {
  searchPosts,
  getSearchSuggestions,
  getPopularSearches,
  getTrendingTopics,
  logSearch,
  getRelatedContent,
};
export default searchDb;
