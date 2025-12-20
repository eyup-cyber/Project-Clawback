'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface LegalDocument {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  summary: string | null;
  effective_date: string;
  is_current: boolean;
  requires_acceptance: boolean;
  created_at: string;
}

interface ConsentStats {
  document_type: string;
  total_users: number;
  accepted: number;
  pending: number;
  acceptance_rate: number;
}

type DocumentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'cookie_policy'
  | 'community_guidelines'
  | 'dmca_policy'
  | 'acceptable_use';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'terms_of_service', label: 'Terms of Service' },
  { value: 'privacy_policy', label: 'Privacy Policy' },
  { value: 'cookie_policy', label: 'Cookie Policy' },
  { value: 'community_guidelines', label: 'Community Guidelines' },
  { value: 'dmca_policy', label: 'DMCA Policy' },
  { value: 'acceptable_use', label: 'Acceptable Use Policy' },
];

export default function LegalAdminPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [stats, setStats] = useState<ConsentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'terms_of_service' as DocumentType,
    version: '',
    title: '',
    content: '',
    summary: '',
    effective_date: new Date().toISOString().split('T')[0],
    requires_acceptance: true,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [docsResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/legal${filter !== 'all' ? `?type=${filter}` : ''}`),
        fetch('/api/admin/legal/stats'),
      ]);

      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData.data || getMockDocuments());
      } else {
        setDocuments(getMockDocuments());
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data || getMockStats());
      } else {
        setStats(getMockStats());
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setDocuments(getMockDocuments());
      setStats(getMockStats());
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCreateDocument = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      setShowCreateModal(false);
      resetForm();
      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDocument = async () => {
    if (!selectedDocument) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/legal/${selectedDocument.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update document');
      }

      setShowEditModal(false);
      setSelectedDocument(null);
      resetForm();
      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrent = async (document: LegalDocument) => {
    try {
      const response = await fetch(`/api/admin/legal/${document.id}/set-current`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to set as current');
      }

      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set as current');
    }
  };

  const openEditModal = (document: LegalDocument) => {
    setSelectedDocument(document);
    setFormData({
      type: document.type as DocumentType,
      version: document.version,
      title: document.title,
      content: document.content,
      summary: document.summary || '',
      effective_date: document.effective_date.split('T')[0],
      requires_acceptance: document.requires_acceptance,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'terms_of_service',
      version: '',
      title: '',
      content: '',
      summary: '',
      effective_date: new Date().toISOString().split('T')[0],
      requires_acceptance: true,
    });
  };

  const getTypeLabel = (type: string): string => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
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
            Legal Documents
          </h1>
          <p
            style={{
              color: 'var(--foreground)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Manage terms, policies, and user consents
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          New Document
        </button>
      </div>

      {/* Consent Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.document_type}
            className="p-4 rounded-xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm mb-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              {getTypeLabel(stat.document_type)}
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              {stat.acceptance_rate.toFixed(1)}%
            </p>
            <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
              {stat.accepted} of {stat.total_users} users accepted
            </p>
          </div>
        ))}
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
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            filter === 'all' ? 'ring-2 ring-[var(--primary)]' : ''
          }`}
          style={{
            background: filter === 'all' ? 'var(--primary)' : 'var(--surface)',
            color: filter === 'all' ? 'var(--background)' : 'var(--foreground)',
          }}
        >
          All
        </button>
        {DOCUMENT_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setFilter(type.value)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              filter === type.value ? 'ring-2 ring-[var(--primary)]' : ''
            }`}
            style={{
              background: filter === type.value ? 'var(--primary)' : 'var(--surface)',
              color: filter === type.value ? 'var(--background)' : 'var(--foreground)',
            }}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12">
          <div
            className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold" style={{ color: 'var(--foreground)' }}>
                      {doc.title}
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                    >
                      v{doc.version}
                    </span>
                    {doc.is_current && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ background: '#22c55e' }}
                      >
                        Current
                      </span>
                    )}
                    {doc.requires_acceptance && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
                      >
                        Requires Acceptance
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                    {getTypeLabel(doc.type)}
                  </p>
                  {doc.summary && (
                    <p
                      className="text-sm mb-2"
                      style={{ color: 'var(--foreground)', opacity: 0.7 }}
                    >
                      {doc.summary}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                    Effective: {new Date(doc.effective_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!doc.is_current && (
                    <button
                      type="button"
                      onClick={() => void handleSetCurrent(doc)}
                      className="px-3 py-1 rounded text-sm font-medium"
                      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                    >
                      Set Current
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditModal(doc)}
                    className="px-3 py-1 rounded text-sm font-medium"
                    style={{ background: 'var(--primary)', color: 'var(--background)' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div
              className="text-center py-12 rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <p className="text-4xl mb-2">📄</p>
              <p style={{ color: 'var(--foreground)' }}>No documents found</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ background: 'var(--background)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
              Create Legal Document
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as DocumentType })
                    }
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Version
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Terms of Service"
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Summary
                </label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief description of this document"
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  placeholder="Full document content (supports Markdown)"
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requires_acceptance}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_acceptance: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span style={{ color: 'var(--foreground)' }}>Requires user acceptance</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateDocument()}
                disabled={saving || !formData.title || !formData.version || !formData.content}
                className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                {saving ? 'Creating...' : 'Create Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ background: 'var(--background)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
              Edit: {selectedDocument.title}
            </h2>

            {/* Same form as create */}
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Summary
                </label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={15}
                  className="w-full px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpdateDocument()}
                disabled={saving}
                className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
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
            href="/terms"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            View Terms →
          </Link>
          <Link
            href="/privacy"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            View Privacy Policy →
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
    </div>
  );
}

// Mock data
function getMockDocuments(): LegalDocument[] {
  return [
    {
      id: '1',
      type: 'terms_of_service',
      version: '1.0',
      title: 'Terms of Service',
      content: 'Please read these Terms of Service carefully...',
      summary: 'Our terms govern your use of the platform.',
      effective_date: '2024-01-01T00:00:00Z',
      is_current: true,
      requires_acceptance: true,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      type: 'privacy_policy',
      version: '1.0',
      title: 'Privacy Policy',
      content: 'This Privacy Policy describes how we collect...',
      summary: 'How we collect, use, and protect your data.',
      effective_date: '2024-01-01T00:00:00Z',
      is_current: true,
      requires_acceptance: true,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      type: 'cookie_policy',
      version: '1.0',
      title: 'Cookie Policy',
      content: 'This Cookie Policy explains how we use cookies...',
      summary: 'Information about cookies and tracking.',
      effective_date: '2024-01-01T00:00:00Z',
      is_current: true,
      requires_acceptance: false,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];
}

function getMockStats(): ConsentStats[] {
  return [
    {
      document_type: 'terms_of_service',
      total_users: 1000,
      accepted: 950,
      pending: 50,
      acceptance_rate: 95,
    },
    {
      document_type: 'privacy_policy',
      total_users: 1000,
      accepted: 920,
      pending: 80,
      acceptance_rate: 92,
    },
    {
      document_type: 'cookie_policy',
      total_users: 1000,
      accepted: 800,
      pending: 200,
      acceptance_rate: 80,
    },
  ];
}
