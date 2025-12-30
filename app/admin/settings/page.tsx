'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface SiteSettings {
  site_name: string;
  site_tagline: string;
  contact_email: string;
  allow_registration: boolean;
  require_application: boolean;
  moderation_enabled: boolean;
  featured_posts_limit: number;
  comments_enabled: boolean;
}

const defaultSettings: SiteSettings = {
  site_name: 'Scroungers Multimedia',
  site_tagline: 'Stories from the margins',
  contact_email: '',
  allow_registration: true,
  require_application: true,
  moderation_enabled: true,
  featured_posts_limit: 5,
  comments_enabled: true,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('key, value');

        if (data) {
          const loadedSettings = { ...defaultSettings };
          data.forEach((setting) => {
            if (setting.key in loadedSettings) {
              (loadedSettings as Record<string, unknown>)[setting.key] = setting.value;
            }
          });
          setSettings(loadedSettings);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Upsert each setting
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('site_settings').upsert({
          key,
          value,
          updated_by: user?.id,
        });
      }

      toast.success('Settings saved!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--accent)',
          }}
        >
          Site Settings
        </h1>
        <p
          className="text-sm sm:text-base mt-1"
          style={{
            color: 'var(--foreground)',
            opacity: 0.7,
            fontFamily: 'var(--font-body)',
          }}
        >
          Configure global platform settings.
        </p>
      </div>

      {/* General Settings */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2
          className="text-lg font-bold mb-6"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--foreground)',
          }}
        >
          General
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="site_name"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Site Name
            </label>
            <input
              id="site_name"
              type="text"
              value={settings.site_name}
              onChange={(e) => updateSetting('site_name', e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="site_tagline"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Site Tagline
            </label>
            <input
              id="site_tagline"
              type="text"
              value={settings.site_tagline}
              onChange={(e) => updateSetting('site_tagline', e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="contact_email"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Contact Email
            </label>
            <input
              id="contact_email"
              type="email"
              value={settings.contact_email}
              onChange={(e) => updateSetting('contact_email', e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
              placeholder="contact@example.com"
            />
          </div>
        </div>
      </div>

      {/* Registration Settings */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2
          className="text-lg font-bold mb-6"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--foreground)',
          }}
        >
          Registration & Access
        </h2>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allow_registration}
              onChange={(e) => updateSetting('allow_registration', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Allow Registration
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Allow new users to create accounts
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.require_application}
              onChange={(e) => updateSetting('require_application', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Require Application for Contributors
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                New users must apply to become contributors
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Content Settings */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2
          className="text-lg font-bold mb-6"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--foreground)',
          }}
        >
          Content
        </h2>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.moderation_enabled}
              onChange={(e) => updateSetting('moderation_enabled', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Enable Moderation
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Posts require editorial approval before publishing
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.comments_enabled}
              onChange={(e) => updateSetting('comments_enabled', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Enable Comments
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Allow users to comment on posts
              </p>
            </div>
          </label>

          <div>
            <label
              htmlFor="featured_posts_limit"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Featured Posts Limit
            </label>
            <input
              id="featured_posts_limit"
              type="number"
              min={1}
              max={20}
              value={settings.featured_posts_limit}
              onChange={(e) => updateSetting('featured_posts_limit', parseInt(e.target.value) || 5)}
              className="w-32 p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
            <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Maximum number of featured posts on homepage
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{
            background: 'var(--primary)',
            color: 'var(--background)',
            boxShadow: '0 0 20px var(--glow-primary)',
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
