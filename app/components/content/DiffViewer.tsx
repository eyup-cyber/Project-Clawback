'use client';

import { useState, useEffect, useMemo } from 'react';

interface DiffViewerProps {
  postId: string;
  versionA: number;
  versionB: number;
}

interface VersionData {
  title: string;
  content: string;
  excerpt?: string;
  versionNumber: number;
  createdAt: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

export default function DiffViewer({ postId, versionA, versionB }: DiffViewerProps) {
  const [versionDataA, setVersionDataA] = useState<VersionData | null>(null);
  const [versionDataB, setVersionDataB] = useState<VersionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>('inline');
  const [showField, setShowField] = useState<'content' | 'title' | 'excerpt'>('content');

  useEffect(() => {
    void fetchVersions();
  }, [postId, versionA, versionB]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);

    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/posts/${postId}/versions?version=${versionA}`),
        fetch(`/api/posts/${postId}/versions?version=${versionB}`),
      ]);

      if (!resA.ok || !resB.ok) {
        setError('Failed to load versions');
        return;
      }

      const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);

      setVersionDataA(dataA.data?.version || null);
      setVersionDataB(dataB.data?.version || null);
    } catch {
      setError('Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  // Simple diff algorithm for text comparison
  const computeDiff = useMemo(() => {
    if (!versionDataA || !versionDataB) return [];

    const textA =
      showField === 'content'
        ? versionDataA.content
        : showField === 'title'
          ? versionDataA.title
          : versionDataA.excerpt || '';

    const textB =
      showField === 'content'
        ? versionDataB.content
        : showField === 'title'
          ? versionDataB.title
          : versionDataB.excerpt || '';

    const linesA = textA.split('\n');
    const linesB = textB.split('\n');

    // Simple line-by-line diff
    const diff: DiffLine[] = [];

    // Track which lines have been matched
    const matchedB = new Set<number>();

    for (let i = 0; i < linesA.length; i++) {
      const lineA = linesA[i];
      const indexInB = linesB.findIndex((l, idx) => l === lineA && !matchedB.has(idx));

      if (indexInB !== -1) {
        matchedB.add(indexInB);
        diff.push({ type: 'unchanged', content: lineA, lineNumber: i + 1 });
      } else {
        diff.push({ type: 'removed', content: lineA, lineNumber: i + 1 });
      }
    }

    // Add lines that are only in B
    for (let i = 0; i < linesB.length; i++) {
      if (!matchedB.has(i)) {
        diff.push({ type: 'added', content: linesB[i], lineNumber: i + 1 });
      }
    }

    return diff;
  }, [versionDataA, versionDataB, showField]);

  const stats = useMemo(() => {
    const added = computeDiff.filter((d) => d.type === 'added').length;
    const removed = computeDiff.filter((d) => d.type === 'removed').length;
    const unchanged = computeDiff.filter((d) => d.type === 'unchanged').length;
    return { added, removed, unchanged };
  }, [computeDiff]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!versionDataA || !versionDataB) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--foreground)', opacity: 0.5 }}>Could not load version data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <select
            value={showField}
            onChange={(e) => setShowField(e.target.value as 'content' | 'title' | 'excerpt')}
            className="px-3 py-2 rounded-lg border outline-none"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            <option value="content">Content</option>
            <option value="title">Title</option>
            <option value="excerpt">Excerpt</option>
          </select>

          <div
            className="flex rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('inline')}
              className={`px-3 py-2 text-sm transition-all ${
                viewMode === 'inline' ? 'bg-[var(--primary)] text-black' : ''
              }`}
              style={{ color: viewMode === 'inline' ? '#000' : 'var(--foreground)' }}
            >
              Inline
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-2 text-sm transition-all ${
                viewMode === 'side-by-side' ? 'bg-[var(--primary)] text-black' : ''
              }`}
              style={{ color: viewMode === 'side-by-side' ? '#000' : 'var(--foreground)' }}
            >
              Side by Side
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500" />
            <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>+{stats.added} added</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500" />
            <span style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              -{stats.removed} removed
            </span>
          </span>
        </div>
      </div>

      {/* Diff display */}
      {viewMode === 'inline' ? (
        <div
          className="rounded-xl border overflow-hidden font-mono text-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="max-h-[60vh] overflow-auto">
            {computeDiff.map((line, index) => (
              <div
                key={index}
                className={`px-4 py-1 flex gap-4 ${
                  line.type === 'added'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : line.type === 'removed'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : ''
                }`}
              >
                <span
                  className="w-6 text-right select-none"
                  style={{ color: 'var(--foreground)', opacity: 0.3 }}
                >
                  {line.lineNumber}
                </span>
                <span
                  className="w-4 select-none font-bold"
                  style={{
                    color:
                      line.type === 'added'
                        ? '#22c55e'
                        : line.type === 'removed'
                          ? '#ef4444'
                          : 'transparent',
                  }}
                >
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span
                  className="flex-1 whitespace-pre-wrap break-words"
                  style={{ color: 'var(--foreground)' }}
                >
                  {line.content || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="px-4 py-2 text-sm font-medium border-b"
              style={{
                background: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              Version {versionA}
            </div>
            <div className="max-h-[50vh] overflow-auto font-mono text-sm p-4">
              <pre
                className="whitespace-pre-wrap break-words"
                style={{ color: 'var(--foreground)' }}
              >
                {showField === 'content'
                  ? versionDataA.content
                  : showField === 'title'
                    ? versionDataA.title
                    : versionDataA.excerpt || '(no excerpt)'}
              </pre>
            </div>
          </div>

          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="px-4 py-2 text-sm font-medium border-b"
              style={{
                background: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              Version {versionB}
            </div>
            <div className="max-h-[50vh] overflow-auto font-mono text-sm p-4">
              <pre
                className="whitespace-pre-wrap break-words"
                style={{ color: 'var(--foreground)' }}
              >
                {showField === 'content'
                  ? versionDataB.content
                  : showField === 'title'
                    ? versionDataB.title
                    : versionDataB.excerpt || '(no excerpt)'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Version info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h4 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Version {versionA}
          </h4>
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {new Date(versionDataA.createdAt).toLocaleString()}
          </p>
        </div>
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h4 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Version {versionB}
          </h4>
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {new Date(versionDataB.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
