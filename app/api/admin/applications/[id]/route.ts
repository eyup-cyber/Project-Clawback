import { NextRequest } from 'next/server';
import { success, handleApiError, requireEditor } from '@/lib/api';
import { getApplicationById } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/admin/applications/[id] - Get a single application
// ============================================================================
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireEditor();

    const { id } = await context.params;
    const application = await getApplicationById(id);

    return success(application);
  } catch (err) {
    return handleApiError(err);
  }
}






