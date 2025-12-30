/**
 * Settings Page
 * Phase 1.1.7: Main settings hub with links to subsections
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/hooks/useAuth';

// ============================================================================
// ICONS
// ============================================================================

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const PaletteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ============================================================================
// SETTINGS LINK COMPONENT
// ============================================================================

interface SettingsLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function SettingsLink({ href, icon, title, description }: SettingsLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md hover:scale-[1.01]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--primary)', color: 'var(--background)' }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          {description}
        </p>
      </div>
      <ChevronRightIcon />
    </Link>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SettingsPage() {
  const { profile, updateProfile, updatePassword, loading } = useAuth();
  const [saving, setSaving] = useState(false);

  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [kofiUsername, setKofiUsername] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setWebsiteUrl(profile.website_url || '');
      setTwitterHandle(profile.twitter_handle || '');
      setKofiUsername(profile.kofi_username || '');
    }
  }, [profile]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({
        display_name: displayName,
        bio,
        location,
        website_url: websiteUrl || null,
        twitter_handle: twitterHandle || null,
        kofi_username: kofiUsername || null,
      });

      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{
            borderColor: 'var(--border)',
            borderTopColor: 'var(--primary)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--primary)',
          }}
        >
          Settings
        </h1>
        <p
          className="text-sm sm:text-base mt-1"
          style={{
            color: 'var(--foreground)',
            opacity: 0.7,
            fontFamily: 'var(--font-body)',
          }}
        >
          Manage your account preferences.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SettingsLink
          href="/dashboard/settings/notifications"
          icon={<BellIcon />}
          title="Notifications"
          description="Email, push, and in-app preferences"
        />
        <SettingsLink
          href="/dashboard/settings/display"
          icon={<PaletteIcon />}
          title="Display"
          description="Theme, font size, and appearance"
        />
        <SettingsLink
          href="/dashboard/settings/privacy"
          icon={<ShieldIcon />}
          title="Privacy"
          description="Data, visibility, and consent"
        />
        <SettingsLink
          href="/dashboard/settings/security"
          icon={<LockIcon />}
          title="Security"
          description="Password, 2FA, and sessions"
        />
      </div>

      {/* Profile Settings */}
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
          Profile Information
        </h2>

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-lg border resize-none"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
              placeholder="Tell readers about yourself..."
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
              placeholder="City, Country"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Twitter/X Handle
            </label>
            <div className="flex">
              <span
                className="px-3 py-3 rounded-l-lg border border-r-0"
                style={{
                  background: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  opacity: 0.7,
                }}
              >
                @
              </span>
              <input
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                className="flex-1 p-3 rounded-r-lg border"
                style={{
                  background: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
                placeholder="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary)' }}>
              ☕ Ko-fi Username
            </label>
            <input
              type="text"
              value={kofiUsername}
              onChange={(e) => setKofiUsername(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
              placeholder="Your Ko-fi username"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Your Ko-fi donation button will appear on your posts.
            </p>
          </div>

          <button
            onClick={() => {
              void handleProfileSave();
            }}
            disabled={saving}
            className="w-full py-3 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'var(--primary)',
              color: 'var(--background)',
              boxShadow: '0 0 20px var(--glow-primary)',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password Settings */}
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
          Change Password
        </h2>

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
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
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <button
            onClick={() => {
              void handlePasswordChange();
            }}
            disabled={changingPassword || !newPassword || !confirmPassword}
            className="w-full py-3 rounded-lg font-medium border transition-all hover:bg-[var(--surface-elevated)] disabled:opacity-50"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            {changingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--accent)' }}
      >
        <h2
          className="text-lg font-bold mb-4"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--accent)',
          }}
        >
          Danger Zone
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          className="px-6 py-2 rounded-lg font-medium border transition-all hover:bg-[var(--accent)] hover:text-[var(--background)]"
          style={{
            borderColor: 'var(--accent)',
            color: 'var(--accent)',
          }}
          onClick={() => toast.error('Please contact support to delete your account')}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
