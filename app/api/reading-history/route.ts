/**
 * Reading History API Routes
 * Phase 3.3: Reading progress and history
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as readingHistoryDb from '@/lib/db/reading-history';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success, noContent } from '@/lib/api/response';
import { z } from 'zod';

const updateProgressSchema = z.object({
  post_id: z.string().uuid(),
  progress: z.number().min(0).max(1),
  scroll_position: z.number().int().min(0).optional(),
  time_spent: z.number().int().min(0).optional(),
});

const getHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  completed_only: z.coerce.boolean().optional(),
});

export const POST = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const data = updateProgressSchema.parse(body);

  const history = await readingHistoryDb.updateReadingProgress(user.id, data.post_id, {
    progress: data.progress,
    scrollPosition: data.scroll_position,
    timeSpent: data.time_spent,
  });

  return success(history);
});

export const GET = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const searchParams = req.nextUrl.searchParams;
  const options = getHistorySchema.parse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    date_from: searchParams.get('date_from'),
    date_to: searchParams.get('date_to'),
    completed_only: searchParams.get('completed_only'),
  });

  const result = await readingHistoryDb.getReadingHistory(user.id, options);

  return success(result);
});

export const DELETE = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  await readingHistoryDb.clearReadingHistory(user.id);

  return noContent();
});
