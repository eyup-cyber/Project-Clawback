'use client';

/**
 * Site Settings Component
 * Phase 2.12: General, SEO, email, security, features, maintenance mode
 */

import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SiteSettings {
  general: {
    site_name: string;
    site_description: string;
    site_url: string;
    logo_url: string | null;
    favicon_url: string | null;
    timezone: string;
    date_format: string;
    language: string;
  };
  seo: {
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
    og_image_url: string | null;
    twitter_handle: string;
    google_site_verification: string;
    enable_sitemap: boolean;
    enable_robots_txt: boolean;
  };
  email: {
    from_name: string;
    from_email: string;
    reply_to_email: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    smtp_secure: boolean;
    enable_email_verification: boolean;
  };
  security: {
    enable_2fa: boolean;
    require_2fa_for_admins: boolean;
    session_lifetime_minutes: number;
    max_login_attempts: number;
    lockout_duration_minutes: number;
    enable_csrf_protection: boolean;
    enable_rate_limiting: boolean;
    allowed_origins: string[];
    enable_audit_logging: boolean;
  };
  features: {
    enable_registration: boolean;
    enable_applications: boolean;
    require_email_verification: boolean;
    enable_comments: boolean;
    enable_reactions: boolean;
    enable_bookmarks: boolean;
    enable_follows: boolean;
    enable_notifications: boolean;
    enable_search: boolean;
    enable_rss: boolean;
    enable_api: boolean;
  };
  content: {
    posts_per_page: number;
    comments_per_page: number;
    max_post_length: number;
    max_comment_length: number;
    enable_markdown: boolean;
    enable_code_blocks: boolean;
    enable_embeds: boolean;
    allowed_embed_domains: string[];
    enable_content_moderation: boolean;
    auto_approve_verified_users: boolean;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    allowed_ips: string[];
    bypass_for_admins: boolean;
  };
}

type SettingsTab =
  | 'general'
  | 'seo'
  | 'email'
  | 'security'
  | 'features'
  | 'content'
  | 'maintenance';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveMessage({
          type: 'success',
          text: 'Settings saved successfully!',
        });
        setHasChanges(false);
      } else {
        const error = await response.json();
        setSaveMessage({
          type: 'error',
          text: error.message || 'Failed to save settings',
        });
      }
    } catch (_error) {
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const updateSettings = <K extends keyof SiteSettings>(
    section: K,
    updates: Partial<SiteSettings[K]>
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: { ...settings[section], ...updates },
    });
    setHasChanges(true);
  };

  const tabs: { key: SettingsTab; label: string; icon: string }[] = [
    { key: 'general', label: 'General', icon: '⚙️' },
    { key: 'seo', label: 'SEO', icon: '🔍' },
    { key: 'email', label: 'Email', icon: '📧' },
    { key: 'security', label: 'Security', icon: '🔐' },
    { key: 'features', label: 'Features', icon: '✨' },
    { key: 'content', label: 'Content', icon: '📝' },
    { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
  ];

  if (loading || !settings) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="site-settings">
      {/* Header */}
      <div className="header">
        <h1>Site Settings</h1>
        <div className="header-actions">
          {hasChanges && <span className="unsaved-badge">Unsaved changes</span>}
          <button onClick={handleSave} disabled={saving || !hasChanges} className="save-btn">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && <div className={`save-message ${saveMessage.type}`}>{saveMessage.text}</div>}

      <div className="settings-layout">
        {/* Sidebar */}
        <nav className="settings-nav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-content">
          {activeTab === 'general' && (
            <GeneralSettings
              settings={settings.general}
              onChange={(updates) => updateSettings('general', updates)}
            />
          )}
          {activeTab === 'seo' && (
            <SEOSettings
              settings={settings.seo}
              onChange={(updates) => updateSettings('seo', updates)}
            />
          )}
          {activeTab === 'email' && (
            <EmailSettings
              settings={settings.email}
              onChange={(updates) => updateSettings('email', updates)}
            />
          )}
          {activeTab === 'security' && (
            <SecuritySettings
              settings={settings.security}
              onChange={(updates) => updateSettings('security', updates)}
            />
          )}
          {activeTab === 'features' && (
            <FeaturesSettings
              settings={settings.features}
              onChange={(updates) => updateSettings('features', updates)}
            />
          )}
          {activeTab === 'content' && (
            <ContentSettings
              settings={settings.content}
              onChange={(updates) => updateSettings('content', updates)}
            />
          )}
          {activeTab === 'maintenance' && (
            <MaintenanceSettings
              settings={settings.maintenance}
              onChange={(updates) => updateSettings('maintenance', updates)}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .site-settings {
          padding: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted, #6b7280);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .unsaved-badge {
          padding: 0.25rem 0.75rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 999px;
          font-size: 0.875rem;
        }

        .save-btn {
          padding: 0.5rem 1.5rem;
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .save-message {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .save-message.success {
          background: #d1fae5;
          color: #065f46;
        }

        .save-message.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .settings-layout {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 1.5rem;
        }

        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .settings-nav button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 8px;
          text-align: left;
          transition: background 0.2s;
        }

        .settings-nav button:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .settings-nav button.active {
          background: var(--primary-color, #3b82f6);
          color: white;
        }

        .tab-icon {
          font-size: 1.25rem;
        }

        .tab-label {
          font-weight: 500;
        }

        .settings-content {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        @media (max-width: 768px) {
          .settings-layout {
            grid-template-columns: 1fr;
          }

          .settings-nav {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }

          .settings-nav button {
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SETTINGS TABS
// ============================================================================

function GeneralSettings({
  settings,
  onChange,
}: {
  settings: SiteSettings['general'];
  onChange: (updates: Partial<SiteSettings['general']>) => void;
}) {
  return (
    <div className="settings-section">
      <h2>General Settings</h2>
      <p className="section-description">Basic site configuration and branding.</p>

      <div className="form-group">
        <label>Site Name</label>
        <input
          type="text"
          value={settings.site_name}
          onChange={(e) => onChange({ site_name: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Site Description</label>
        <textarea
          value={settings.site_description}
          onChange={(e) => onChange({ site_description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="form-group">
        <label>Site URL</label>
        <input
          type="url"
          value={settings.site_url}
          onChange={(e) => onChange({ site_url: e.target.value })}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Logo URL</label>
          <input
            type="url"
            value={settings.logo_url || ''}
            onChange={(e) => onChange({ logo_url: e.target.value || null })}
          />
        </div>
        <div className="form-group">
          <label>Favicon URL</label>
          <input
            type="url"
            value={settings.favicon_url || ''}
            onChange={(e) => onChange({ favicon_url: e.target.value || null })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>
        <div className="form-group">
          <label>Language</label>
          <select
            value={settings.language}
            onChange={(e) => onChange({ language: e.target.value })}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
      </div>

      <SettingsStyles />
    </div>
  );
}

function SEOSettings({
  settings,
  onChange,
}: {
  settings: SiteSettings['seo'];
  onChange: (updates: Partial<SiteSettings['seo']>) => void;
}) {
  return (
    <div className="settings-section">
      <h2>SEO Settings</h2>
      <p className="section-description">Search engine optimization and social sharing.</p>

      <div className="form-group">
        <label>Meta Title</label>
        <input
          type="text"
          value={settings.meta_title}
          onChange={(e) => onChange({ meta_title: e.target.value })}
        />
        <span className="hint">{settings.meta_title.length}/60 characters</span>
      </div>

      <div className="form-group">
        <label>Meta Description</label>
        <textarea
          value={settings.meta_description}
          onChange={(e) => onChange({ meta_description: e.target.value })}
          rows={2}
        />
        <span className="hint">{settings.meta_description.length}/160 characters</span>
      </div>

      <div className="form-group">
        <label>Meta Keywords</label>
        <input
          type="text"
          value={settings.meta_keywords}
          onChange={(e) => onChange({ meta_keywords: e.target.value })}
          placeholder="Comma-separated keywords"
        />
      </div>

      <div className="form-group">
        <label>Default OG Image URL</label>
        <input
          type="url"
          value={settings.og_image_url || ''}
          onChange={(e) => onChange({ og_image_url: e.target.value || null })}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Twitter Handle</label>
          <input
            type="text"
            value={settings.twitter_handle}
            onChange={(e) => onChange({ twitter_handle: e.target.value })}
            placeholder="@username"
          />
        </div>
        <div className="form-group">
          <label>Google Site Verification</label>
          <input
            type="text"
            value={settings.google_site_verification}
            onChange={(e) => onChange({ google_site_verification: e.target.value })}
          />
        </div>
      </div>

      <div className="form-row checkboxes">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_sitemap}
            onChange={(e) => onChange({ enable_sitemap: e.target.checked })}
          />
          Enable Sitemap
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_robots_txt}
            onChange={(e) => onChange({ enable_robots_txt: e.target.checked })}
          />
          Enable robots.txt
        </label>
      </div>

      <SettingsStyles />
    </div>
  );
}

function EmailSettings({
  settings,
  onChange,
}: {
  settings: SiteSettings['email'];
  onChange: (updates: Partial<SiteSettings['email']>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="settings-section">
      <h2>Email Settings</h2>
      <p className="section-description">Configure email delivery settings.</p>

      <div className="form-row">
        <div className="form-group">
          <label>From Name</label>
          <input
            type="text"
            value={settings.from_name}
            onChange={(e) => onChange({ from_name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>From Email</label>
          <input
            type="email"
            value={settings.from_email}
            onChange={(e) => onChange({ from_email: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Reply-To Email</label>
        <input
          type="email"
          value={settings.reply_to_email}
          onChange={(e) => onChange({ reply_to_email: e.target.value })}
        />
      </div>

      <h3>SMTP Configuration</h3>

      <div className="form-row">
        <div className="form-group">
          <label>SMTP Host</label>
          <input
            type="text"
            value={settings.smtp_host}
            onChange={(e) => onChange({ smtp_host: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>SMTP Port</label>
          <input
            type="number"
            value={settings.smtp_port}
            onChange={(e) => onChange({ smtp_port: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>SMTP Username</label>
          <input
            type="text"
            value={settings.smtp_user}
            onChange={(e) => onChange({ smtp_user: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>SMTP Password</label>
          <div className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              value={settings.smtp_password}
              onChange={(e) => onChange({ smtp_password: e.target.value })}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
      </div>

      <div className="form-row checkboxes">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.smtp_secure}
            onChange={(e) => onChange({ smtp_secure: e.target.checked })}
          />
          Use TLS/SSL
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_email_verification}
            onChange={(e) => onChange({ enable_email_verification: e.target.checked })}
          />
          Require Email Verification
        </label>
      </div>

      <button type="button" className="test-btn">
        📧 Send Test Email
      </button>

      <SettingsStyles />
    </div>
  );
}

function SecuritySettings({
  settings,
  onChange,
}: {
  settings: SiteSettings['security'];
  onChange: (updates: Partial<SiteSettings['security']>) => void;
}) {
  return (
    <div className="settings-section">
      <h2>Security Settings</h2>
      <p className="section-description">Authentication and security configuration.</p>

      <h3>Two-Factor Authentication</h3>
      <div className="form-row checkboxes">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_2fa}
            onChange={(e) => onChange({ enable_2fa: e.target.checked })}
          />
          Enable 2FA
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.require_2fa_for_admins}
            onChange={(e) => onChange({ require_2fa_for_admins: e.target.checked })}
          />
          Require 2FA for Admins
        </label>
      </div>

      <h3>Sessions</h3>
      <div className="form-group">
        <label>Session Lifetime (minutes)</label>
        <input
          type="number"
          value={settings.session_lifetime_minutes}
          onChange={(e) => onChange({ session_lifetime_minutes: parseInt(e.target.value) })}
          min={15}
          max={10080}
        />
        <span className="hint">15 minutes to 7 days</span>
      </div>

      <h3>Login Protection</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Max Login Attempts</label>
          <input
            type="number"
            value={settings.max_login_attempts}
            onChange={(e) => onChange({ max_login_attempts: parseInt(e.target.value) })}
            min={3}
            max={10}
          />
        </div>
        <div className="form-group">
          <label>Lockout Duration (minutes)</label>
          <input
            type="number"
            value={settings.lockout_duration_minutes}
            onChange={(e) => onChange({ lockout_duration_minutes: parseInt(e.target.value) })}
            min={5}
            max={60}
          />
        </div>
      </div>

      <h3>Protection Features</h3>
      <div className="form-row checkboxes">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_csrf_protection}
            onChange={(e) => onChange({ enable_csrf_protection: e.target.checked })}
          />
          CSRF Protection
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_rate_limiting}
            onChange={(e) => onChange({ enable_rate_limiting: e.target.checked })}
          />
          Rate Limiting
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_audit_logging}
            onChange={(e) => onChange({ enable_audit_logging: e.target.checked })}
          />
          Audit Logging
        </label>
      </div>

      <div className="form-group">
        <label>Allowed Origins (CORS)</label>
        <textarea
          value={settings.allowed_origins.join('\n')}
          onChange={(e) =>
            onChange({
              allowed_origins: e.target.value.split('\n').filter(Boolean),
            })
          }
          rows={3}
          placeholder="One URL per line"
        />
      </div>

      <SettingsStyles />
    </div>
  );
}

function FeaturesSettings({
  settings,
  onChange,
}: {
  settings: SiteSettings['features'];
  onChange: (updates: Partial<SiteSettings['features']>) => void;
}) {
  const features = [
    {
      key: 'enable_registration',
      label: 'User Registration',
      description: 'Allow new users to sign up',
    },
    {
      key: 'enable_applications',
      label: 'Contributor Applications',
      description: 'Allow users to apply as contributors',
    },
    {
      key: 'require_email_verification',
      label: 'Email Verification',
      description: 'Require email verification for new accounts',
    },
    {
      key: 'enable_comments',
      label: 'Comments',
      description: 'Allow users to comment on posts',
    },
    {
      key: 'enable_reactions',
      label: 'Reactions',
      description: 'Allow users to react to posts',
    },
    {
      key: 'enable_bookmarks',
      label: 'Bookmarks',
      description: 'Allow users to bookmark posts',
    },
    {
      key: 'enable_follows',
      label: 'Follows',
      description: 'Allow users to follow authors',
    },
    {
      key: 'enable_notifications',
      label: 'Notifications',
      description: 'Enable notification system',
    },
    {
      key: 'enable_search',
      label: 'Search',
      description: 'Enable site search',
    },
    {
      key: 'enable_rss',
      label: 'RSS Feeds',
      description: 'Generate RSS feeds',
    },
    {
      key: 'enable_api',
      label: 'Public API',
      description: 'Enable public API access',
    },
  ] as const;

  return (
    <div className="settings-section">
      <h2>Feature Toggles</h2>
      <p className="section-description">Enable or disable site features.</p>

      <div className="features-grid">
        {features.map((feature) => (
          <label key={feature.key} className="feature-toggle">
            <div className="toggle-content">
              <span className="toggle-label">{feature.label}</span>
              <span className="toggle-description">{feature.description}</span>
            </div>
            <input
              type="checkbox"
              checked={settings[feature.key]}
              onChange={(e) => onChange({ [feature.key]: e.target.checked })}
            />
          </label>
        ))}
      </div>

      <SettingsStyles />
    </div>
  );
}

function ContentSettings({
  settings,
  onChange,
}: {
  settings: SiteSettings['content'];
  onChange: (updates: Partial<SiteSettings['content']>) => void;
}) {
  return (
    <div className="settings-section">
      <h2>Content Settings</h2>
      <p className="section-description">Configure content and moderation settings.</p>

      <h3>Pagination</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Posts Per Page</label>
          <input
            type="number"
            value={settings.posts_per_page}
            onChange={(e) => onChange({ posts_per_page: parseInt(e.target.value) })}
            min={5}
            max={50}
          />
        </div>
        <div className="form-group">
          <label>Comments Per Page</label>
          <input
            type="number"
            value={settings.comments_per_page}
            onChange={(e) => onChange({ comments_per_page: parseInt(e.target.value) })}
            min={10}
            max={100}
          />
        </div>
      </div>

      <h3>Content Limits</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Max Post Length (chars)</label>
          <input
            type="number"
            value={settings.max_post_length}
            onChange={(e) => onChange({ max_post_length: parseInt(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label>Max Comment Length (chars)</label>
          <input
            type="number"
            value={settings.max_comment_length}
            onChange={(e) => onChange({ max_comment_length: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <h3>Content Features</h3>
      <div className="form-row checkboxes">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_markdown}
            onChange={(e) => onChange({ enable_markdown: e.target.checked })}
          />
          Markdown
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_code_blocks}
            onChange={(e) => onChange({ enable_code_blocks: e.target.checked })}
          />
          Code Blocks
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_embeds}
            onChange={(e) => onChange({ enable_embeds: e.target.checked })}
          />
          Embeds
        </label>
      </div>

      <div className="form-group">
        <label>Allowed Embed Domains</label>
        <textarea
          value={settings.allowed_embed_domains.join('\n')}
          onChange={(e) =>
            onChange({
              allowed_embed_domains: e.target.value.split('\n').filter(Boolean),
            })
          }
          rows={3}
          placeholder="One domain per line (e.g., youtube.com)"
        />
      </div>

      <h3>Moderation</h3>
      <div className="form-row checkboxes">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enable_content_moderation}
            onChange={(e) => onChange({ enable_content_moderation: e.target.checked })}
          />
          Enable Content Moderation
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.auto_approve_verified_users}
            onChange={(e) => onChange({ auto_approve_verified_users: e.target.checked })}
          />
          Auto-approve Verified Users
        </label>
      </div>

      <SettingsStyles />
    </div>
  );
}

function MaintenanceSettings({
  settings,
  onChange,
}: {
  settings: SiteSettings['maintenance'];
  onChange: (updates: Partial<SiteSettings['maintenance']>) => void;
}) {
  return (
    <div className="settings-section">
      <h2>Maintenance Mode</h2>
      <p className="section-description">
        Enable maintenance mode to temporarily take the site offline.
      </p>

      <div className="maintenance-toggle">
        <label className="big-toggle">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <span className="toggle-switch" />
          <span className="toggle-text">
            {settings.enabled ? '🔴 Maintenance Mode ON' : '🟢 Site is Live'}
          </span>
        </label>
      </div>

      {settings.enabled && (
        <div className="warning-box">
          ⚠️ Maintenance mode is enabled. Only administrators and allowed IPs can access the site.
        </div>
      )}

      <div className="form-group">
        <label>Maintenance Message</label>
        <textarea
          value={settings.message}
          onChange={(e) => onChange({ message: e.target.value })}
          rows={3}
          placeholder="We're currently performing scheduled maintenance..."
        />
      </div>

      <div className="form-group">
        <label>Allowed IP Addresses</label>
        <textarea
          value={settings.allowed_ips.join('\n')}
          onChange={(e) =>
            onChange({
              allowed_ips: e.target.value.split('\n').filter(Boolean),
            })
          }
          rows={3}
          placeholder="One IP per line"
        />
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={settings.bypass_for_admins}
          onChange={(e) => onChange({ bypass_for_admins: e.target.checked })}
        />
        Allow administrators to bypass maintenance mode
      </label>

      <SettingsStyles />
    </div>
  );
}

// ============================================================================
// SHARED STYLES
// ============================================================================

function SettingsStyles() {
  return (
    <style jsx>{`
      .settings-section h2 {
        margin: 0 0 0.5rem;
        font-size: 1.25rem;
      }

      .settings-section h3 {
        margin: 1.5rem 0 0.75rem;
        font-size: 1rem;
        color: var(--text-muted, #6b7280);
      }

      .section-description {
        margin: 0 0 1.5rem;
        color: var(--text-muted, #6b7280);
      }

      .form-group {
        margin-bottom: 1rem;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 500;
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 8px;
        font-family: inherit;
      }

      .form-group .hint {
        font-size: 0.75rem;
        color: var(--text-muted, #6b7280);
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-row.checkboxes {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        margin-bottom: 1rem;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }

      .password-input {
        display: flex;
        gap: 0.5rem;
      }

      .password-input input {
        flex: 1;
      }

      .password-input button {
        padding: 0.5rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 8px;
        background: white;
        cursor: pointer;
      }

      .test-btn {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 8px;
        background: white;
        cursor: pointer;
      }

      .features-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .feature-toggle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .feature-toggle:hover {
        background: #f9fafb;
      }

      .toggle-content {
        display: flex;
        flex-direction: column;
      }

      .toggle-label {
        font-weight: 500;
      }

      .toggle-description {
        font-size: 0.875rem;
        color: var(--text-muted, #6b7280);
      }

      .maintenance-toggle {
        margin-bottom: 1.5rem;
      }

      .big-toggle {
        display: flex;
        align-items: center;
        gap: 1rem;
        cursor: pointer;
      }

      .toggle-text {
        font-size: 1.25rem;
        font-weight: 600;
      }

      .warning-box {
        padding: 1rem;
        background: #fef3c7;
        color: #92400e;
        border-radius: 8px;
        margin-bottom: 1.5rem;
      }

      @media (max-width: 640px) {
        .form-row {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
