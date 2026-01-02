/**
 * Notification Settings Page
 * Phase 1.1.7: User notification preferences
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationSettings {
  email: {
    newFollower: boolean;
    newComment: boolean;
    commentReply: boolean;
    postPublished: boolean;
    weeklyDigest: boolean;
    monthlyNewsletter: boolean;
    mentions: boolean;
    directMessages: boolean;
  };
  push: {
    enabled: boolean;
    newFollower: boolean;
    newComment: boolean;
    commentReply: boolean;
    postPublished: boolean;
    mentions: boolean;
    directMessages: boolean;
  };
  inApp: {
    newFollower: boolean;
    newComment: boolean;
    commentReply: boolean;
    postPublished: boolean;
    mentions: boolean;
    directMessages: boolean;
  };
}

const defaultSettings: NotificationSettings = {
  email: {
    newFollower: true,
    newComment: true,
    commentReply: true,
    postPublished: true,
    weeklyDigest: true,
    monthlyNewsletter: false,
    mentions: true,
    directMessages: true,
  },
  push: {
    enabled: false,
    newFollower: true,
    newComment: true,
    commentReply: true,
    postPublished: true,
    mentions: true,
    directMessages: true,
  },
  inApp: {
    newFollower: true,
    newComment: true,
    commentReply: true,
    postPublished: true,
    mentions: true,
    directMessages: true,
  },
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function Toggle({ enabled, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${
                    enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? 'Disable' : 'Enable'}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                    ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

interface NotificationRowProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function NotificationRow({
  label,
  description,
  enabled,
  onChange,
  disabled,
}: NotificationRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p className="font-medium" style={{ color: 'var(--foreground)' }}>
          {label}
        </p>
        <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          {description}
        </p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.data?.notifications) {
          setSettings(data.data.notifications);
        }
      }
    } catch {
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: settings }),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateEmailSetting = (key: keyof NotificationSettings['email'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      email: { ...prev.email, [key]: value },
    }));
  };

  const updatePushSetting = (key: keyof NotificationSettings['push'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      push: { ...prev.push, [key]: value },
    }));
  };

  const updateInAppSetting = (key: keyof NotificationSettings['inApp'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      inApp: { ...prev.inApp, [key]: value },
    }));
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Push notifications are not supported in your browser');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updatePushSetting('enabled', true);
      toast.success('Push notifications enabled');
    } else {
      toast.error('Push notification permission denied');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--foreground)',
          }}
        >
          Notification Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          Choose how you want to be notified
        </p>
      </div>

      {/* Back link */}
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm hover:underline"
        style={{ color: 'var(--primary)' }}
      >
        ← Back to Settings
      </Link>

      {/* Email Notifications */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
          Email Notifications
        </h2>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          <NotificationRow
            label="New Follower"
            description="When someone follows you"
            enabled={settings.email.newFollower}
            onChange={(v) => updateEmailSetting('newFollower', v)}
          />
          <NotificationRow
            label="New Comment"
            description="When someone comments on your post"
            enabled={settings.email.newComment}
            onChange={(v) => updateEmailSetting('newComment', v)}
          />
          <NotificationRow
            label="Comment Replies"
            description="When someone replies to your comment"
            enabled={settings.email.commentReply}
            onChange={(v) => updateEmailSetting('commentReply', v)}
          />
          <NotificationRow
            label="Post Published"
            description="When someone you follow publishes a post"
            enabled={settings.email.postPublished}
            onChange={(v) => updateEmailSetting('postPublished', v)}
          />
          <NotificationRow
            label="Mentions"
            description="When someone mentions you"
            enabled={settings.email.mentions}
            onChange={(v) => updateEmailSetting('mentions', v)}
          />
          <NotificationRow
            label="Direct Messages"
            description="When you receive a direct message"
            enabled={settings.email.directMessages}
            onChange={(v) => updateEmailSetting('directMessages', v)}
          />
          <NotificationRow
            label="Weekly Digest"
            description="A summary of activity from the past week"
            enabled={settings.email.weeklyDigest}
            onChange={(v) => updateEmailSetting('weeklyDigest', v)}
          />
          <NotificationRow
            label="Monthly Newsletter"
            description="Platform updates and featured content"
            enabled={settings.email.monthlyNewsletter}
            onChange={(v) => updateEmailSetting('monthlyNewsletter', v)}
          />
        </div>
      </div>

      {/* Push Notifications */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>
            Push Notifications
          </h2>
          {!settings.push.enabled && (
            <button
              type="button"
              onClick={() => void requestPushPermission()}
              className="text-sm px-3 py-1.5 rounded-lg"
              style={{
                background: 'var(--primary)',
                color: 'var(--background)',
              }}
            >
              Enable Push
            </button>
          )}
        </div>

        {!settings.push.enabled ? (
          <p className="text-sm py-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Enable push notifications to get real-time updates on your device.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            <NotificationRow
              label="New Follower"
              description="Instant notification for new followers"
              enabled={settings.push.newFollower}
              onChange={(v) => updatePushSetting('newFollower', v)}
            />
            <NotificationRow
              label="New Comment"
              description="Instant notification for new comments"
              enabled={settings.push.newComment}
              onChange={(v) => updatePushSetting('newComment', v)}
            />
            <NotificationRow
              label="Comment Replies"
              description="Instant notification for replies"
              enabled={settings.push.commentReply}
              onChange={(v) => updatePushSetting('commentReply', v)}
            />
            <NotificationRow
              label="Post Published"
              description="When someone you follow publishes"
              enabled={settings.push.postPublished}
              onChange={(v) => updatePushSetting('postPublished', v)}
            />
            <NotificationRow
              label="Mentions"
              description="When you're mentioned"
              enabled={settings.push.mentions}
              onChange={(v) => updatePushSetting('mentions', v)}
            />
            <NotificationRow
              label="Direct Messages"
              description="New message notifications"
              enabled={settings.push.directMessages}
              onChange={(v) => updatePushSetting('directMessages', v)}
            />
          </div>
        )}
      </div>

      {/* In-App Notifications */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
          In-App Notifications
        </h2>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          <NotificationRow
            label="New Follower"
            description="Show in notification center"
            enabled={settings.inApp.newFollower}
            onChange={(v) => updateInAppSetting('newFollower', v)}
          />
          <NotificationRow
            label="New Comment"
            description="Show in notification center"
            enabled={settings.inApp.newComment}
            onChange={(v) => updateInAppSetting('newComment', v)}
          />
          <NotificationRow
            label="Comment Replies"
            description="Show in notification center"
            enabled={settings.inApp.commentReply}
            onChange={(v) => updateInAppSetting('commentReply', v)}
          />
          <NotificationRow
            label="Post Published"
            description="Show in notification center"
            enabled={settings.inApp.postPublished}
            onChange={(v) => updateInAppSetting('postPublished', v)}
          />
          <NotificationRow
            label="Mentions"
            description="Show in notification center"
            enabled={settings.inApp.mentions}
            onChange={(v) => updateInAppSetting('mentions', v)}
          />
          <NotificationRow
            label="Direct Messages"
            description="Show in notification center"
            enabled={settings.inApp.directMessages}
            onChange={(v) => updateInAppSetting('directMessages', v)}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
