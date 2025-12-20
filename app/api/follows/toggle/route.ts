/**
 * Toggle Follow API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as followsDb from '@/lib/db/follows';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const toggleFollowSchema = z.object({
  following_type: z.enum(['user', 'category', 'tag']),
  following_id: z.string().uuid(),
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const data = toggleFollowSchema.parse(body);

  const result = await followsDb.toggleFollow(user.id, data.following_type, data.following_id);

  return success(result);
});
