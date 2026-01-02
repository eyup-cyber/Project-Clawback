export const runtime = 'edge';

/**
 * Get Followed Categories API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as followsDb from '@/lib/db/follows';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';

export const GET = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const categories = await followsDb.getFollowedCategories(user.id);

  return success(categories);
});
