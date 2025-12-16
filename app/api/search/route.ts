import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, ApiError, parseParams, searchSchema } from '@/lib/api';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { logger } from '@/lib/logger';
import type { ContentType } from '@/types/database';

export const GET = withRouteHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const params = parseParams(searchParams, searchSchema);
  const query = params.q;
  const type = params.content_type;
  const category = searchParams.get('category');
  const page = params.page;
  const limit = params.limit;

  const offset = (page - 1) * limit;
  const supabase = await createClient();

  // Build search query
  let dbQuery = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      content_type,
      featured_image_url,
      reading_time,
      published_at,
      reaction_count,
      view_count,
      author:profiles(id, username, display_name, avatar_url),
      category:categories(id, name, slug)
    `,
      { count: 'exact' }
    )
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (type) {
    dbQuery = dbQuery.eq('content_type', type as ContentType);
  }

  if (category) {
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single();

    if (categoryError) {
      logger.error('Category lookup failed in search', categoryError, { category });
    }

    if (categoryData) {
      dbQuery = dbQuery.eq('category_id', categoryData.id);
    }
  }

  const { data: posts, error, count } = await dbQuery;

  if (error) {
    logger.error('Search query error', error, { query, type, category });
    throw new ApiError('Failed to execute search', 'DATABASE_ERROR', { error: error.message });
  }

  return success({
    results: posts,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}, { logRequest: true });

