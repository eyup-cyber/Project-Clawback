/**
 * Bookmark Folders API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const createFolderSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().optional(),
});

export const GET = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const folders = await bookmarksDb.getBookmarkFolders(user.id);

  return success(folders);
});

export const POST = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await _req.json();
  const data = createFolderSchema.parse(body);

  const folder = await bookmarksDb.createBookmarkFolder(user.id, {
    name: data.name,
    color: data.color,
    icon: data.icon,
  });

  return success(folder, 201);
});
