/**
 * Export Reading History API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as readingHistoryDb from '@/lib/db/reading-history';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { NextResponse as NextResponseType } from 'next/server';

export const GET = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const csv = await readingHistoryDb.exportReadingHistory(user.id);

  return new NextResponseType(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="reading-history-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});
