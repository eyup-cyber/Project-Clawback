/**
 * Reorder Bookmark Folders API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { noContent } from '@/lib/api/response';
import { z } from 'zod';

const reorderFoldersSchema = z.object({
  folders: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int(),
    })
  ),
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const data = reorderFoldersSchema.parse(body);

  await bookmarksDb.reorderBookmarkFolders(user.id, data.folders);

  return noContent();
});
