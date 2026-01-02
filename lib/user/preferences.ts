// @ts-nocheck
/**
 * User Preferences and Settings System
 * Phase 49: Comprehensive user settings management
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: ThemePreference;
  display: DisplayPreferences;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  content: ContentPreferences;
  accessibility: AccessibilityPreferences;
  email: EmailPreferences;
  language: LanguagePreferences;
  updated_at: string;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface DisplayPreferences {
  font_size: 'small' | 'medium' | 'large';
  font_family: 'default' | 'serif' | 'mono' | 'dyslexic';
  line_height: 'normal' | 'relaxed' | 'loose';
  content_width: 'narrow' | 'normal' | 'wide';
  compact_mode: boolean;
  show_images: boolean;
  autoplay_videos: boolean;
  autoplay_gifs: boolean;
}

export interface NotificationPreferences {
  // In-app notifications
  in_app_enabled: boolean;
  in_app_sound: boolean;
  in_app_vibrate: boolean;

  // Push notifications
  push_enabled: boolean;
  push_comments: boolean;
  push_replies: boolean;
  push_mentions: boolean;
  push_follows: boolean;
  push_likes: boolean;
  push_messages: boolean;
  push_system: boolean;

  // Digest preferences
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly' | 'never';
  digest_day: number; // 0-6 for weekly, day of week

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM
  quiet_hours_end: string;
  quiet_hours_timezone: string;
}

export interface PrivacyPreferences {
  profile_visibility: 'public' | 'followers' | 'private';
  show_online_status: boolean;
  show_activity_status: boolean;
  show_reading_history: boolean;
  show_bookmarks: boolean;
  allow_mentions: 'everyone' | 'followers' | 'none';
  allow_messages: 'everyone' | 'followers' | 'none';
  show_email: boolean;
  show_location: boolean;
  indexable_by_search_engines: boolean;
}

export interface ContentPreferences {
  default_post_visibility: 'public' | 'unlisted' | 'private';
  default_comment_sort: 'newest' | 'oldest' | 'popular';
  show_nsfw_content: boolean;
  blur_nsfw_images: boolean;
  hide_blocked_users: boolean;
  auto_expand_threads: boolean;
  show_link_previews: boolean;
  reading_time_speed: 'slow' | 'average' | 'fast'; // WPM preference
}

export interface AccessibilityPreferences {
  reduce_motion: boolean;
  high_contrast: boolean;
  large_text: boolean;
  screen_reader_optimized: boolean;
  keyboard_navigation: boolean;
  focus_indicators: boolean;
  captions_enabled: boolean;
  audio_descriptions: boolean;
}

export interface EmailPreferences {
  // Transactional emails
  email_security_alerts: boolean;
  email_login_alerts: boolean;
  email_password_changed: boolean;

  // Engagement emails
  email_new_follower: boolean;
  email_new_comment: boolean;
  email_new_reply: boolean;
  email_mentions: boolean;
  email_likes: boolean;
  email_messages: boolean;

  // Marketing emails
  email_newsletter: boolean;
  email_product_updates: boolean;
  email_tips_and_tricks: boolean;
  email_surveys: boolean;

  // Digest
  email_digest: boolean;
  email_digest_frequency: 'daily' | 'weekly' | 'monthly';

  // Unsubscribe all
  unsubscribe_all: boolean;
}

export interface LanguagePreferences {
  interface_language: string;
  content_language: string;
  translation_enabled: boolean;
  auto_translate: boolean;
  preferred_languages: string[];
  date_format: 'relative' | 'absolute' | 'both';
  time_format: '12h' | '24h';
  timezone: string;
  first_day_of_week: number; // 0-6
}

export interface PreferencesUpdate {
  theme?: ThemePreference;
  display?: Partial<DisplayPreferences>;
  notifications?: Partial<NotificationPreferences>;
  privacy?: Partial<PrivacyPreferences>;
  content?: Partial<ContentPreferences>;
  accessibility?: Partial<AccessibilityPreferences>;
  email?: Partial<EmailPreferences>;
  language?: Partial<LanguagePreferences>;
}

// ============================================================================
// DEFAULT PREFERENCES
// ============================================================================

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'updated_at'> = {
  theme: 'system',
  display: {
    font_size: 'medium',
    font_family: 'default',
    line_height: 'normal',
    content_width: 'normal',
    compact_mode: false,
    show_images: true,
    autoplay_videos: false,
    autoplay_gifs: true,
  },
  notifications: {
    in_app_enabled: true,
    in_app_sound: false,
    in_app_vibrate: true,
    push_enabled: true,
    push_comments: true,
    push_replies: true,
    push_mentions: true,
    push_follows: true,
    push_likes: false,
    push_messages: true,
    push_system: true,
    digest_enabled: true,
    digest_frequency: 'weekly',
    digest_day: 0, // Sunday
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    quiet_hours_timezone: 'UTC',
  },
  privacy: {
    profile_visibility: 'public',
    show_online_status: true,
    show_activity_status: true,
    show_reading_history: false,
    show_bookmarks: false,
    allow_mentions: 'everyone',
    allow_messages: 'followers',
    show_email: false,
    show_location: false,
    indexable_by_search_engines: true,
  },
  content: {
    default_post_visibility: 'public',
    default_comment_sort: 'newest',
    show_nsfw_content: false,
    blur_nsfw_images: true,
    hide_blocked_users: true,
    auto_expand_threads: true,
    show_link_previews: true,
    reading_time_speed: 'average',
  },
  accessibility: {
    reduce_motion: false,
    high_contrast: false,
    large_text: false,
    screen_reader_optimized: false,
    keyboard_navigation: true,
    focus_indicators: true,
    captions_enabled: false,
    audio_descriptions: false,
  },
  email: {
    email_security_alerts: true,
    email_login_alerts: true,
    email_password_changed: true,
    email_new_follower: true,
    email_new_comment: true,
    email_new_reply: true,
    email_mentions: true,
    email_likes: false,
    email_messages: true,
    email_newsletter: true,
    email_product_updates: true,
    email_tips_and_tricks: false,
    email_surveys: false,
    email_digest: true,
    email_digest_frequency: 'weekly',
    unsubscribe_all: false,
  },
  language: {
    interface_language: 'en',
    content_language: 'en',
    translation_enabled: true,
    auto_translate: false,
    preferred_languages: ['en'],
    date_format: 'relative',
    time_format: '12h',
    timezone: 'UTC',
    first_day_of_week: 0,
  },
};

// ============================================================================
// PREFERENCES OPERATIONS
// ============================================================================

/**
 * Get user preferences
 */
export async function getUserPreferences(userId?: string): Promise<UserPreferences> {
  const supabase = userId ? await createServiceClient() : await createClient();

  let targetUserId = userId;

  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', targetUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found, create defaults
      return createDefaultPreferences(targetUserId);
    }
    logger.error('[Preferences] Failed to get preferences', error);
    throw error;
  }

  return data as UserPreferences;
}

/**
 * Create default preferences for a user
 */
async function createDefaultPreferences(userId: string): Promise<UserPreferences> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .insert({
      user_id: userId,
      ...DEFAULT_PREFERENCES,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Preferences] Failed to create default preferences', error);
    throw error;
  }

  logger.info('[Preferences] Created default preferences', { user_id: userId });
  return data as UserPreferences;
}

/**
 * Update user preferences
 */
export async function updatePreferences(updates: PreferencesUpdate): Promise<UserPreferences> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get current preferences
  const current = await getUserPreferences(user.id);

  // Merge updates
  const merged: Partial<UserPreferences> = {};

  if (updates.theme !== undefined) {
    merged.theme = updates.theme;
  }

  if (updates.display) {
    merged.display = { ...current.display, ...updates.display };
  }

  if (updates.notifications) {
    merged.notifications = {
      ...current.notifications,
      ...updates.notifications,
    };
  }

  if (updates.privacy) {
    merged.privacy = { ...current.privacy, ...updates.privacy };
  }

  if (updates.content) {
    merged.content = { ...current.content, ...updates.content };
  }

  if (updates.accessibility) {
    merged.accessibility = {
      ...current.accessibility,
      ...updates.accessibility,
    };
  }

  if (updates.email) {
    merged.email = { ...current.email, ...updates.email };
  }

  if (updates.language) {
    merged.language = { ...current.language, ...updates.language };
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .update({
      ...merged,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('[Preferences] Failed to update preferences', error);
    throw error;
  }

  logger.info('[Preferences] Preferences updated', { user_id: user.id });
  return data as UserPreferences;
}

/**
 * Reset preferences to defaults
 */
export async function resetPreferences(
  category?: keyof PreferencesUpdate
): Promise<UserPreferences> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  let updates: Partial<UserPreferences> = {};

  if (category) {
    // Reset specific category
    updates[category] = DEFAULT_PREFERENCES[category];
  } else {
    // Reset all
    updates = { ...DEFAULT_PREFERENCES };
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('[Preferences] Failed to reset preferences', error);
    throw error;
  }

  logger.info('[Preferences] Preferences reset', {
    user_id: user.id,
    category,
  });
  return data as UserPreferences;
}

// ============================================================================
// SPECIFIC PREFERENCE HELPERS
// ============================================================================

/**
 * Update theme preference
 */
export async function updateTheme(theme: ThemePreference): Promise<void> {
  await updatePreferences({ theme });
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  await updatePreferences({ notifications: prefs });
}

/**
 * Update privacy preferences
 */
export async function updatePrivacyPreferences(prefs: Partial<PrivacyPreferences>): Promise<void> {
  await updatePreferences({ privacy: prefs });
}

/**
 * Update email preferences
 */
export async function updateEmailPreferences(prefs: Partial<EmailPreferences>): Promise<void> {
  await updatePreferences({ email: prefs });
}

/**
 * Unsubscribe from all emails
 */
export async function unsubscribeFromAllEmails(): Promise<void> {
  await updatePreferences({
    email: {
      unsubscribe_all: true,
      email_newsletter: false,
      email_product_updates: false,
      email_tips_and_tricks: false,
      email_surveys: false,
      email_digest: false,
      email_new_follower: false,
      email_new_comment: false,
      email_new_reply: false,
      email_mentions: false,
      email_likes: false,
      email_messages: false,
      // Keep security emails
      email_security_alerts: true,
      email_login_alerts: true,
      email_password_changed: true,
    },
  });
}

/**
 * Update accessibility preferences
 */
export async function updateAccessibilityPreferences(
  prefs: Partial<AccessibilityPreferences>
): Promise<void> {
  await updatePreferences({ accessibility: prefs });
}

/**
 * Update language preferences
 */
export async function updateLanguagePreferences(
  prefs: Partial<LanguagePreferences>
): Promise<void> {
  await updatePreferences({ language: prefs });
}

// ============================================================================
// PREFERENCE CHECKS
// ============================================================================

/**
 * Check if user should receive notification
 */
export async function shouldReceiveNotification(
  userId: string,
  notificationType: keyof NotificationPreferences
): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.notifications.in_app_enabled) {
      return false;
    }

    // Check quiet hours
    if (prefs.notifications.quiet_hours_enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = prefs.notifications.quiet_hours_start.split(':').map(Number);
      const [endHour, endMinute] = prefs.notifications.quiet_hours_end.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      if (startTime < endTime) {
        // Normal range (e.g., 22:00 - 08:00 next day)
        if (currentTime >= startTime || currentTime < endTime) {
          return false;
        }
      } else {
        // Overnight range
        if (currentTime >= startTime && currentTime < endTime) {
          return false;
        }
      }
    }

    return Boolean(prefs.notifications[notificationType]);
  } catch {
    return true; // Default to allowing notifications on error
  }
}

/**
 * Check if user should receive email
 */
export async function shouldReceiveEmail(
  userId: string,
  emailType: keyof EmailPreferences
): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);

    if (prefs.email.unsubscribe_all) {
      // Still send security emails
      const securityEmails: (keyof EmailPreferences)[] = [
        'email_security_alerts',
        'email_login_alerts',
        'email_password_changed',
      ];
      return securityEmails.includes(emailType);
    }

    return Boolean(prefs.email[emailType]);
  } catch {
    return true; // Default to allowing emails on error
  }
}

/**
 * Check if user can be mentioned
 */
export async function canBeMentioned(userId: string, mentionerId: string): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);

    switch (prefs.privacy.allow_mentions) {
      case 'none':
        return false;
      case 'followers': {
        // Check if mentioner is a follower
        const supabase = await createServiceClient();
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', mentionerId)
          .eq('following_id', userId)
          .single();
        return !!follow;
      }
      default:
        return true;
    }
  } catch {
    return true;
  }
}

/**
 * Check if user can receive messages
 */
export async function canReceiveMessages(userId: string, senderId: string): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);

    switch (prefs.privacy.allow_messages) {
      case 'none':
        return false;
      case 'followers': {
        // Check if sender is a follower
        const supabase = await createServiceClient();
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', senderId)
          .eq('following_id', userId)
          .single();
        return !!follow;
      }
      default:
        return true;
    }
  } catch {
    return true;
  }
}

/**
 * Get effective theme for a user
 */
export async function getEffectiveTheme(
  userId: string,
  systemPreference: 'light' | 'dark' = 'light'
): Promise<'light' | 'dark'> {
  try {
    const prefs = await getUserPreferences(userId);

    if (prefs.theme === 'system') {
      return systemPreference;
    }

    return prefs.theme;
  } catch {
    return systemPreference;
  }
}

/**
 * Get reading speed in words per minute
 */
export function getReadingSpeedWPM(speed: 'slow' | 'average' | 'fast'): number {
  const speeds = {
    slow: 150,
    average: 225,
    fast: 300,
  };
  return speeds[speed];
}

/**
 * Export preferences for GDPR compliance
 */
export async function exportPreferences(): Promise<UserPreferences> {
  return getUserPreferences();
}
