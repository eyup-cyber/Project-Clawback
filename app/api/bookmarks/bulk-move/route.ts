export const runtime = 'edge';

/**
 * Bulk Move Bookmarks API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { noContent } from '@/lib/api/response';
import { z } from 'zod';

const bulkMoveSchema = z.object({
  bookmark_ids: z.array(z.string().uuid()),
  folder_id: z.string().uuid().nullable(),
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const data = bulkMoveSchema.parse(body);

  await bookmarksDb.bulkMoveBookmarks(user.id, data.bookmark_ids, data.folder_id);

  return noContent();
});
