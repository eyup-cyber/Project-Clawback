import { type NextRequest } from 'next/server';
import {
  success,
  paginated,
  handleApiError,
  parseBody,
  parseParams,
  createPostSchema,
  listPostsSchema,
  requireContributor,
} from '@/lib/api';
import { rateLimitByUser } from '@/lib/security/rate-limit';
import { applySecurityHeaders } from '@/lib/security/headers';
import { createPost, listPosts } from '@/lib/db';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';

// ============================================================================
// GET /api/posts - List posts with filtering and pagination
// ============================================================================
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    createContext(requestId, 'GET', '/api/posts', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    logger.info('Fetching posts', { method: 'GET', path: '/api/posts' }, requestId);

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, listPostsSchema);

    const { posts, total } = await listPosts({
      filters: {
        status: params.status,
        content_type: params.content_type,
        category_id: params.category_id,
        author_id: params.author_id,
        search: params.search,
        featured: params.featured,
      },
      sort: {
        field: params.sort,
        order: params.order,
      },
      page: params.page,
      limit: params.limit,
    });

    const duration = Date.now() - startTime;
    logger.performance('listPosts', duration, { count: posts.length, total }, requestId);

    const response = paginated(posts, {
      page: params.page,
      limit: params.limit,
      total,
    });

    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}

// ============================================================================
// POST /api/posts - Create a new post
// ============================================================================
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Require contributor role
    const { user } = await requireContributor();

    createContext(requestId, 'POST', '/api/posts', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      userId: user.id,
    });

    logger.info('Creating post', { method: 'POST', path: '/api/posts', userId: user.id }, requestId);

    // Rate limit: 10 posts per hour
    await rateLimitByUser(user.id, { maxRequests: 10, windowMs: 3600000 });

    // Parse and validate body
    const body = await parseBody(request, createPostSchema);

    // Create the post
    const post = await createPost({
      ...body,
      author_id: user.id,
    });

    const duration = Date.now() - startTime;
    logger.performance('createPost', duration, { postId: post.id }, requestId);
    logger.info('Post created successfully', { postId: post.id }, requestId);

    const response = success(post, 201);
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}

