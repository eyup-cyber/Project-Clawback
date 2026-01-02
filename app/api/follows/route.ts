export const runtime = 'edge';

/**
 * Follows API Routes
 * Phase 1.1.5: Following system API
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as followsDb from '@/lib/db/follows';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success, noContent } from '@/lib/api/response';
import { z } from 'zod';

const followSchema = z.object({
  following_type: z.enum(['user', 'category', 'tag']),
  following_id: z.string().uuid(),
  notify_new_posts: z.boolean().optional().default(true),
});

const unfollowSchema = z.object({
  following_type: z.enum(['user', 'category', 'tag']),
  following_id: z.string().uuid(),
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const data = followSchema.parse(body);

  const follow = await followsDb.followEntity(
    user.id,
    data.following_type,
    data.following_id,
    data.notify_new_posts
  );

  return success(follow, 201);
});

export const DELETE = withRouteHandler(async (req: NextRequest) => {
  const { user } = await requireAuth();

  const searchParams = req.nextUrl.searchParams;
  const data = unfollowSchema.parse({
    following_type: searchParams.get('following_type'),
    following_id: searchParams.get('following_id'),
  });

  await followsDb.unfollowEntity(user.id, data.following_type, data.following_id);

  return noContent();
});
