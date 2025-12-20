/**
 * Single Reading History Item API Routes
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as readingHistoryDb from '@/lib/db/reading-history';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { noContent } from '@/lib/api/response';

export const DELETE = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requireAuth();
    const { id } = await params;

    await readingHistoryDb.removeFromHistory(user.id, id);

    return noContent();
  }
);
