export const runtime = 'edge';

/**
 * Dashboard Posts API
 * Phase 1.2.2: Posts list with filters, pagination, and sorting
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || '';
    const contentType = searchParams.get('type') || '';
    const sortParam = searchParams.get('sort') || 'updated_at:desc';
    const search = searchParams.get('q') || '';

    // Parse sort parameter
    const [sortField, sortOrder] = sortParam.split(':') as [string, 'asc' | 'desc'];
    const validSortFields = ['created_at', 'updated_at', 'title', 'views'];
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'updated_at';
    const finalSortOrder = sortOrder === 'asc';

    // Map sort field names
    const sortFieldMap: Record<string, string> = {
      views: 'view_count',
      created_at: 'created_at',
      updated_at: 'updated_at',
      title: 'title',
    };

    // Build query
    let query = supabase
      .from('posts')
      .select(
        'id, title, slug, status, content_type, view_count, created_at, updated_at, published_at, scheduled_for',
        {
          count: 'exact',
        }
      )
      .eq('author_id', user.id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Apply sorting
    query = query.order(sortFieldMap[finalSortField] || 'updated_at', {
      ascending: finalSortOrder,
    });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: posts, error: postsError, count } = await query;

    if (postsError) {
      logger.error('Failed to fetch posts', { error: postsError });
      throw postsError;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json(
      {
        posts: posts || [],
        total,
        page,
        totalPages,
        hasMore,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    logger.error('Dashboard posts error', { error });
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
