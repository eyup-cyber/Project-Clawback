/**
 * Get Follower Count API
 */

import { type NextRequest } from 'next/server';
import * as followsDb from '@/lib/db/follows';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';

export const GET = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const count = await followsDb.getFollowerCount(id);

    return success({ count });
  }
);
