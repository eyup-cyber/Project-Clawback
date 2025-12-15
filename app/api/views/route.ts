import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  success,
  handleApiError,
  parseBody,
  getAuthUser,
  rateLimitByIp,
} from '@/lib/api';
import { incrementViewCount } from '@/lib/db';

const trackViewSchema = z.object({
  post_id: z.string().uuid(),
});

// ============================================================================
// POST /api/views - Track a post view
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    // Rate limit to prevent view spamming
    rateLimitByIp(request, { maxRequests: 100, windowMs: 60000 });

    const body = await parseBody(request, trackViewSchema);

    // Get user if authenticated
    const { user } = await getAuthUser();

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    await incrementViewCount(body.post_id, user?.id, ip);

    return success({ tracked: true });
  } catch (err) {
    return handleApiError(err);
  }
}






