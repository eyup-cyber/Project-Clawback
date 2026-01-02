/**
 * Display Settings Page
 * Phase 1.1.7: User display and appearance preferences
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

type Theme = 'system' | 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';
type ContentDensity = 'compact' | 'comfortable' | 'spacious';

interface DisplaySettings {
  theme: Theme;
  fontSize: FontSize;
  contentDensity: ContentDensity;
  reducedMotion: boolean;
  highContrast: boolean;
  showReadingProgress: boolean;
  autoplayVideos: boolean;
  showImages: boolean;
  codeTheme: 'light' | 'dark' | 'auto';
}

const defaultSettings: DisplaySettings = {
  theme: 'system',
  fontSize: 'medium',
  contentDensity: 'comfortable',
  reducedMotion: false,
  highContrast: false,
  showReadingProgress: true,
  autoplayVideos: false,
  showImages: true,
  codeTheme: 'auto',
};

// ============================================================================
// ICONS
// ============================================================================

const SunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

// ============================================================================
// COMPONENTS
// ============================================================================

interface ThemeCardProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

function ThemeCard({ selected, onClick, label, icon }: ThemeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select ${label} theme`}
      aria-pressed={selected}
      className={`relative p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            selected ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-sm font-medium ${selected ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}
        >
          {label}
        </span>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <polyline points="20 6 9 17 4 12" strokeWidth="3" stroke="white" fill="none" />
          </svg>
        </div>
      )}
    </button>
  );
}

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DisplaySettingsPage() {
  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      // Try to load from localStorage first for immediate UI
      const localSettings = localStorage.getItem('displaySettings');
      if (localSettings) {
        setSettings(JSON.parse(localSettings));
      }

      // Then fetch from server
      const res = await fetch('/api/users/me/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.data?.display) {
          setSettings(data.data.display);
          localStorage.setItem('displaySettings', JSON.stringify(data.data.display));
        }
      }
    } catch {
      // Fall back to localStorage if API fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // Apply theme immediately when changed
  useEffect(() => {
    const root = document.documentElement;

    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply font size
    root.style.setProperty(
      '--base-font-size',
      settings.fontSize === 'small' ? '14px' : settings.fontSize === 'large' ? '18px' : '16px'
    );

    // Apply reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Save to localStorage for immediate persistence
    localStorage.setItem('displaySettings', JSON.stringify(settings));
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display: settings }),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success('Display settings saved');
    } catch {
      toast.error('Failed to save display settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
          Display Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          Customize how the app looks and feels
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

      {/* Theme */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
          Theme
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <ThemeCard
            selected={settings.theme === 'light'}
            onClick={() => updateSetting('theme', 'light')}
            label="Light"
            icon={<SunIcon />}
          />
          <ThemeCard
            selected={settings.theme === 'dark'}
            onClick={() => updateSetting('theme', 'dark')}
            label="Dark"
            icon={<MoonIcon />}
          />
          <ThemeCard
            selected={settings.theme === 'system'}
            onClick={() => updateSetting('theme', 'system')}
            label="System"
            icon={<MonitorIcon />}
          />
        </div>
      </div>

      {/* Font Size */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
          Font Size
        </h2>
        <div className="flex items-center gap-4">
          {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => updateSetting('fontSize', size)}
              className={`flex-1 py-3 rounded-lg border-2 transition-all font-medium capitalize ${
                settings.fontSize === size
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              style={{
                fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px',
              }}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          Preview: This is how text will appear with the selected font size.
        </p>
      </div>

      {/* Content Density */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
          Content Density
        </h2>
        <div className="flex items-center gap-4">
          {(['compact', 'comfortable', 'spacious'] as ContentDensity[]).map((density) => (
            <button
              key={density}
              type="button"
              onClick={() => updateSetting('contentDensity', density)}
              className={`flex-1 py-3 rounded-lg border-2 transition-all font-medium capitalize ${
                settings.contentDensity === density
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {density}
            </button>
          ))}
        </div>
      </div>

      {/* Code Theme */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
          Code Block Theme
        </h2>
        <select
          value={settings.codeTheme}
          onChange={(e) =>
            updateSetting('codeTheme', e.target.value as DisplaySettings['codeTheme'])
          }
          className="w-full px-4 py-2 rounded-lg border outline-none"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          <option value="auto">Match app theme</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* Accessibility */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
          Accessibility
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Reduced Motion
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Minimize animations throughout the app
              </p>
            </div>
            <Toggle
              enabled={settings.reducedMotion}
              onChange={(v) => updateSetting('reducedMotion', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                High Contrast
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Increase contrast for better visibility
              </p>
            </div>
            <Toggle
              enabled={settings.highContrast}
              onChange={(v) => updateSetting('highContrast', v)}
            />
          </div>
        </div>
      </div>

      {/* Reading Experience */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
          Reading Experience
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Show Reading Progress
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Display progress bar when reading articles
              </p>
            </div>
            <Toggle
              enabled={settings.showReadingProgress}
              onChange={(v) => updateSetting('showReadingProgress', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Show Images
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Display images in articles (disable to save data)
              </p>
            </div>
            <Toggle
              enabled={settings.showImages}
              onChange={(v) => updateSetting('showImages', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Autoplay Videos
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Automatically play videos when visible
              </p>
            </div>
            <Toggle
              enabled={settings.autoplayVideos}
              onChange={(v) => updateSetting('autoplayVideos', v)}
            />
          </div>
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
