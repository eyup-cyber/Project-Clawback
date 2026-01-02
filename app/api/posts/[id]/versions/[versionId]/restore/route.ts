export const runtime = 'edge';

/**
 * Restore Post Version API
 */

import { type NextRequest } from 'next/server';
import { requirePostOwnership } from '@/lib/api/middleware';
import * as versionsDb from '@/lib/db/post-versions';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { noContent } from '@/lib/api/response';

export const POST = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) => {
    const { id } = await params;
    const { user } = await requirePostOwnership(id); // Check ownership on post

    const { versionId } = await params;

    await versionsDb.restorePostVersion(versionId, user.id);

    return noContent();
  }
);
