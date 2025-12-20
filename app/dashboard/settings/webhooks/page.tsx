'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
  deliveryCount: number;
  failureCount: number;
}

interface CreateWebhookInput {
  name: string;
  url: string;
  events: string[];
}

const WEBHOOK_EVENTS = [
  { key: 'post.created', label: 'Post Created', description: 'When a new post is created' },
  { key: 'post.published', label: 'Post Published', description: 'When a post is published' },
  { key: 'post.updated', label: 'Post Updated', description: 'When a post is updated' },
  { key: 'post.deleted', label: 'Post Deleted', description: 'When a post is deleted' },
  { key: 'comment.created', label: 'Comment Created', description: 'When a new comment is posted' },
  { key: 'user.registered', label: 'User Registered', description: 'When a new user signs up' },
  {
    key: 'application.submitted',
    label: 'Application Submitted',
    description: 'When a contributor application is submitted',
  },
  {
    key: 'application.approved',
    label: 'Application Approved',
    description: 'When an application is approved',
  },
  {
    key: 'application.rejected',
    label: 'Application Rejected',
    description: 'When an application is rejected',
  },
];

export default function WebhooksSettingsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  // Create form state
  const [formData, setFormData] = useState<CreateWebhookInput>({
    name: '',
    url: '',
    events: [],
  });

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch webhooks');
      }

      setWebhooks(data.data.webhooks || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreateWebhook = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      setError('Name, URL, and at least one event are required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create webhook');
      }

      // Show the secret once
      if (data.data.webhook.secret) {
        setNewWebhookSecret(data.data.webhook.secret);
      }

      await fetchWebhooks();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWebhook = async (webhook: Webhook) => {
    try {
      const response = await fetch('/api/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: webhook.id,
          active: !webhook.active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update webhook');
      }

      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, active: !w.active } : w))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update webhook');
    }
  };

  const handleDeleteWebhook = async (webhook: Webhook) => {
    if (!confirm(`Are you sure you want to delete the webhook "${webhook.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/webhooks?id=${webhook.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete webhook');
      }

      setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (webhook: Webhook) => {
    try {
      const response = await fetch(`/api/webhooks/${webhook.id}/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Test failed');
      }

      alert('Test webhook sent successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: [],
    });
  };

  const toggleEvent = (eventKey: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventKey)
        ? prev.events.filter((e) => e !== eventKey)
        : [...prev.events, eventKey],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--foreground)',
            }}
          >
            Webhooks
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Receive real-time notifications when events happen
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
          + Add Webhook
        </button>
      </div>

      {/* Back link */}
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm hover:underline"
        style={{ color: 'var(--primary)' }}
      >
        ← Back to Settings
      </Link>

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

      {/* New webhook secret display */}
      {newWebhookSecret && (
        <div
          className="p-4 rounded-lg border"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
          }}
        >
          <h3 className="font-medium mb-2" style={{ color: '#22c55e' }}>
            🔐 Webhook Secret Created
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Save this secret securely. It will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 p-3 rounded-lg font-mono text-sm break-all"
              style={{ background: 'var(--background)', color: 'var(--foreground)' }}
            >
              {newWebhookSecret}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(newWebhookSecret);
                alert('Secret copied to clipboard!');
              }}
              className="px-3 py-2 rounded-lg"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}
            >
              Copy
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewWebhookSecret(null)}
            className="mt-3 text-sm underline"
            style={{ color: 'var(--foreground)', opacity: 0.6 }}
          >
            I&apos;ve saved my secret
          </button>
        </div>
      )}

      {/* Webhooks list */}
      {loading ? (
        <div className="text-center py-12">
          <div
            className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          />
          <p className="mt-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Loading webhooks...
          </p>
        </div>
      ) : webhooks.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-6xl mb-4">🔗</div>
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>No webhooks configured yet</p>
          <p className="text-sm mt-2" style={{ color: 'var(--foreground)', opacity: 0.4 }}>
            Add a webhook to receive notifications when events happen
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ background: 'var(--primary)', color: 'var(--background)' }}
          >
            Create your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`p-6 rounded-lg border transition-all ${
                webhook.active ? '' : 'opacity-60'
              }`}
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Webhook info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold truncate" style={{ color: 'var(--foreground)' }}>
                      {webhook.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        webhook.active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <code
                    className="text-sm break-all"
                    style={{ color: 'var(--foreground)', opacity: 0.6 }}
                  >
                    {webhook.url}
                  </code>

                  {/* Events */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div
                    className="flex flex-wrap gap-4 mt-3 text-xs"
                    style={{ color: 'var(--foreground)', opacity: 0.5 }}
                  >
                    <span>{webhook.deliveryCount} deliveries</span>
                    {webhook.failureCount > 0 && (
                      <span style={{ color: '#ef4444' }}>{webhook.failureCount} failures</span>
                    )}
                    {webhook.lastTriggeredAt && (
                      <span>
                        Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
                      </span>
                    )}
                    <span>Created: {new Date(webhook.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 lg:items-end">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => void handleToggleWebhook(webhook)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      webhook.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={webhook.active ? 'Disable webhook' : 'Enable webhook'}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        webhook.active ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleTestWebhook(webhook)}
                      className="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                      style={{ background: 'var(--secondary)', color: 'var(--background)' }}
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteWebhook(webhook)}
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

      {/* Documentation link */}
      <div
        className="p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          Webhook Documentation
        </h3>
        <p className="text-sm mb-3" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          Learn how to verify webhook signatures and handle events in your application.
        </p>
        <Link
          href="/docs/api/webhooks"
          className="text-sm hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          View Documentation →
        </Link>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
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
              style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
            >
              Create Webhook
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="webhook-name"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Name *
                </label>
                <input
                  id="webhook-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My Webhook"
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* URL */}
              <div>
                <label
                  htmlFor="webhook-url"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Endpoint URL *
                </label>
                <input
                  id="webhook-url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://your-server.com/webhook"
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Must be HTTPS for security
                </p>
              </div>

              {/* Events */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  Events * (select at least one)
                </label>
                <div
                  className="space-y-2 max-h-60 overflow-y-auto p-3 rounded-lg"
                  style={{ background: 'var(--background)' }}
                >
                  {WEBHOOK_EVENTS.map((event) => (
                    <label
                      key={event.key}
                      className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--surface-elevated)]"
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.key)}
                        onChange={() => toggleEvent(event.key)}
                        className="mt-1 w-4 h-4 rounded"
                      />
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                          {event.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                          {event.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Selected: {formData.events.length} event(s)
                </p>
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
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateWebhook()}
                disabled={saving || !formData.name || !formData.url || formData.events.length === 0}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                {saving ? 'Creating...' : 'Create Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
