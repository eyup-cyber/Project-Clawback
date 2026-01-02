export const runtime = 'edge';

/**
 * Get Suggested Follows API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as followsDb from '@/lib/db/follows';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const suggestionsSchema = z.object({
  type: z.enum(['user', 'category', 'tag']).default('user'),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const GET = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const searchParams = req.nextUrl.searchParams;
  const { type, limit } = suggestionsSchema.parse({
    type: searchParams.get('type'),
    limit: searchParams.get('limit'),
  });

  const suggestions = await followsDb.getSuggestedFollows(user.id, type, limit);

  return success(suggestions);
});
