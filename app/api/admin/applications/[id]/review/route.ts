import { type NextRequest } from 'next/server';
import {
  success,
  handleApiError,
  parseBody,
  reviewApplicationSchema,
  requireEditor,
} from '@/lib/api';
import { approveApplication, rejectApplication } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// POST /api/admin/applications/[id]/review - Review an application
// ============================================================================
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await requireEditor();
    const { id } = await context.params;

    const body = await parseBody(request, reviewApplicationSchema.omit({ application_id: true }));

    let application;

    if (body.action === 'approve') {
      application = await approveApplication(id, user.id, body.notes);
    } else {
      application = await rejectApplication(id, user.id, body.notes);
    }

    return success({
      application,
      message: `Application ${body.action}d successfully`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}






