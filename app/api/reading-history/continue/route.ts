export const runtime = 'edge';

/**
 * Continue Reading API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as readingHistoryDb from '@/lib/db/reading-history';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const getContinueSchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(5),
});

export const GET = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const searchParams = req.nextUrl.searchParams;
  const { limit } = getContinueSchema.parse({
    limit: searchParams.get('limit'),
  });

  const items = await readingHistoryDb.getContinueReading(user.id, limit);

  return success(items);
});
