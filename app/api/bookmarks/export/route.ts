export const runtime = 'edge';

/**
 * Export Bookmarks API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';

export const GET = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const bookmarks = await bookmarksDb.exportBookmarks(user.id);

  return success(bookmarks);
});
