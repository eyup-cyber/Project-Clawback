/**
 * Site Settings Management
 * Phase 22: Global site configuration, feature flags, maintenance mode
 */

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface SiteSettings {
  general: GeneralSettings;
  content: ContentSettings;
  comments: CommentSettings;
  registration: RegistrationSettings;
  email: EmailSettings;
  seo: SEOSettings;
  social: SocialSettings;
  analytics: AnalyticsSettings;
  maintenance: MaintenanceSettings;
  features: FeatureSettings;
}

export interface GeneralSettings {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  siteKeywords: string[];
  timezone: string;
  dateFormat: string;
  language: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  copyrightText: string;
}

export interface ContentSettings {
  defaultPostStatus: 'draft' | 'pending' | 'published';
  requireApproval: boolean;
  maxPostLength: number;
  maxTitleLength: number;
  maxExcerptLength: number;
  maxTagsPerPost: number;
  allowedContentTypes: ('article' | 'video' | 'podcast' | 'gallery')[];
  defaultCategory: string | null;
  enableScheduledPublishing: boolean;
  enableVersionHistory: boolean;
  versionHistoryLimit: number;
}

export interface CommentSettings {
  enabled: boolean;
  requireApproval: boolean;
  allowAnonymous: boolean;
  maxLength: number;
  maxDepth: number;
  cooldownMinutes: number;
  enableReactions: boolean;
  enableReplies: boolean;
  closeAfterDays: number | null;
  blacklistedWords: string[];
}

export interface RegistrationSettings {
  enabled: boolean;
  requireEmailVerification: boolean;
  defaultRole: 'reader' | 'contributor';
  allowedEmailDomains: string[];
  blockedEmailDomains: string[];
  requireInvite: boolean;
  maxUsersPerDay: number | null;
  enableSocialAuth: boolean;
  allowedSocialProviders: ('google' | 'twitter' | 'github' | 'discord')[];
}

export interface EmailSettings {
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  enableTransactionalEmails: boolean;
  enableMarketingEmails: boolean;
  emailProvider: 'smtp' | 'sendgrid' | 'mailgun' | 'postmark';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
}

export interface SEOSettings {
  enableSitemap: boolean;
  enableRobotsTxt: boolean;
  enableRssFeed: boolean;
  enableJsonLd: boolean;
  defaultOgImage: string | null;
  twitterHandle: string | null;
  googleSiteVerification: string | null;
  bingSiteVerification: string | null;
  enableCanonicalUrls: boolean;
  indexFollowDefault: boolean;
}

export interface SocialSettings {
  facebookUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  discordUrl: string | null;
  githubUrl: string | null;
  enableSocialSharing: boolean;
  shareButtons: ('twitter' | 'facebook' | 'linkedin' | 'email' | 'copy')[];
}

export interface AnalyticsSettings {
  enableAnalytics: boolean;
  googleAnalyticsId: string | null;
  plausibleDomain: string | null;
  enableHeatmaps: boolean;
  enableSessionRecording: boolean;
  enableCustomEvents: boolean;
  retentionDays: number;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  allowedIps: string[];
  allowedUserIds: string[];
  estimatedEndTime: string | null;
  showCountdown: boolean;
}

export interface FeatureSettings {
  enableBookmarks: boolean;
  enableFollowing: boolean;
  enableNotifications: boolean;
  enableDarkMode: boolean;
  enableSearch: boolean;
  enableCategories: boolean;
  enableTags: boolean;
  enableReadingHistory: boolean;
  enableReadingTime: boolean;
  enableViewCounts: boolean;
  enableUserProfiles: boolean;
  enableBadges: boolean;
  enableLeaderboards: boolean;
  enablePwa: boolean;
  enableWebhooks: boolean;
  enableApi: boolean;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_SETTINGS: SiteSettings = {
  general: {
    siteName: 'Scroungers Multimedia',
    siteUrl: 'https://scroungersmultimedia.com',
    siteDescription: 'Voices from the margins. Stories that matter.',
    siteKeywords: ['news', 'stories', 'multimedia', 'journalism'],
    timezone: 'UTC',
    dateFormat: 'MMMM d, yyyy',
    language: 'en',
    logoUrl: null,
    faviconUrl: '/favicon.ico',
    copyrightText: '© {year} Scroungers Multimedia. All rights reserved.',
  },
  content: {
    defaultPostStatus: 'draft',
    requireApproval: true,
    maxPostLength: 50000,
    maxTitleLength: 200,
    maxExcerptLength: 500,
    maxTagsPerPost: 10,
    allowedContentTypes: ['article', 'video', 'podcast', 'gallery'],
    defaultCategory: null,
    enableScheduledPublishing: true,
    enableVersionHistory: true,
    versionHistoryLimit: 50,
  },
  comments: {
    enabled: true,
    requireApproval: false,
    allowAnonymous: false,
    maxLength: 5000,
    maxDepth: 5,
    cooldownMinutes: 1,
    enableReactions: true,
    enableReplies: true,
    closeAfterDays: null,
    blacklistedWords: [],
  },
  registration: {
    enabled: true,
    requireEmailVerification: true,
    defaultRole: 'reader',
    allowedEmailDomains: [],
    blockedEmailDomains: [],
    requireInvite: false,
    maxUsersPerDay: null,
    enableSocialAuth: true,
    allowedSocialProviders: ['google', 'twitter', 'github'],
  },
  email: {
    fromName: 'Scroungers Multimedia',
    fromEmail: 'noreply@scroungersmultimedia.com',
    replyToEmail: 'support@scroungersmultimedia.com',
    enableTransactionalEmails: true,
    enableMarketingEmails: true,
    emailProvider: 'smtp',
  },
  seo: {
    enableSitemap: true,
    enableRobotsTxt: true,
    enableRssFeed: true,
    enableJsonLd: true,
    defaultOgImage: null,
    twitterHandle: '@scroungers',
    googleSiteVerification: null,
    bingSiteVerification: null,
    enableCanonicalUrls: true,
    indexFollowDefault: true,
  },
  social: {
    facebookUrl: null,
    twitterUrl: null,
    instagramUrl: null,
    linkedinUrl: null,
    youtubeUrl: null,
    discordUrl: null,
    githubUrl: null,
    enableSocialSharing: true,
    shareButtons: ['twitter', 'facebook', 'linkedin', 'email', 'copy'],
  },
  analytics: {
    enableAnalytics: true,
    googleAnalyticsId: null,
    plausibleDomain: null,
    enableHeatmaps: false,
    enableSessionRecording: false,
    enableCustomEvents: true,
    retentionDays: 90,
  },
  maintenance: {
    enabled: false,
    message: "We're currently performing maintenance. Please check back soon.",
    allowedIps: [],
    allowedUserIds: [],
    estimatedEndTime: null,
    showCountdown: true,
  },
  features: {
    enableBookmarks: true,
    enableFollowing: true,
    enableNotifications: true,
    enableDarkMode: true,
    enableSearch: true,
    enableCategories: true,
    enableTags: true,
    enableReadingHistory: true,
    enableReadingTime: true,
    enableViewCounts: true,
    enableUserProfiles: true,
    enableBadges: true,
    enableLeaderboards: true,
    enablePwa: true,
    enableWebhooks: true,
    enableApi: true,
  },
};

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * Get all site settings
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .order('key');

  if (error) {
    logger.error('[Admin] Failed to fetch site settings', error);
    return DEFAULT_SETTINGS;
  }

  // Merge stored settings with defaults
  const storedSettings: Partial<SiteSettings> = {};
  for (const { key, value } of data || []) {
    const [category, setting] = key.split('.');
    if (category && setting) {
      if (!storedSettings[category as keyof SiteSettings]) {
        storedSettings[category as keyof SiteSettings] = {} as never;
      }
      (storedSettings[category as keyof SiteSettings] as Record<string, unknown>)[setting] = value;
    }
  }

  return deepMerge(DEFAULT_SETTINGS, storedSettings as SiteSettings);
}

/**
 * Get a specific settings category
 */
export async function getSettingsCategory<K extends keyof SiteSettings>(
  category: K
): Promise<SiteSettings[K]> {
  const settings = await getSiteSettings();
  return settings[category];
}

/**
 * Update site settings
 */
export async function updateSiteSettings(
  updates: Partial<SiteSettings>,
  adminId: string
): Promise<SiteSettings> {
  const supabase = await createServiceClient();

  // Flatten updates into key-value pairs
  const keyValuePairs: { key: string; value: unknown }[] = [];
  for (const [category, settings] of Object.entries(updates)) {
    if (settings && typeof settings === 'object') {
      for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
        keyValuePairs.push({
          key: `${category}.${key}`,
          value,
        });
      }
    }
  }

  // Upsert each setting
  for (const { key, value } of keyValuePairs) {
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key,
          value,
          updated_by: adminId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      logger.error('[Admin] Failed to update setting', { key, error });
      throw error;
    }
  }

  // Log the update
  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action: 'update_site_settings',
    target_type: 'settings',
    target_id: 'site',
    metadata: { updated_keys: keyValuePairs.map((p) => p.key) },
  });

  logger.info('[Admin] Site settings updated', {
    adminId,
    keys: keyValuePairs.map((p) => p.key),
  });

  return getSiteSettings();
}

/**
 * Reset settings to defaults
 */
export async function resetSettingsToDefault(
  category: keyof SiteSettings | 'all',
  adminId: string
): Promise<SiteSettings> {
  const supabase = await createServiceClient();

  if (category === 'all') {
    // Delete all settings
    const { error } = await supabase.from('site_settings').delete().neq('key', '');

    if (error) {
      logger.error('[Admin] Failed to reset all settings', error);
      throw error;
    }
  } else {
    // Delete settings for specific category
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .like('key', `${category}.%`);

    if (error) {
      logger.error('[Admin] Failed to reset category settings', error);
      throw error;
    }
  }

  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action: 'reset_site_settings',
    target_type: 'settings',
    target_id: category,
  });

  return getSiteSettings();
}

// ============================================================================
// MAINTENANCE MODE
// ============================================================================

/**
 * Enable maintenance mode
 */
export async function enableMaintenanceMode(
  adminId: string,
  options: Partial<MaintenanceSettings> = {}
): Promise<void> {
  await updateSiteSettings(
    {
      maintenance: {
        ...DEFAULT_SETTINGS.maintenance,
        ...options,
        enabled: true,
      },
    },
    adminId
  );

  logger.info('[Admin] Maintenance mode enabled', { adminId });
}

/**
 * Disable maintenance mode
 */
export async function disableMaintenanceMode(adminId: string): Promise<void> {
  await updateSiteSettings(
    {
      maintenance: {
        ...DEFAULT_SETTINGS.maintenance,
        enabled: false,
      },
    },
    adminId
  );

  logger.info('[Admin] Maintenance mode disabled', { adminId });
}

/**
 * Check if maintenance mode is active
 */
export async function isMaintenanceModeActive(
  clientIp?: string,
  userId?: string
): Promise<boolean> {
  const settings = await getSettingsCategory('maintenance');

  if (!settings.enabled) return false;

  // Check if IP is allowed
  if (clientIp && settings.allowedIps.includes(clientIp)) {
    return false;
  }

  // Check if user is allowed
  if (userId && settings.allowedUserIds.includes(userId)) {
    return false;
  }

  return true;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Deep merge objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

export default {
  getSiteSettings,
  getSettingsCategory,
  updateSiteSettings,
  resetSettingsToDefault,
  enableMaintenanceMode,
  disableMaintenanceMode,
  isMaintenanceModeActive,
  DEFAULT_SETTINGS,
};
