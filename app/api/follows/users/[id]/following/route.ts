/**
 * Get User Following API
 */

import { type NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/api/middleware';
import * as followsDb from '@/lib/db/follows';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const getFollowingSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const GET = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    // Verify user is authenticated (value not needed for public endpoint)
    await getAuthUser();

    const searchParams = req.nextUrl.searchParams;
    const { page, limit } = getFollowingSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    const offset = (page - 1) * limit;
    const following = await followsDb.getUserFollowing(id, limit, offset);

    return success(following);
  }
);
