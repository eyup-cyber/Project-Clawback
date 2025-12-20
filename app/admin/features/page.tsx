'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  targetUserIds: string[] | null;
  targetRoles: string[] | null;
  environments: string[] | null;
  tags: string[] | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdByProfile: { username: string; display_name: string } | null;
}

interface CreateFlagInput {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRoles?: string[];
  tags?: string[];
}

const AVAILABLE_ROLES = ['admin', 'editor', 'contributor', 'reader'];
const SUGGESTED_TAGS = ['beta', 'experimental', 'deprecated', 'internal', 'premium'];

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Create/Edit form state
  const [formData, setFormData] = useState<CreateFlagInput>({
    key: '',
    name: '',
    description: '',
    enabled: false,
    rolloutPercentage: 100,
    targetRoles: [],
    tags: [],
  });

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('enabled', filter === 'enabled' ? 'true' : 'false');
      }

      const response = await fetch(`/api/admin/features?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch flags');
      }

      setFlags(data.data.flags);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchFlags();
  }, [fetchFlags]);

  const filteredFlags = flags.filter((flag) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      flag.key.toLowerCase().includes(query) ||
      flag.name.toLowerCase().includes(query) ||
      flag.description?.toLowerCase().includes(query) ||
      flag.tags?.some((t) => t.toLowerCase().includes(query))
    );
  });

  const handleToggleFlag = async (flag: FeatureFlag) => {
    try {
      const response = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ id: flag.id, enabled: !flag.enabled }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle flag');
      }

      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle flag');
    }
  };

  const handleUpdateRollout = async (flag: FeatureFlag, percentage: number) => {
    try {
      const response = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ id: flag.id, rolloutPercentage: percentage }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rollout');
      }

      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, rolloutPercentage: percentage } : f))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rollout');
    }
  };

  const handleCreateFlag = async () => {
    if (!formData.key || !formData.name) {
      setError('Key and name are required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create flag');
      }

      setShowCreateModal(false);
      resetForm();
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flag');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFlag = async (flag: FeatureFlag) => {
    if (
      !confirm(
        `Are you sure you want to delete the flag "${flag.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/features/${flag.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete flag');
      }

      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flag');
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      enabled: false,
      rolloutPercentage: 100,
      targetRoles: [],
      tags: [],
    });
  };

  const openEditModal = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      targetRoles: flag.targetRoles || [],
      tags: flag.tags || [],
    });
  };

  const handleKeyInput = (value: string) => {
    // Auto-format key: lowercase, underscores only
    const formatted = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]/, '');
    setFormData((prev) => ({ ...prev, key: formatted }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--accent)',
            }}
          >
            Feature Flags
          </h1>
          <p
            style={{
              color: 'var(--foreground)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Control feature rollouts and A/B testing
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          + Create Flag
        </button>
      </div>

      {/* Error display */}
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

      {/* Filters */}
      <div
        className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search flags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'enabled', 'disabled'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f ? 'ring-2 ring-[var(--primary)]' : ''
              }`}
              style={{
                background: filter === f ? 'var(--primary)' : 'var(--background)',
                color: filter === f ? 'var(--background)' : 'var(--foreground)',
                borderColor: 'var(--border)',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Flags list */}
      {loading ? (
        <div className="text-center py-12">
          <div
            className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--primary)',
            }}
          />
          <p className="mt-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Loading flags...
          </p>
        </div>
      ) : filteredFlags.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-6xl mb-4">🚩</div>
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {searchQuery ? 'No flags match your search' : 'No feature flags yet'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}
            >
              Create your first flag
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFlags.map((flag) => (
            <div
              key={flag.id}
              className="p-6 rounded-lg border transition-all hover:shadow-md"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Flag info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className="text-lg font-bold truncate"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {flag.name}
                    </h3>
                    <code
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        opacity: 0.7,
                      }}
                    >
                      {flag.key}
                    </code>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        flag.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {flag.description && (
                    <p
                      className="text-sm mb-3"
                      style={{ color: 'var(--foreground)', opacity: 0.6 }}
                    >
                      {flag.description}
                    </p>
                  )}

                  {/* Tags */}
                  {flag.tags && flag.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {flag.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Target roles */}
                  {flag.targetRoles && flag.targetRoles.length > 0 && (
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                        Target Roles:
                      </span>
                      {flag.targetRoles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            background: 'var(--primary)',
                            color: 'var(--background)',
                            opacity: 0.9,
                          }}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta info */}
                  <div
                    className="flex flex-wrap gap-4 text-xs"
                    style={{ color: 'var(--foreground)', opacity: 0.5 }}
                  >
                    <span>Created {new Date(flag.createdAt).toLocaleDateString()}</span>
                    {flag.createdByProfile && (
                      <span>
                        by {flag.createdByProfile.display_name || flag.createdByProfile.username}
                      </span>
                    )}
                    <span>Updated {new Date(flag.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-4 lg:items-end">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => void handleToggleFlag(flag)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      flag.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={flag.enabled ? 'Disable flag' : 'Enable flag'}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        flag.enabled ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Rollout slider */}
                  <div className="w-full lg:w-48">
                    <label className="flex items-center justify-between text-sm mb-1">
                      <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>Rollout</span>
                      <span style={{ color: 'var(--primary)' }}>{flag.rolloutPercentage}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={flag.rolloutPercentage}
                      onChange={(e) => void handleUpdateRollout(flag, parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ background: 'var(--border)' }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(flag)}
                      className="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                      style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteFlag(flag)}
                      className="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                      style={{ border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div
        className="p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          Related
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/experiments"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            A/B Experiments →
          </Link>
          <Link
            href="/admin"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Admin Dashboard →
          </Link>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingFlag) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ background: 'var(--surface)' }}
          >
            <h2
              className="text-2xl font-bold mb-6"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--foreground)',
              }}
            >
              {editingFlag ? 'Edit Flag' : 'Create Feature Flag'}
            </h2>

            <div className="space-y-4">
              {/* Key */}
              <div>
                <label
                  htmlFor="flag-key"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Key *
                </label>
                <input
                  id="flag-key"
                  type="text"
                  value={formData.key}
                  onChange={(e) => handleKeyInput(e.target.value)}
                  disabled={!!editingFlag}
                  placeholder="my_feature_flag"
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2 disabled:opacity-50"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Lowercase letters, numbers, and underscores only
                </p>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="flag-name"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Name *
                </label>
                <input
                  id="flag-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My Feature Flag"
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="flag-description"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Description
                </label>
                <textarea
                  id="flag-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe what this flag controls..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2 resize-none"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="flag-enabled"
                  className="text-sm font-medium"
                  style={{ color: 'var(--foreground)' }}
                >
                  Enabled by default
                </label>
                <button
                  id="flag-enabled"
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-pressed={formData.enabled}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      formData.enabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Rollout percentage */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium mb-2">
                  <span style={{ color: 'var(--foreground)' }}>Rollout Percentage</span>
                  <span style={{ color: 'var(--primary)' }}>{formData.rolloutPercentage}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.rolloutPercentage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rolloutPercentage: parseInt(e.target.value),
                    }))
                  }
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: 'var(--border)' }}
                />
                <div
                  className="flex justify-between text-xs mt-1"
                  style={{ color: 'var(--foreground)', opacity: 0.5 }}
                >
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Target roles */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  Target Roles (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          targetRoles: prev.targetRoles?.includes(role)
                            ? prev.targetRoles.filter((r) => r !== role)
                            : [...(prev.targetRoles || []), role],
                        }));
                      }}
                      className={`px-3 py-1 rounded text-sm transition-all ${
                        formData.targetRoles?.includes(role) ? 'ring-2 ring-[var(--primary)]' : ''
                      }`}
                      style={{
                        background: formData.targetRoles?.includes(role)
                          ? 'var(--primary)'
                          : 'var(--background)',
                        color: formData.targetRoles?.includes(role)
                          ? 'var(--background)'
                          : 'var(--foreground)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  Tags (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          tags: prev.tags?.includes(tag)
                            ? prev.tags.filter((t) => t !== tag)
                            : [...(prev.tags || []), tag],
                        }));
                      }}
                      className={`px-3 py-1 rounded text-sm transition-all ${
                        formData.tags?.includes(tag) ? 'ring-2 ring-[var(--secondary)]' : ''
                      }`}
                      style={{
                        background: formData.tags?.includes(tag)
                          ? 'var(--secondary)'
                          : 'var(--background)',
                        color: formData.tags?.includes(tag)
                          ? 'var(--background)'
                          : 'var(--foreground)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div
              className="flex justify-end gap-3 mt-6 pt-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingFlag(null);
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateFlag()}
                disabled={saving || !formData.key || !formData.name}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                {saving ? 'Saving...' : editingFlag ? 'Save Changes' : 'Create Flag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
