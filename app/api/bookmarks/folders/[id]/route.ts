/**
 * Single Bookmark Folder API Routes
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success, noContent } from '@/lib/api/response';
import { z } from 'zod';

const updateFolderSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().optional(),
});

export const PATCH = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const data = updateFolderSchema.parse(body);

    const folder = await bookmarksDb.updateBookmarkFolder(id, user.id, data);

    return success(folder);
  }
);

export const DELETE = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requireAuth();
    const { id } = await params;

    await bookmarksDb.deleteBookmarkFolder(id, user.id);

    return noContent();
  }
);
