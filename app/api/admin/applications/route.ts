export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { success, handleApiError, parseParams, requireEditor } from '@/lib/api';
import { listApplications, getApplicationStats } from '@/lib/db';

const listApplicationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().max(200).optional(),
});

// ============================================================================
// GET /api/admin/applications - List all applications
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    await requireEditor();

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, listApplicationsSchema);

    const { applications, total } = await listApplications(params);

    // Get stats for the response
    const stats = await getApplicationStats();

    return success({
      applications,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
      stats,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
