/**
 * Check Follow Status API
 */

import { type NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/api/middleware';
import * as followsDb from '@/lib/db/follows';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const checkFollowSchema = z.object({
  following_type: z.enum(['user', 'category', 'tag']),
  following_id: z.string().uuid(),
});

export const GET = withRouteHandler(async (req: NextRequest) => {
  const { user } = await getAuthUser();
  if (!user) {
    return success({ following: false });
  }

  const searchParams = req.nextUrl.searchParams;
  const data = checkFollowSchema.parse({
    following_type: searchParams.get('following_type'),
    following_id: searchParams.get('following_id'),
  });

  const following = await followsDb.isFollowing(user.id, data.following_type, data.following_id);

  return success({ following });
});
