export const runtime = 'edge';

/**
 * Bulk Delete Bookmarks API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { noContent } from '@/lib/api/response';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  bookmark_ids: z.array(z.string().uuid()),
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const data = bulkDeleteSchema.parse(body);

  await bookmarksDb.bulkDeleteBookmarks(user.id, data.bookmark_ids);

  return noContent();
});
