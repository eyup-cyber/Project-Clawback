export const runtime = 'edge';

/**
 * Compare Post Versions API
 */

import { type NextRequest } from 'next/server';
import { requirePostOwnership } from '@/lib/api/middleware';
import * as versionsDb from '@/lib/db/post-versions';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const compareVersionsSchema = z.object({
  version_a_id: z.string().uuid(),
  version_b_id: z.string().uuid(),
});

export const POST = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requirePostOwnership(id); // Check ownership

    const body = await req.json();
    const { version_a_id, version_b_id } = compareVersionsSchema.parse(body);

    const comparison = await versionsDb.compareVersions(version_a_id, version_b_id);

    return success(comparison);
  }
);
