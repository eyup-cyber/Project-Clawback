/**
 * Post Versions API Routes
 * Phase 1.2.4: Version history API
 */

import { type NextRequest } from 'next/server';
import { requirePostOwnership } from '@/lib/api/middleware';
import * as versionsDb from '@/lib/db/post-versions';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const createVersionSchema = z.object({
  change_summary: z.string().max(500).optional(),
});

// Used in restore route
export const restoreVersionSchema = z.object({
  version_id: z.string().uuid(),
});

export const GET = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requirePostOwnership(id); // Check ownership

    const versions = await versionsDb.getPostVersions(id);

    return success(versions);
  }
);

export const POST = withRouteHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { user } = await requirePostOwnership(id);

    const body = await req.json();
    const data = createVersionSchema.parse(body);

    const version = await versionsDb.createPostVersion(id, user.id, data.change_summary);

    return success(version, 201);
  }
);
