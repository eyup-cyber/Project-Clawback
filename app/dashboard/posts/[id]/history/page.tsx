'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import DiffViewer from '@/app/components/content/DiffViewer';

interface Version {
  id: string;
  postId: string;
  versionNumber: number;
  title: string;
  content: string;
  excerpt?: string;
  changeType: string;
  changeSummary?: string;
  createdAt: string;
  wordCount?: number;
  characterCount?: number;
  createdByProfile?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface VersionStats {
  totalVersions: number;
  firstVersion: string | null;
  latestVersion: string | null;
  totalEditors: number;
}

export default function PostHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [versions, setVersions] = useState<Version[]>([]);
  const [stats, setStats] = useState<VersionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [showDiff, setShowDiff] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [viewingVersion, setViewingVersion] = useState<Version | null>(null);

  useEffect(() => {
    void fetchVersions();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.data?.versions || []);
        setStats(data.data?.stats || null);
      } else if (res.status === 401) {
        toast.error('Please sign in to view version history');
        router.push('/auth');
      } else if (res.status === 403) {
        toast.error("You do not have permission to view this post's history");
        router.push('/dashboard/posts');
      }
    } catch {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    if (
      !confirm(
        `Are you sure you want to restore to version ${versionNumber}? This will create a new version with the restored content.`
      )
    ) {
      return;
    }

    setRestoring(versionNumber);
    try {
      const res = await fetch(`/api/posts/${postId}/versions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber }),
      });

      if (res.ok) {
        toast.success(`Restored to version ${versionNumber}`);
        void fetchVersions();
      } else {
        const data = await res.json();
        toast.error(data.error?.message || 'Failed to restore version');
      }
    } catch {
      toast.error('Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  const handleCompare = () => {
    if (selectedVersions[0] && selectedVersions[1]) {
      setShowDiff(true);
    }
  };

  const toggleVersionSelection = (versionNumber: number) => {
    setSelectedVersions((prev) => {
      if (prev[0] === versionNumber) {
        return [null, prev[1]];
      }
      if (prev[1] === versionNumber) {
        return [prev[0], null];
      }
      if (!prev[0]) {
        return [versionNumber, prev[1]];
      }
      if (!prev[1]) {
        return [prev[0], versionNumber];
      }
      // Both selected, replace the first one
      return [versionNumber, prev[1]];
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'publish':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'revert':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'autosave':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
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
          <Link
            href={`/dashboard/posts/${postId}/edit`}
            className="text-sm hover:underline mb-2 inline-block"
            style={{ color: 'var(--primary)' }}
          >
            ← Back to Editor
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Version History
          </h1>
          {stats && (
            <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              {stats.totalVersions} version{stats.totalVersions !== 1 ? 's' : ''} •
              {stats.totalEditors} editor{stats.totalEditors !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCompare}
            disabled={!selectedVersions[0] || !selectedVersions[1]}
            className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--primary)', color: '#000' }}
          >
            Compare Selected ({selectedVersions.filter(Boolean).length}/2)
          </button>
        </div>
      </div>

      {/* Version list */}
      <div className="space-y-3">
        {versions.map((version, index) => (
          <div
            key={version.id}
            className={`p-4 rounded-xl border transition-all ${
              selectedVersions.includes(version.versionNumber) ? 'ring-2 ring-[var(--primary)]' : ''
            }`}
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start gap-4">
              {/* Selection checkbox */}
              <button
                type="button"
                onClick={() => toggleVersionSelection(version.versionNumber)}
                className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                  selectedVersions.includes(version.versionNumber)
                    ? 'bg-[var(--primary)] border-[var(--primary)]'
                    : 'border-gray-400'
                }`}
                aria-label={`Select version ${version.versionNumber}`}
              >
                {selectedVersions.includes(version.versionNumber) && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#000"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              {/* Version info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    v{version.versionNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getChangeTypeColor(version.changeType)}`}
                  >
                    {version.changeType}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500 text-white">
                      Current
                    </span>
                  )}
                </div>

                <h3 className="font-medium mt-1 truncate" style={{ color: 'var(--foreground)' }}>
                  {version.title}
                </h3>

                {version.changeSummary && (
                  <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                    {version.changeSummary}
                  </p>
                )}

                <div
                  className="flex items-center gap-4 mt-2 text-xs"
                  style={{ color: 'var(--foreground)', opacity: 0.5 }}
                >
                  <span>
                    {version.createdByProfile?.displayName ||
                      version.createdByProfile?.username ||
                      'Unknown'}
                  </span>
                  <span>{formatDate(version.createdAt)}</span>
                  {version.wordCount !== undefined && (
                    <span>{version.wordCount.toLocaleString()} words</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingVersion(version)}
                  className="px-3 py-1 rounded text-sm border transition-all hover:bg-[var(--surface-elevated)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  View
                </button>
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => void handleRestore(version.versionNumber)}
                    disabled={restoring === version.versionNumber}
                    className="px-3 py-1 rounded text-sm border transition-all hover:bg-[var(--surface-elevated)] disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    {restoring === version.versionNumber ? 'Restoring...' : 'Restore'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {versions.length === 0 && (
          <div className="text-center py-16">
            <p style={{ color: 'var(--foreground)', opacity: 0.5 }}>
              No version history available yet.
            </p>
          </div>
        )}
      </div>

      {/* Diff modal */}
      {showDiff && selectedVersions[0] && selectedVersions[1] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--surface)' }}
          >
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                Comparing v{Math.min(selectedVersions[0], selectedVersions[1])} → v
                {Math.max(selectedVersions[0], selectedVersions[1])}
              </h2>
              <button
                type="button"
                onClick={() => setShowDiff(false)}
                className="p-2 rounded-lg hover:bg-[var(--surface-elevated)]"
                style={{ color: 'var(--foreground)' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <DiffViewer
                postId={postId}
                versionA={Math.min(selectedVersions[0], selectedVersions[1])}
                versionB={Math.max(selectedVersions[0], selectedVersions[1])}
              />
            </div>
          </div>
        </div>
      )}

      {/* Version preview modal */}
      {viewingVersion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--surface)' }}
          >
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                  Version {viewingVersion.versionNumber}
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  {formatDate(viewingVersion.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingVersion(null)}
                className="p-2 rounded-lg hover:bg-[var(--surface-elevated)]"
                style={{ color: 'var(--foreground)' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                {viewingVersion.title}
              </h1>
              {viewingVersion.excerpt && (
                <p className="mb-6 text-lg" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                  {viewingVersion.excerpt}
                </p>
              )}
              <div
                className="prose prose-lg max-w-none"
                style={{ color: 'var(--foreground)' }}
                dangerouslySetInnerHTML={{ __html: viewingVersion.content }}
              />
            </div>
            <div
              className="p-4 border-t flex justify-end gap-2"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => setViewingVersion(null)}
                className="px-4 py-2 rounded-lg border transition-all hover:bg-[var(--surface-elevated)]"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Close
              </button>
              {viewingVersion.versionNumber !== versions[0]?.versionNumber && (
                <button
                  type="button"
                  onClick={() => {
                    void handleRestore(viewingVersion.versionNumber);
                    setViewingVersion(null);
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-all"
                  style={{ background: 'var(--primary)', color: '#000' }}
                >
                  Restore This Version
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
