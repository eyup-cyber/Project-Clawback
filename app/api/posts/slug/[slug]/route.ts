import { type NextRequest } from 'next/server';
import { success, handleApiError } from '@/lib/api';
import { getPostBySlug, incrementViewCount } from '@/lib/db';
import { logger } from '@/lib/logger';
import { withRouteHandler } from '@/lib/api/route-wrapper';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// ============================================================================
// GET /api/posts/slug/[slug] - Get a post by slug
// ============================================================================
const handler = async (request: NextRequest, context: RouteContext) => {
  try {
    const { slug } = await context.params;
    const post = await getPostBySlug(slug);

    // Track view
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    incrementViewCount(post.id, undefined, ip).catch((err) =>
      logger.error('incrementViewCount failed', err, { postId: post.id, ip })
    );

    return success(post);
  } catch (err) {
    return handleApiError(err);
  }
};

export const GET = withRouteHandler(handler, { logRequest: true });
