/**
 * Search Service
 * Provides abstraction for full-text search
 */

import { PostgresSearch } from './postgres';

export interface SearchQuery {
  query: string;
  filters?: {
    category?: string;
    author?: string;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    tags?: string[];
  };
  pagination?: {
    limit?: number;
    offset?: number;
  };
  sort?: {
    field: 'relevance' | 'date' | 'popularity';
    direction: 'asc' | 'desc';
  };
  highlight?: boolean;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  facets?: {
    categories: Array<{ name: string; count: number }>;
    authors: Array<{ name: string; count: number }>;
    dates: Array<{ period: string; count: number }>;
  };
  suggestions?: string[];
  executionTimeMs: number;
}

export interface SearchDocument {
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
  publishedAt?: Date;
  score?: number;
  highlights?: {
    title?: string;
    content?: string;
  };
}

/**
 * Search Service class
 */
class SearchService {
  private provider: PostgresSearch;

  constructor() {
    this.provider = new PostgresSearch();
  }

  /**
   * Search posts
   */
  async searchPosts(query: SearchQuery): Promise<SearchResult<SearchDocument>> {
    const startTime = Date.now();
    
    const result = await this.provider.searchPosts(query);
    
    return {
      ...result,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Search all content types
   */
  async search(query: SearchQuery): Promise<SearchResult<SearchDocument>> {
    const startTime = Date.now();
    
    const result = await this.provider.search(query);
    
    return {
      ...result,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    return this.provider.getSuggestions(query, limit);
  }

  /**
   * Index a document for search
   */
  async indexDocument(doc: Omit<SearchDocument, 'score' | 'highlights'>): Promise<void> {
    await this.provider.indexDocument(doc);
  }

  /**
   * Remove a document from search index
   */
  async removeDocument(id: string, type: SearchDocument['type']): Promise<void> {
    await this.provider.removeDocument(id, type);
  }

  /**
   * Reindex all documents
   */
  async reindexAll(): Promise<{ indexed: number; errors: number }> {
    return this.provider.reindexAll();
  }
}

// Singleton instance
let searchService: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!searchService) {
    searchService = new SearchService();
  }
  return searchService;
}

export { SearchService };
export default getSearchService;
