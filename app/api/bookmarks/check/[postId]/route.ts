/**
 * Check if post is bookmarked
 */

import { type NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/api/middleware';
import * as bookmarksDb from '@/lib/db/bookmarks';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';

export const GET = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ postId: string }> }) => {
    const { user } = await getAuthUser();
    if (!user) {
      return success({ bookmarked: false });
    }

    const { postId } = await params;
    const bookmarked = await bookmarksDb.isPostBookmarked(user.id, postId);

    return success({ bookmarked });
  }
);
