/**
 * Bookmarks API Routes
 * Phase 1.1.3: Complete bookmark system API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const createBookmarkSchema = z.object({
  post_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable().optional(),
  note: z.string().max(1000).optional(),
});

// Used in bookmark [id] route
export const updateBookmarkSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

const getBookmarksSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  sort_by: z.enum(['created_at', 'title']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const GET = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const searchParams = req.nextUrl.searchParams;
  const options = getBookmarksSchema.parse({
    folder_id: searchParams.get('folder_id'),
    search: searchParams.get('search'),
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    sort_by: searchParams.get('sort_by'),
    sort_order: searchParams.get('sort_order'),
  });

  const result = await bookmarksDb.getBookmarks(user.id, options);

  return success(result);
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const data = createBookmarkSchema.parse(body);

  const bookmark = await bookmarksDb.createBookmark(user.id, data.post_id, {
    folderId: data.folder_id || undefined,
    note: data.note,
  });

  return success(bookmark, 201);
});
