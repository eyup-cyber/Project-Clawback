'use client';

/**
 * Version History Component
 * Phase 3.6: Save versions, diff view, restore, compare
 */

import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Version {
  id: string;
  documentId: string;
  version: number;
  content: string;
  html: string;
  title: string;
  wordCount: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  changeType: 'auto' | 'manual' | 'publish' | 'restore';
  changeSummary?: string;
}

interface VersionHistoryProps {
  documentId: string;
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (version: Version) => void;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VersionHistory({
  documentId,
  editor,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'diff'>('preview');
  const [restoring, setRestoring] = useState(false);

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${documentId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions);
        if (data.versions.length > 0) {
          setSelectedVersion(data.versions[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, fetchVersions]);

  // Create new version
  const createVersion = useCallback(
    async (changeSummary?: string) => {
      if (!editor) return;

      try {
        const response = await fetch(`/api/posts/${documentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: JSON.stringify(editor.getJSON()),
            html: editor.getHTML(),
            changeType: 'manual',
            changeSummary,
          }),
        });

        if (response.ok) {
          fetchVersions();
        }
      } catch (error) {
        console.error('Failed to create version:', error);
      }
    },
    [documentId, editor, fetchVersions]
  );

  // Restore version
  const handleRestore = useCallback(
    async (version: Version) => {
      if (!editor || restoring) return;

      setRestoring(true);
      try {
        // Create a backup of current content first
        await fetch(`/api/posts/${documentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: JSON.stringify(editor.getJSON()),
            html: editor.getHTML(),
            changeType: 'auto',
            changeSummary: 'Auto-saved before restore',
          }),
        });

        // Restore the selected version
        const content = JSON.parse(version.content);
        editor.commands.setContent(content);

        // Log the restore
        await fetch(`/api/posts/${documentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: version.content,
            html: version.html,
            changeType: 'restore',
            changeSummary: `Restored from version ${version.version}`,
          }),
        });

        onRestore(version);
        onClose();
      } catch (error) {
        console.error('Failed to restore version:', error);
      } finally {
        setRestoring(false);
      }
    },
    [documentId, editor, restoring, onRestore, onClose]
  );

  // Get diff between two versions
  const getDiff = useCallback((oldContent: string, newContent: string): DiffLine[] => {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diff: DiffLine[] = [];

    // Simple line-by-line diff (in production, use a proper diff library)
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        if (oldLine !== undefined) {
          diff.push({
            type: 'unchanged',
            content: oldLine,
            lineNumber: i + 1,
          });
        }
      } else {
        if (oldLine !== undefined) {
          diff.push({ type: 'removed', content: oldLine, lineNumber: i + 1 });
        }
        if (newLine !== undefined) {
          diff.push({ type: 'added', content: newLine, lineNumber: i + 1 });
        }
      }
    }

    return diff;
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getChangeIcon = (type: Version['changeType']) => {
    switch (type) {
      case 'auto':
        return '⏱️';
      case 'manual':
        return '💾';
      case 'publish':
        return '🚀';
      case 'restore':
        return '↩️';
      default:
        return '📄';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="version-history-overlay">
      <div className="version-history-panel">
        {/* Header */}
        <div className="panel-header">
          <h2>Version History</h2>
          <div className="header-actions">
            <button
              onClick={() => {
                const summary = window.prompt('Version note (optional):');
                createVersion(summary || undefined);
              }}
              className="save-version-btn"
            >
              💾 Save Version
            </button>
            <button onClick={onClose} className="close-btn">
              ✕
            </button>
          </div>
        </div>

        <div className="panel-content">
          {/* Version List */}
          <div className="version-list">
            {loading ? (
              <div className="loading">Loading versions...</div>
            ) : versions.length === 0 ? (
              <div className="empty">No versions saved yet</div>
            ) : (
              versions.map((version) => (
                <button
                  key={version.id}
                  className={`version-item ${selectedVersion?.id === version.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedVersion(version);
                    setCompareVersion(null);
                  }}
                >
                  <div className="version-header">
                    <span className="version-icon">{getChangeIcon(version.changeType)}</span>
                    <span className="version-number">v{version.version}</span>
                    <span className="version-time">{formatDate(version.createdAt)}</span>
                  </div>
                  {version.changeSummary && (
                    <p className="version-summary">{version.changeSummary}</p>
                  )}
                  <div className="version-meta">
                    {version.createdBy.avatarUrl && (
                      <img src={version.createdBy.avatarUrl} alt="" className="author-avatar" />
                    )}
                    <span className="author-name">{version.createdBy.name}</span>
                    <span className="word-count">{version.wordCount} words</span>
                  </div>
                  {compareVersion === null && selectedVersion?.id !== version.id && (
                    <button
                      className="compare-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareVersion(version);
                        setViewMode('diff');
                      }}
                    >
                      Compare
                    </button>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Preview/Diff Panel */}
          <div className="preview-panel">
            {selectedVersion && (
              <>
                {/* View Mode Toggle */}
                <div className="preview-header">
                  <div className="view-toggle">
                    <button
                      className={viewMode === 'preview' ? 'active' : ''}
                      onClick={() => setViewMode('preview')}
                    >
                      Preview
                    </button>
                    <button
                      className={viewMode === 'diff' ? 'active' : ''}
                      onClick={() => setViewMode('diff')}
                      disabled={!compareVersion && !versions[1]}
                    >
                      Diff
                    </button>
                  </div>

                  {compareVersion && (
                    <div className="comparing-badge">
                      Comparing v{selectedVersion.version} with v{compareVersion.version}
                      <button onClick={() => setCompareVersion(null)}>✕</button>
                    </div>
                  )}

                  <button
                    onClick={() => handleRestore(selectedVersion)}
                    disabled={restoring}
                    className="restore-btn"
                  >
                    {restoring ? 'Restoring...' : '↩️ Restore This Version'}
                  </button>
                </div>

                {/* Content View */}
                <div className="preview-content">
                  {viewMode === 'preview' ? (
                    <div
                      className="html-preview"
                      dangerouslySetInnerHTML={{ __html: selectedVersion.html }}
                    />
                  ) : (
                    <div className="diff-view">
                      {getDiff(
                        compareVersion?.html || versions[1]?.html || '',
                        selectedVersion.html
                      ).map((line, index) => (
                        <div key={index} className={`diff-line ${line.type}`}>
                          <span className="line-number">{line.lineNumber || ''}</span>
                          <span className="line-prefix">
                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                          </span>
                          <span className="line-content">{line.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .version-history-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
        }

        .version-history-panel {
          width: 100%;
          max-width: 900px;
          background: white;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .save-version-btn {
          padding: 0.5rem 1rem;
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.25rem;
        }

        .panel-content {
          flex: 1;
          display: grid;
          grid-template-columns: 300px 1fr;
          overflow: hidden;
        }

        .version-list {
          border-right: 1px solid #e5e7eb;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .loading,
        .empty {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .version-item {
          display: block;
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          text-align: left;
          background: white;
          cursor: pointer;
          transition: all 0.15s;
        }

        .version-item:hover {
          border-color: #3b82f6;
        }

        .version-item.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .version-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .version-icon {
          font-size: 1rem;
        }

        .version-number {
          font-weight: 600;
        }

        .version-time {
          font-size: 0.75rem;
          color: #6b7280;
          margin-left: auto;
        }

        .version-summary {
          font-size: 0.875rem;
          color: #374151;
          margin: 0.25rem 0;
        }

        .version-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .author-avatar {
          width: 16px;
          height: 16px;
          border-radius: 50%;
        }

        .word-count {
          margin-left: auto;
        }

        .compare-btn {
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        }

        .compare-btn:hover {
          background: #f3f4f6;
        }

        .preview-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }

        .view-toggle button {
          padding: 0.375rem 0.75rem;
          border: none;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .view-toggle button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .view-toggle button.active {
          background: #3b82f6;
          color: white;
        }

        .comparing-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 999px;
          font-size: 0.75rem;
        }

        .comparing-badge button {
          width: 18px;
          height: 18px;
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .restore-btn {
          margin-left: auto;
          padding: 0.5rem 1rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .restore-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preview-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .html-preview {
          font-size: 1rem;
          line-height: 1.6;
        }

        .diff-view {
          font-family: monospace;
          font-size: 0.875rem;
        }

        .diff-line {
          display: flex;
          padding: 0.125rem 0;
        }

        .diff-line.added {
          background: #d1fae5;
        }

        .diff-line.removed {
          background: #fee2e2;
        }

        .line-number {
          width: 40px;
          text-align: right;
          padding-right: 0.5rem;
          color: #9ca3af;
          user-select: none;
        }

        .line-prefix {
          width: 20px;
          text-align: center;
          user-select: none;
        }

        .diff-line.added .line-prefix {
          color: #10b981;
        }

        .diff-line.removed .line-prefix {
          color: #ef4444;
        }

        .line-content {
          flex: 1;
          white-space: pre-wrap;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .panel-content {
            grid-template-columns: 1fr;
          }

          .version-list {
            border-right: none;
            border-bottom: 1px solid #e5e7eb;
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// VERSION COMPARISON MODAL
// ============================================================================

export function VersionCompareModal({
  isOpen,
  onClose,
  version1,
  version2,
}: {
  isOpen: boolean;
  onClose: () => void;
  version1: Version | null;
  version2: Version | null;
}) {
  if (!isOpen || !version1 || !version2) return null;

  return (
    <div className="compare-modal-overlay" onClick={onClose}>
      <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Version Comparison</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="compare-panels">
          <div className="compare-panel">
            <div className="panel-label">
              Version {version1.version}
              <span className="version-date">{new Date(version1.createdAt).toLocaleString()}</span>
            </div>
            <div className="panel-content" dangerouslySetInnerHTML={{ __html: version1.html }} />
          </div>

          <div className="compare-panel">
            <div className="panel-label">
              Version {version2.version}
              <span className="version-date">{new Date(version2.createdAt).toLocaleString()}</span>
            </div>
            <div className="panel-content" dangerouslySetInnerHTML={{ __html: version2.html }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .compare-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .compare-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 1200px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
        }

        .modal-header button {
          width: 36px;
          height: 36px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          cursor: pointer;
        }

        .compare-panels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          flex: 1;
          overflow: hidden;
        }

        .compare-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .compare-panel:first-child {
          border-right: 1px solid #e5e7eb;
        }

        .panel-label {
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 500;
        }

        .version-date {
          margin-left: 0.5rem;
          font-weight: normal;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
}
