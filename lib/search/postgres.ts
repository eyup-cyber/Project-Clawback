/**
 * PostgreSQL Full-Text Search Implementation
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { SearchDocument, SearchQuery, SearchResult } from './index';

export class PostgresSearch {
  /**
   * Search posts using PostgreSQL full-text search
   */
  async searchPosts(query: SearchQuery): Promise<SearchResult<SearchDocument>> {
    const startTime = performance.now();
    const supabase = await createServiceClient();
    const { limit = 20, offset = 0 } = query.pagination || {};

    // Build the search query
    const searchTerms = query.query
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .map((t) => `${t}:*`)
      .join(' & ');

    let queryBuilder = supabase
      .from('posts')
      .select(
        `
        id,
        title,
        slug,
        excerpt,
        content_text,
        featured_image,
        published_at,
        category:categories(name, slug),
        author:profiles!author_id(display_name, username, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('status', 'published')
      .textSearch('search_vector', searchTerms, {
        config: 'english',
        type: 'websearch',
      });

    // Apply filters
    if (query.filters?.category) {
      queryBuilder = queryBuilder.eq('category_id', query.filters.category);
    }
    if (query.filters?.author) {
      queryBuilder = queryBuilder.eq('author_id', query.filters.author);
    }
    if (query.filters?.dateFrom) {
      queryBuilder = queryBuilder.gte('published_at', query.filters.dateFrom.toISOString());
    }
    if (query.filters?.dateTo) {
      queryBuilder = queryBuilder.lte('published_at', query.filters.dateTo.toISOString());
    }

    // Apply sorting
    const sortField = query.sort?.field || 'relevance';
    const sortDir = query.sort?.direction || 'desc';

    if (sortField === 'date') {
      queryBuilder = queryBuilder.order('published_at', {
        ascending: sortDir === 'asc',
      });
    } else {
      queryBuilder = queryBuilder.order('published_at', { ascending: false });
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Search error:', error);
      return {
        items: [],
        total: 0,
        executionTimeMs: performance.now() - startTime,
      };
    }

    // Transform results
    const items: SearchDocument[] = (data || []).map((post) => ({
      id: post.id,
      type: 'post' as const,
      title: post.title,
      content: post.content_text || '',
      excerpt: post.excerpt || undefined,
      url: `/posts/${post.slug}`,
      imageUrl: post.featured_image || undefined,
      author:
        (post.author as { display_name?: string; username?: string })?.display_name ||
        (post.author as { display_name?: string; username?: string })?.username,
      category: (post.category as { name?: string })?.name,
      publishedAt: post.published_at ? new Date(post.published_at) : undefined,
      highlights: query.highlight ? this.generateHighlights(post, query.query) : undefined,
    }));

    return {
      items,
      total: count || 0,
      executionTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Search all content types
   */
  async search(query: SearchQuery): Promise<SearchResult<SearchDocument>> {
    // For now, just search posts
    // In the future, this could search multiple content types
    return this.searchPosts(query);
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (query.length < 2) return [];

    const supabase = await createServiceClient();

    // Search for matching titles
    const { data } = await supabase
      .from('posts')
      .select('title')
      .eq('status', 'published')
      .ilike('title', `%${query}%`)
      .limit(limit);

    return (data || []).map((p) => p.title);
  }

  /**
   * Index a document (update search vector)
   */
  async indexDocument(doc: Omit<SearchDocument, 'score' | 'highlights'>): Promise<void> {
    // PostgreSQL handles this automatically via trigger
    // This is a no-op for the PostgreSQL implementation
    console.log(`Indexing document ${doc.id} of type ${doc.type}`);
  }

  /**
   * Remove document from index
   */
  async removeDocument(id: string, type: SearchDocument['type']): Promise<void> {
    // PostgreSQL handles this automatically when the row is deleted
    console.log(`Removing document ${id} of type ${type} from index`);
  }

  /**
   * Reindex all documents
   */
  async reindexAll(): Promise<{ indexed: number; errors: number }> {
    const supabase = await createServiceClient();

    // Trigger reindex by updating the search_vector column
    const { data, error } = await supabase.rpc('reindex_search_vectors');

    if (error) {
      console.error('Reindex error:', error);
      return { indexed: 0, errors: 1 };
    }

    return { indexed: data?.count || 0, errors: 0 };
  }

  /**
   * Generate highlighted snippets
   */
  private generateHighlights(
    post: { title: string; content_text?: string; excerpt?: string },
    query: string
  ): { title?: string; content?: string } {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    const highlights: { title?: string; content?: string } = {};

    // Highlight title
    let highlightedTitle = post.title;
    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedTitle = highlightedTitle.replace(regex, '<mark>$1</mark>');
    }
    if (highlightedTitle !== post.title) {
      highlights.title = highlightedTitle;
    }

    // Highlight content/excerpt
    const text = post.excerpt || post.content_text || '';
    if (text) {
      // Find snippet around first match
      for (const term of terms) {
        const index = text.toLowerCase().indexOf(term);
        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(text.length, index + term.length + 100);
          let snippet = text.slice(start, end);

          if (start > 0) snippet = '...' + snippet;
          if (end < text.length) snippet = snippet + '...';

          // Highlight terms in snippet
          for (const t of terms) {
            const regex = new RegExp(`(${t})`, 'gi');
            snippet = snippet.replace(regex, '<mark>$1</mark>');
          }

          highlights.content = snippet;
          break;
        }
      }
    }

    return highlights;
  }
}
