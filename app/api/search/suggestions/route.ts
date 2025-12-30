/**
 * Search Suggestions API
 * Provides autocomplete suggestions for search queries
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSearchService } from '@/lib/search';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';
import { cacheGet, cacheSet } from '@/lib/cache';

// Validation schema
const suggestionsSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
  type: z.enum(['all', 'posts', 'authors', 'tags']).optional().default('all'),
});

// Cache TTL for suggestions (5 minutes)
const SUGGESTIONS_CACHE_TTL = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parseResult = suggestionsSchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
    });

    if (!parseResult.success) {
      return applySecurityHeaders(
        apiError('Invalid parameters', 'VALIDATION_ERROR', {
          errors: parseResult.error.flatten().fieldErrors,
        })
      );
    }

    const { q: query, limit, type } = parseResult.data;
    const cacheKey = `suggestions:${type}:${query.toLowerCase()}:${limit}`;

    // Try cache first
    const cached = await cacheGet<string[]>('SEARCH', cacheKey);
    if (cached) {
      return applySecurityHeaders(
        success({
          query,
          suggestions: cached.data,
          type,
          cached: true,
        })
      );
    }

    const searchService = getSearchService();
    let suggestions: string[] = [];

    switch (type) {
      case 'posts':
        suggestions = await searchService.getSuggestions(query, limit);
        break;

      case 'authors':
        suggestions = await getAuthorSuggestions(query, limit);
        break;

      case 'tags':
        suggestions = await getTagSuggestions(query, limit);
        break;

      case 'all':
      default:
        // Combine suggestions from multiple sources
        const [postSuggestions, authorSuggestions, tagSuggestions] = await Promise.all([
          searchService.getSuggestions(query, Math.ceil(limit / 2)),
          getAuthorSuggestions(query, Math.ceil(limit / 4)),
          getTagSuggestions(query, Math.ceil(limit / 4)),
        ]);

        suggestions = [
          ...postSuggestions,
          ...authorSuggestions.map((a) => `@${a}`),
          ...tagSuggestions.map((t) => `#${t}`),
        ].slice(0, limit);
        break;
    }

    // Cache the results
    await cacheSet('SEARCH', cacheKey, suggestions, { ttl: SUGGESTIONS_CACHE_TTL });

    return applySecurityHeaders(
      success({
        query,
        suggestions,
        type,
        cached: false,
      })
    );
  } catch (err) {
    logger.error('Search suggestions error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Failed to get suggestions', 'INTERNAL_ERROR'));
  }
}

/**
 * Get author name suggestions
 */
async function getAuthorSuggestions(query: string, limit: number): Promise<string[]> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, username')
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .eq('role', 'contributor')
    .limit(limit);

  if (error) {
    logger.error('Author suggestions error', error);
    return [];
  }

  return data.map((p) => p.display_name || p.username).filter(Boolean);
}

/**
 * Get tag suggestions
 */
async function getTagSuggestions(query: string, limit: number): Promise<string[]> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = await createServiceClient();

  // First try to get tags from a tags table if it exists
  // Otherwise, extract unique tags from posts
  const { data, error } = await supabase
    .from('posts')
    .select('tags')
    .not('tags', 'is', null)
    .eq('status', 'published');

  if (error) {
    logger.error('Tag suggestions error', error);
    return [];
  }

  // Extract unique tags matching the query
  const allTags = new Set<string>();
  for (const post of data) {
    if (Array.isArray(post.tags)) {
      for (const tag of post.tags) {
        if (typeof tag === 'string' && tag.toLowerCase().includes(query.toLowerCase())) {
          allTags.add(tag);
        }
      }
    }
  }

  return Array.from(allTags).slice(0, limit);
}

/**
 * Record search suggestion click for analytics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { query, suggestion, type } = z
      .object({
        query: z.string(),
        suggestion: z.string(),
        type: z.enum(['post', 'author', 'tag']).optional(),
      })
      .parse(body);

    // Track suggestion click for analytics
    logger.info('Search suggestion clicked', { query, suggestion, type });

    // Could store this in analytics table for improving suggestions
    // For now, just acknowledge the click

    return applySecurityHeaders(success({ recorded: true }));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return applySecurityHeaders(apiError('Invalid request', 'VALIDATION_ERROR'));
    }
    return applySecurityHeaders(apiError('Failed to record click', 'INTERNAL_ERROR'));
  }
}
