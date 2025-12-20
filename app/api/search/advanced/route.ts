/**
 * Advanced Search API
 * Full-text search with filters, facets, and suggestions
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSearchService, type SearchQuery } from '@/lib/search';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';

// Validation schema for advanced search
const advancedSearchSchema = z.object({
  q: z.string().min(1).max(200),
  category: z.string().optional(),
  author: z.string().optional(),
  tags: z
    .array(z.string())
    .or(z.string().transform((s) => s.split(',')))
    .optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.enum(['relevance', 'date', 'popularity']).optional().default('relevance'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  highlight: z.coerce.boolean().optional().default(true),
  facets: z.coerce.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate parameters
    const rawParams: Record<string, string | string[]> = {};
    searchParams.forEach((value, key) => {
      if (key === 'tags') {
        const existing = rawParams[key];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else if (existing) {
          rawParams[key] = [existing, value];
        } else {
          rawParams[key] = value;
        }
      } else {
        rawParams[key] = value;
      }
    });

    const parseResult = advancedSearchSchema.safeParse(rawParams);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid search parameters', 'VALIDATION_ERROR', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const params = parseResult.data;
    const offset = (params.page - 1) * params.limit;

    // Build search query
    const searchQuery: SearchQuery = {
      query: params.q,
      filters: {
        category: params.category,
        author: params.author,
        tags: params.tags,
        dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
        dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      },
      pagination: {
        limit: params.limit,
        offset,
      },
      sort: {
        field: params.sort,
        direction: params.sortDir,
      },
      highlight: params.highlight,
    };

    // Execute search
    const searchService = getSearchService();
    const result = await searchService.search(searchQuery);

    // Build response
    const response = {
      query: params.q,
      results: result.items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / params.limit),
        hasMore: offset + result.items.length < result.total,
      },
      meta: {
        executionTimeMs: result.executionTimeMs,
        sort: params.sort,
        sortDirection: params.sortDir,
      },
      facets: params.facets ? result.facets : undefined,
      suggestions: result.suggestions,
    };

    logger.info('Advanced search executed', {
      query: params.q,
      resultsCount: result.items.length,
      totalResults: result.total,
      executionTimeMs: result.executionTimeMs,
    });

    return applySecurityHeaders(success(response));
  } catch (err) {
    logger.error('Advanced search error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Search failed', 'INTERNAL_ERROR', 500));
  }
}

/**
 * POST endpoint for complex search queries
 * Allows body-based queries for more complex filters
 */
const postSearchSchema = z.object({
  query: z.string().min(1).max(200),
  filters: z
    .object({
      categories: z.array(z.string()).optional(),
      authors: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      contentTypes: z.array(z.enum(['article', 'video', 'audio', 'gallery'])).optional(),
      dateRange: z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        })
        .optional(),
      hasMedia: z.boolean().optional(),
      minReactions: z.number().int().nonnegative().optional(),
      minViews: z.number().int().nonnegative().optional(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().int().positive().optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
    })
    .optional(),
  sort: z
    .object({
      field: z
        .enum(['relevance', 'date', 'popularity', 'reactions', 'views'])
        .optional()
        .default('relevance'),
      direction: z.enum(['asc', 'desc']).optional().default('desc'),
    })
    .optional(),
  options: z
    .object({
      highlight: z.boolean().optional().default(true),
      includeFacets: z.boolean().optional().default(false),
      includeSuggestions: z.boolean().optional().default(true),
      snippetLength: z.number().int().min(50).max(500).optional().default(200),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = postSearchSchema.safeParse(body);

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid search request', 'VALIDATION_ERROR', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const params = parseResult.data;
    const page = params.pagination?.page ?? 1;
    const limit = params.pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build search query from POST body
    const searchQuery: SearchQuery = {
      query: params.query,
      filters: {
        category: params.filters?.categories?.[0], // For now, support single category
        author: params.filters?.authors?.[0], // For now, support single author
        tags: params.filters?.tags,
        dateFrom: params.filters?.dateRange?.from
          ? new Date(params.filters.dateRange.from)
          : undefined,
        dateTo: params.filters?.dateRange?.to ? new Date(params.filters.dateRange.to) : undefined,
      },
      pagination: {
        limit,
        offset,
      },
      sort: {
        field:
          params.sort?.field === 'reactions' || params.sort?.field === 'views'
            ? 'popularity'
            : (params.sort?.field ?? 'relevance'),
        direction: params.sort?.direction ?? 'desc',
      },
      highlight: params.options?.highlight ?? true,
    };

    // Execute search
    const searchService = getSearchService();
    const result = await searchService.search(searchQuery);

    // Build response
    const response = {
      query: params.query,
      results: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasMore: offset + result.items.length < result.total,
      },
      meta: {
        executionTimeMs: result.executionTimeMs,
        appliedFilters: params.filters || {},
        sort: params.sort || { field: 'relevance', direction: 'desc' },
      },
      facets: params.options?.includeFacets ? result.facets : undefined,
      suggestions: params.options?.includeSuggestions ? result.suggestions : undefined,
    };

    logger.info('Advanced search (POST) executed', {
      query: params.query,
      resultsCount: result.items.length,
      totalResults: result.total,
      executionTimeMs: result.executionTimeMs,
    });

    return applySecurityHeaders(success(response));
  } catch (err) {
    if (err instanceof SyntaxError) {
      return applySecurityHeaders(apiError('Invalid JSON in request body', 'PARSE_ERROR', 400));
    }

    logger.error(
      'Advanced search (POST) error',
      err instanceof Error ? err : new Error(String(err))
    );
    return applySecurityHeaders(apiError('Search failed', 'INTERNAL_ERROR', 500));
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
