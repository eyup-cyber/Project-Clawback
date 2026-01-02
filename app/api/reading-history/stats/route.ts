export const runtime = 'edge';

/**
 * Reading Stats API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as readingHistoryDb from '@/lib/db/reading-history';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';

export const GET = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const stats = await readingHistoryDb.getReadingStats(user.id);

  return success(stats);
});
