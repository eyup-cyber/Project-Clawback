'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  description?: string;
  contentType: string;
  visibility: 'private' | 'team' | 'public';
  useCount: number;
  lastUsedAt?: string;
  createdAt: string;
  author?: {
    username: string;
    displayName?: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  written: '📝 Article',
  video: '🎬 Video',
  audio: '🎧 Audio',
  gallery: '🖼️ Gallery',
};

const VISIBILITY_LABELS: Record<string, { label: string; color: string }> = {
  private: { label: 'Private', color: 'bg-gray-100 text-gray-800' },
  team: { label: 'Team', color: 'bg-blue-100 text-blue-800' },
  public: { label: 'Public', color: 'bg-green-100 text-green-800' },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'team' | 'public'>('all');
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    description: string;
    contentType: string;
    visibility: 'private' | 'team' | 'public';
  }>({
    name: '',
    description: '',
    contentType: 'written',
    visibility: 'private',
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'mine') params.set('mine', 'true');
      if (filter === 'team') params.set('visibility', 'team');
      if (filter === 'public') params.set('visibility', 'public');

      const res = await fetch(`/api/templates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.data?.templates || []);
      }
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplate.name,
          description: newTemplate.description,
          contentType: newTemplate.contentType,
          visibility: newTemplate.visibility,
          contentTemplate: '<p>Start writing here...</p>',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Template created');
        setShowCreateModal(false);
        setNewTemplate({
          name: '',
          description: '',
          contentType: 'written',
          visibility: 'private',
        });
        // Navigate to edit the new template
        window.location.href = `/dashboard/templates/${data.data.id}/edit`;
      } else {
        const error = await res.json();
        toast.error(error.error?.message || 'Failed to create template');
      }
    } catch {
      toast.error('Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Template deleted');
        void fetchTemplates();
      } else {
        toast.error('Failed to delete template');
      }
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Post created from template');
        window.location.href = `/dashboard/posts/${data.data.postId}/edit`;
      } else {
        toast.error('Failed to create post from template');
      }
    } catch {
      toast.error('Failed to create post from template');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Templates
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Create and manage reusable post templates
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg font-medium transition-all"
          style={{ background: 'var(--primary)', color: '#000' }}
        >
          + New Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'mine', 'team', 'public'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === f ? 'ring-2 ring-[var(--primary)]' : ''
            }`}
            style={{
              background: filter === f ? 'var(--primary)' : 'var(--surface)',
              color: filter === f ? '#000' : 'var(--foreground)',
            }}
          >
            {f === 'all'
              ? 'All Templates'
              : f === 'mine'
                ? 'My Templates'
                : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="p-4 rounded-xl border transition-all hover:shadow-lg"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {template.name}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  {CONTENT_TYPE_LABELS[template.contentType] || template.contentType}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${VISIBILITY_LABELS[template.visibility].color}`}
              >
                {VISIBILITY_LABELS[template.visibility].label}
              </span>
            </div>

            {template.description && (
              <p
                className="text-sm mb-3 line-clamp-2"
                style={{ color: 'var(--foreground)', opacity: 0.7 }}
              >
                {template.description}
              </p>
            )}

            <div
              className="flex items-center gap-4 text-xs mb-4"
              style={{ color: 'var(--foreground)', opacity: 0.5 }}
            >
              <span>Used {template.useCount} times</span>
              {template.lastUsedAt && <span>Last used {formatDate(template.lastUsedAt)}</span>}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleUseTemplate(template.id)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--primary)', color: '#000' }}
              >
                Use Template
              </button>
              <Link
                href={`/dashboard/templates/${template.id}/edit`}
                className="px-3 py-2 rounded-lg text-sm border transition-all hover:bg-[var(--surface-elevated)]"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => void handleDelete(template.id)}
                className="px-3 py-2 rounded-lg text-sm border transition-all hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-16">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-lg mb-2" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
              No templates found
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.4 }}>
              Create a template to speed up your content creation
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{ background: 'var(--primary)', color: '#000' }}
            >
              Create Your First Template
            </button>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--surface)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
              Create Template
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="template-name"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Name
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., News Article"
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="template-description"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Description
                </label>
                <textarea
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      description: e.target.value,
                    })
                  }
                  placeholder="What is this template for?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border outline-none resize-none"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="template-type"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Content Type
                </label>
                <select
                  id="template-type"
                  value={newTemplate.contentType}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      contentType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                >
                  <option value="written">Article</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="gallery">Gallery</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="template-visibility"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Visibility
                </label>
                <select
                  id="template-visibility"
                  value={newTemplate.visibility}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      visibility: e.target.value as 'private' | 'team' | 'public',
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                >
                  <option value="private">Private - Only you</option>
                  <option value="team">Team - Contributors & editors</option>
                  <option value="public">Public - Everyone</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 rounded-lg border transition-all hover:bg-[var(--surface-elevated)]"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="flex-1 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ background: 'var(--primary)', color: '#000' }}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
