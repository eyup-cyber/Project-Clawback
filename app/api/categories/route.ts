export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, ApiError } from '@/lib/api';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { logger } from '@/lib/logger';

/**
 * GET /api/categories
 * List all categories with post counts
 */
const handler = async (request: NextRequest) => {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const includeCounts = searchParams.get('include_counts') === 'true';

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    logger.error('Categories fetch error', error);
    throw new ApiError('Failed to fetch categories', 'DATABASE_ERROR', { error: error.message });
  }

  // If include_counts, get post counts for each category
  if (includeCounts && categories) {
    const categoryIds = categories.map((c) => c.id);
    const { data: counts } = await supabase
      .from('posts')
      .select('category_id')
      .in('category_id', categoryIds)
      .eq('status', 'published');

    const countMap = new Map<string, number>();
    counts?.forEach((post) => {
      if (post.category_id) {
        countMap.set(post.category_id, (countMap.get(post.category_id) || 0) + 1);
      }
    });

    const categoriesWithCounts = categories.map((cat) => ({
      ...cat,
      post_count: countMap.get(cat.id) || 0,
    }));

    return success(categoriesWithCounts);
  }

  return success(categories || []);
};

export const GET = withRouteHandler(handler, { logRequest: true });
