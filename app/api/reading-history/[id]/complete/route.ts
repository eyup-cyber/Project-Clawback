export const runtime = 'edge';

/**
 * Mark Reading History as Complete API
 * Phase 1.1.2: POST /api/reading-history/[id]/complete
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as readingHistoryDb from '@/lib/db/reading-history';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';

export const POST = withRouteHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requireAuth();
    const { id: postId } = await params;

    const result = await readingHistoryDb.markAsCompleted(user.id, postId);

    return success(result);
  }
);
