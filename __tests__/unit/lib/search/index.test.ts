/**
 * Search Library Tests
 */

describe('Search Query Parser', () => {
  // Helper function to simulate query parsing
  const parseQuery = (query: string) => {
    const result = {
      terms: [] as string[],
      filters: {} as Record<string, string>,
      phrases: [] as string[],
      excludes: [] as string[],
    };

    // Extract quoted phrases
    const phraseMatches = query.match(/"([^"]+)"/g);
    if (phraseMatches) {
      result.phrases = phraseMatches.map((p) => p.replace(/"/g, ''));
      query = query.replace(/"[^"]+"/g, '');
    }

    // Extract filters (key:value)
    const filterMatches = query.match(/(\w+):(\w+)/g);
    if (filterMatches) {
      for (const match of filterMatches) {
        const [key, value] = match.split(':');
        result.filters[key] = value;
      }
      query = query.replace(/\w+:\w+/g, '');
    }

    // Extract excludes (-term)
    const excludeMatches = query.match(/-(\w+)/g);
    if (excludeMatches) {
      result.excludes = excludeMatches.map((e) => e.substring(1));
      query = query.replace(/-\w+/g, '');
    }

    // Remaining terms
    result.terms = query
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    return result;
  };

  it('should parse simple terms', () => {
    const result = parseQuery('hello world');
    expect(result.terms).toEqual(['hello', 'world']);
    expect(result.phrases).toEqual([]);
    expect(result.filters).toEqual({});
  });

  it('should parse quoted phrases', () => {
    const result = parseQuery('"hello world" test');
    expect(result.phrases).toContain('hello world');
    expect(result.terms).toContain('test');
  });

  it('should parse filters', () => {
    const result = parseQuery('search type:article author:john');
    expect(result.filters).toEqual({ type: 'article', author: 'john' });
    expect(result.terms).toContain('search');
  });

  it('should parse exclude terms', () => {
    const result = parseQuery('hello -world');
    expect(result.terms).toContain('hello');
    expect(result.excludes).toContain('world');
  });

  it('should parse complex queries', () => {
    const result = parseQuery('"exact phrase" type:video -spam keyword');
    expect(result.phrases).toContain('exact phrase');
    expect(result.filters).toEqual({ type: 'video' });
    expect(result.excludes).toContain('spam');
    expect(result.terms).toContain('keyword');
  });

  it('should handle empty query', () => {
    const result = parseQuery('');
    expect(result.terms).toEqual([]);
    expect(result.phrases).toEqual([]);
    expect(result.filters).toEqual({});
    expect(result.excludes).toEqual([]);
  });
});

describe('Search Result Ranking', () => {
  interface SearchResult {
    id: string;
    title: string;
    content: string;
    score: number;
  }

  // Simple TF-IDF-like scoring
  const calculateScore = (text: string, query: string, boost: number = 1): number => {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    let score = 0;
    for (const term of queryTerms) {
      // Count occurrences
      const regex = new RegExp(term, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        score += matches.length * boost;
      }
    }

    // Bonus for exact phrase match
    if (textLower.includes(queryLower)) {
      score *= 2;
    }

    // Penalty for long content (normalize)
    score = score / Math.log2(text.length + 1);

    return Math.round(score * 100) / 100;
  };

  it('should score exact matches higher', () => {
    const query = 'hello world';
    const exact = calculateScore('hello world', query);
    const partial = calculateScore('hello there', query);

    expect(exact).toBeGreaterThan(partial);
  });

  it('should apply title boost', () => {
    const query = 'test';
    const titleScore = calculateScore('test', query, 2);
    const contentScore = calculateScore('test', query, 1);

    expect(titleScore).toBeGreaterThan(contentScore);
  });

  it('should rank by relevance', () => {
    const results: SearchResult[] = [
      { id: '1', title: 'Hello', content: 'World content here', score: 0 },
      { id: '2', title: 'Hello World', content: 'Some content', score: 0 },
      { id: '3', title: 'Other', content: 'Hello world mentioned', score: 0 },
    ];

    const query = 'hello world';

    // Calculate scores
    for (const result of results) {
      result.score =
        calculateScore(result.title, query, 2) + calculateScore(result.content, query, 1);
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // The one with "Hello World" in title should rank highest
    expect(results[0].title).toBe('Hello World');
  });
});

describe('Search Filters', () => {
  interface FilterOptions {
    type?: string[];
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    tags?: string[];
    status?: string;
  }

  interface SearchItem {
    id: string;
    type: string;
    author: string;
    date: string;
    category: string;
    tags: string[];
    status: string;
  }

  const applyFilters = (items: SearchItem[], filters: FilterOptions): SearchItem[] => {
    return items.filter((item) => {
      if (filters.type && !filters.type.includes(item.type)) return false;
      if (filters.author && item.author !== filters.author) return false;
      if (filters.dateFrom && item.date < filters.dateFrom) return false;
      if (filters.dateTo && item.date > filters.dateTo) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.tags && !filters.tags.some((t) => item.tags.includes(t))) return false;
      if (filters.status && item.status !== filters.status) return false;
      return true;
    });
  };

  const items: SearchItem[] = [
    {
      id: '1',
      type: 'article',
      author: 'john',
      date: '2024-01-01',
      category: 'tech',
      tags: ['js', 'react'],
      status: 'published',
    },
    {
      id: '2',
      type: 'video',
      author: 'jane',
      date: '2024-02-01',
      category: 'art',
      tags: ['design'],
      status: 'published',
    },
    {
      id: '3',
      type: 'article',
      author: 'john',
      date: '2024-03-01',
      category: 'tech',
      tags: ['python'],
      status: 'draft',
    },
  ];

  it('should filter by type', () => {
    const result = applyFilters(items, { type: ['article'] });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.type === 'article')).toBe(true);
  });

  it('should filter by multiple types', () => {
    const result = applyFilters(items, { type: ['article', 'video'] });
    expect(result).toHaveLength(3);
  });

  it('should filter by author', () => {
    const result = applyFilters(items, { author: 'john' });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.author === 'john')).toBe(true);
  });

  it('should filter by date range', () => {
    const result = applyFilters(items, { dateFrom: '2024-02-01', dateTo: '2024-03-01' });
    expect(result).toHaveLength(2);
  });

  it('should filter by category', () => {
    const result = applyFilters(items, { category: 'tech' });
    expect(result).toHaveLength(2);
  });

  it('should filter by tags', () => {
    const result = applyFilters(items, { tags: ['react', 'design'] });
    expect(result).toHaveLength(2);
  });

  it('should filter by status', () => {
    const result = applyFilters(items, { status: 'published' });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === 'published')).toBe(true);
  });

  it('should combine multiple filters', () => {
    const result = applyFilters(items, {
      type: ['article'],
      author: 'john',
      status: 'published',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('Search Suggestions', () => {
  const getSuggestions = (
    query: string,
    dictionary: string[],
    maxResults: number = 5
  ): string[] => {
    if (!query) return [];

    const queryLower = query.toLowerCase();

    return dictionary
      .filter((term) => term.toLowerCase().startsWith(queryLower))
      .sort((a, b) => a.length - b.length)
      .slice(0, maxResults);
  };

  const dictionary = [
    'javascript',
    'java',
    'python',
    'typescript',
    'react',
    'reactjs',
    'react native',
    'angular',
    'vue',
    'nodejs',
  ];

  it('should return matching suggestions', () => {
    const suggestions = getSuggestions('java', dictionary);
    expect(suggestions).toContain('java');
    expect(suggestions).toContain('javascript');
  });

  it('should be case insensitive', () => {
    const suggestions = getSuggestions('REACT', dictionary);
    expect(suggestions).toContain('react');
    expect(suggestions).toContain('reactjs');
  });

  it('should limit results', () => {
    const suggestions = getSuggestions('r', dictionary, 2);
    expect(suggestions).toHaveLength(2);
  });

  it('should sort by length', () => {
    const suggestions = getSuggestions('react', dictionary);
    expect(suggestions[0]).toBe('react');
  });

  it('should return empty for no matches', () => {
    const suggestions = getSuggestions('xyz', dictionary);
    expect(suggestions).toHaveLength(0);
  });

  it('should return empty for empty query', () => {
    const suggestions = getSuggestions('', dictionary);
    expect(suggestions).toHaveLength(0);
  });
});

describe('Search Highlighting', () => {
  const highlight = (text: string, query: string, tag: string = 'mark'): string => {
    if (!query) return text;

    const terms = query.split(/\s+/).filter((t) => t.length > 0);
    let result = text;

    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      result = result.replace(regex, `<${tag}>$1</${tag}>`);
    }

    return result;
  };

  it('should highlight matching terms', () => {
    const result = highlight('Hello world', 'hello');
    expect(result).toBe('<mark>Hello</mark> world');
  });

  it('should highlight multiple terms', () => {
    const result = highlight('Hello beautiful world', 'hello world');
    expect(result).toBe('<mark>Hello</mark> beautiful <mark>world</mark>');
  });

  it('should be case insensitive', () => {
    const result = highlight('Hello WORLD', 'hello world');
    expect(result).toBe('<mark>Hello</mark> <mark>WORLD</mark>');
  });

  it('should use custom tag', () => {
    const result = highlight('Hello world', 'hello', 'strong');
    expect(result).toBe('<strong>Hello</strong> world');
  });

  it('should handle no matches', () => {
    const result = highlight('Hello world', 'xyz');
    expect(result).toBe('Hello world');
  });

  it('should handle empty query', () => {
    const result = highlight('Hello world', '');
    expect(result).toBe('Hello world');
  });
});

describe('Search Pagination', () => {
  const paginate = <T>(
    items: T[],
    page: number,
    pageSize: number
  ): { items: T[]; total: number; page: number; totalPages: number } => {
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: items.slice(start, end),
      total,
      page,
      totalPages,
    };
  };

  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

  it('should return correct page', () => {
    const result = paginate(items, 1, 10);
    expect(result.items).toHaveLength(10);
    expect(result.items[0].id).toBe(1);
  });

  it('should calculate total pages', () => {
    const result = paginate(items, 1, 10);
    expect(result.totalPages).toBe(3);
  });

  it('should handle last page with fewer items', () => {
    const result = paginate(items, 3, 10);
    expect(result.items).toHaveLength(5);
    expect(result.items[0].id).toBe(21);
  });

  it('should return empty for out of range page', () => {
    const result = paginate(items, 10, 10);
    expect(result.items).toHaveLength(0);
  });

  it('should include total count', () => {
    const result = paginate(items, 1, 10);
    expect(result.total).toBe(25);
  });
});
