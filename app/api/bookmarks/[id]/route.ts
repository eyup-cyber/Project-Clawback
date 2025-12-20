/**
 * Single Bookmark API Routes
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success, noContent } from '@/lib/api/response';
import { z } from 'zod';

const updateBookmarkSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export const PATCH = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const data = updateBookmarkSchema.parse(body);

    const bookmark = await bookmarksDb.updateBookmark(id, user.id, {
      folderId: data.folder_id,
      note: data.note,
    });

    return success(bookmark);
  }
);

export const DELETE = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requireAuth();
    const { id } = await params;

    await bookmarksDb.deleteBookmark(id, user.id);

    return noContent();
  }
);
