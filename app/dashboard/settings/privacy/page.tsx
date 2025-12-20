'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ConsentRecord {
  category: string;
  consented: boolean;
  timestamp: string;
}

interface PrivacySettings {
  analyticsTracking: boolean;
  marketingEmails: boolean;
  profileVisibility: 'public' | 'followers' | 'private';
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
}

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings>({
    analyticsTracking: true,
    marketingEmails: false,
    profileVisibility: 'public',
    showOnlineStatus: true,
    allowDirectMessages: true,
  });
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');

  const fetchPrivacyData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch privacy settings and consent history
      const [settingsRes, consentsRes] = await Promise.all([
        fetch('/api/users/me/settings'),
        fetch('/api/users/me/consent'),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.data?.privacy) {
          setSettings(settingsData.data.privacy);
        }
      }

      if (consentsRes.ok) {
        const consentsData = await consentsRes.json();
        if (consentsData.data?.consents) {
          setConsents(consentsData.data.consents);
        }
      }
    } catch {
      setError('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPrivacyData();
  }, [fetchPrivacyData]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: settings }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess('Privacy settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async (format: 'json' | 'csv') => {
    try {
      setExportLoading(true);
      const response = await fetch(`/api/users/me/data?format=${format}`);

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('Data exported successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/users/me/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmEmail: deleteEmail,
          mode: 'delete',
          keepContent: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete account');
      }

      // Redirect to homepage after deletion
      window.location.href = '/?account_deleted=true';
    } catch {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

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
          Privacy Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          Control your data and privacy preferences
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

      {/* Alerts */}
      {error && (
        <div
          className="p-4 rounded-lg border"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
          }}
        >
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div
          className="p-4 rounded-lg border"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
            color: '#22c55e',
          }}
        >
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div
            className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          />
        </div>
      ) : (
        <>
          {/* Privacy preferences */}
          <div
            className="p-6 rounded-xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
              Privacy Preferences
            </h2>

            <div className="space-y-4">
              {/* Profile visibility */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  Profile Visibility
                </label>
                <select
                  value={settings.profileVisibility}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      profileVisibility: e.target.value as PrivacySettings['profileVisibility'],
                    }))
                  }
                  className="w-full px-4 py-2 rounded-lg border outline-none"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                >
                  <option value="public">Public - Anyone can see your profile</option>
                  <option value="followers">Followers Only - Only followers can see</option>
                  <option value="private">Private - Only you can see</option>
                </select>
              </div>

              {/* Toggles */}
              {[
                {
                  key: 'analyticsTracking',
                  label: 'Analytics Tracking',
                  desc: 'Help us improve by sharing anonymous usage data',
                },
                {
                  key: 'marketingEmails',
                  label: 'Marketing Emails',
                  desc: 'Receive news, updates, and promotional content',
                },
                {
                  key: 'showOnlineStatus',
                  label: 'Show Online Status',
                  desc: 'Let others see when you&apos;re online',
                },
                {
                  key: 'allowDirectMessages',
                  label: 'Allow Direct Messages',
                  desc: 'Receive messages from other users',
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {item.label}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                      {item.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key as keyof PrivacySettings],
                      }))
                    }
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings[item.key as keyof PrivacySettings]
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        settings[item.key as keyof PrivacySettings]
                          ? 'translate-x-8'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleSaveSettings()}
              disabled={saving}
              className="mt-6 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

          {/* Data export */}
          <div
            className="p-6 rounded-xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--foreground)' }}>
              Export Your Data
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Download a copy of all your data including posts, comments, and profile information.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleExportData('json')}
                disabled={exportLoading}
                className="px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                {exportLoading ? 'Preparing...' : 'Download as JSON'}
              </button>
              <button
                type="button"
                onClick={() => void handleExportData('csv')}
                disabled={exportLoading}
                className="px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                {exportLoading ? 'Preparing...' : 'Download as CSV'}
              </button>
            </div>
          </div>

          {/* Consent history */}
          {consents.length > 0 && (
            <div
              className="p-6 rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
                Consent History
              </h2>
              <div className="space-y-2">
                {consents.map((consent, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--background)' }}
                  >
                    <div>
                      <p className="font-medium capitalize" style={{ color: 'var(--foreground)' }}>
                        {consent.category.replace('_', ' ')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                        {new Date(consent.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        consent.consented
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {consent.consented ? 'Accepted' : 'Declined'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete account */}
          <div
            className="p-6 rounded-xl border"
            style={{ background: 'var(--surface)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <h2 className="font-bold text-lg mb-2" style={{ color: '#ef4444' }}>
              Delete Account
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ border: '1px solid #ef4444', color: '#ef4444' }}
              >
                Delete My Account
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
                  To confirm deletion, please enter your email address:
                </p>
                <input
                  type="email"
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 rounded-lg border outline-none"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirm(false);
                      setDeleteEmail('');
                    }}
                    className="px-4 py-2 rounded-lg transition-all"
                    style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAccount()}
                    disabled={saving || !deleteEmail}
                    className="px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                    style={{ background: '#ef4444', color: 'white' }}
                  >
                    {saving ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GDPR information */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--background)' }}>
            <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Your Privacy Rights
            </h3>
            <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Under GDPR and other privacy regulations, you have the right to access, rectify,
              erase, and port your personal data. If you have any questions about your privacy,
              please contact us at{' '}
              <a
                href="mailto:privacy@scroungers.com"
                className="underline"
                style={{ color: 'var(--primary)' }}
              >
                privacy@scroungers.com
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
