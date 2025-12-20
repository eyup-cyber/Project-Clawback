/**
 * Notification Preferences API
 * Phase 6.6: Notification preferences management
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/middleware';
import * as notificationPrefsDb from '@/lib/db/notification-preferences';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success } from '@/lib/api/response';
import { z } from 'zod';

const updatePreferenceSchema = z.object({
  notification_type: z.enum([
    'new_comment',
    'comment_reply',
    'post_reaction',
    'new_follower',
    'post_published',
    'post_rejected',
    'post_approved',
    'application_approved',
    'application_rejected',
  ]),
  in_app: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
});

export const GET = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const preferences = await notificationPrefsDb.getNotificationPreferences(user.id);

  return success(preferences);
});

export const PATCH = withRouteHandler(async (_req: NextRequest) => {
  const { user } = await requireAuth();

  const body = await req.json();
  const data = updatePreferenceSchema.parse(body);

  const preference = await notificationPrefsDb.updateNotificationPreference(
    user.id,
    data.notification_type,
    {
      in_app: data.in_app,
      email: data.email,
      push: data.push,
    }
  );

  return success(preference);
});
