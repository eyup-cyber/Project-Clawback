/**
 * Notification Preferences Database Operations
 * Phase 1.4.2: Notification preferences management
 */

import { createClient } from '@/lib/supabase/server';

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  in_app: boolean;
  email: boolean;
  push: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'new_comment'
  | 'comment_reply'
  | 'post_reaction'
  | 'new_follower'
  | 'post_published'
  | 'post_rejected'
  | 'post_approved'
  | 'application_approved'
  | 'application_rejected';

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<Record<NotificationType, NotificationPreference>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  // Convert array to object keyed by notification_type
  const preferences: Record<string, NotificationPreference> = {};
  (data || []).forEach((pref) => {
    preferences[pref.notification_type] = pref;
  });

  return preferences as Record<NotificationType, NotificationPreference>;
}

/**
 * Update notification preference
 */
export async function updateNotificationPreference(
  userId: string,
  notificationType: NotificationType,
  settings: {
    in_app?: boolean;
    email?: boolean;
    push?: boolean;
  }
): Promise<NotificationPreference> {
  const supabase = await createClient();

  // Upsert preference
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        notification_type: notificationType,
        ...settings,
      },
      {
        onConflict: 'user_id,notification_type',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get default preferences for a notification type
 */
export function getDefaultPreferences(type: NotificationType): {
  in_app: boolean;
  email: boolean;
  push: boolean;
} {
  // Default preferences based on type
  const defaults: Record<NotificationType, { in_app: boolean; email: boolean; push: boolean }> = {
    new_comment: { in_app: true, email: false, push: false },
    comment_reply: { in_app: true, email: true, push: false },
    post_reaction: { in_app: true, email: false, push: false },
    new_follower: { in_app: true, email: false, push: false },
    post_published: { in_app: true, email: true, push: false },
    post_rejected: { in_app: true, email: true, push: false },
    post_approved: { in_app: true, email: true, push: false },
    application_approved: { in_app: true, email: true, push: false },
    application_rejected: { in_app: true, email: true, push: false },
  };

  return defaults[type] || { in_app: true, email: false, push: false };
}
