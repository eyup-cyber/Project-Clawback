export const runtime = 'edge';

/**
 * Toggle Bookmark API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const toggleBookmarkSchema = z.object({
  post_id: z.string().uuid(),
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const { post_id } = toggleBookmarkSchema.parse(body);

  const result = await bookmarksDb.toggleBookmark(user.id, post_id);

  return success(result);
});
