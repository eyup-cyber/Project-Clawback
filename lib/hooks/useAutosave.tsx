/**
 * Autosave Hook
 * Phase 3.5: Local backup, server sync, conflict resolution
 */

import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AutosaveOptions {
  /** Unique identifier for the content being edited */
  documentId: string;
  /** Delay in milliseconds before saving (default: 2000) */
  debounceMs?: number;
  /** Enable local storage backup (default: true) */
  enableLocalBackup?: boolean;
  /** Enable server sync (default: true) */
  enableServerSync?: boolean;
  /** API endpoint for saving */
  saveEndpoint?: string;
  /** Callback when save starts */
  onSaveStart?: () => void;
  /** Callback when save succeeds */
  onSaveSuccess?: (response: SaveResponse) => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
  /** Callback when conflict detected */
  onConflict?: (conflict: ConflictData) => void;
}

export interface SaveResponse {
  success: boolean;
  version: number;
  savedAt: string;
  checksum: string;
}

export interface ConflictData {
  localVersion: number;
  serverVersion: number;
  localContent: string;
  serverContent: string;
  serverModifiedAt: string;
}

export interface AutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
  localBackupExists: boolean;
}

interface LocalBackup {
  documentId: string;
  content: string;
  html: string;
  savedAt: string;
  version: number;
  checksum: string;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAutosave(editor: Editor | null, options: AutosaveOptions) {
  const {
    documentId,
    debounceMs = 2000,
    enableLocalBackup = true,
    enableServerSync = true,
    saveEndpoint = '/api/posts/autosave',
    onSaveStart,
    onSaveSuccess,
    onSaveError,
    onConflict,
  } = options;

  const [state, setState] = useState<AutosaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
    localBackupExists: false,
  });

  const versionRef = useRef<number>(0);
  const checksumRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const generateChecksum = useCallback((content: string): string => {
    // Simple hash for quick comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }, []);

  const getLocalStorageKey = useCallback(() => `autosave_${documentId}`, [documentId]);

  // ============================================================================
  // LOCAL BACKUP FUNCTIONS
  // ============================================================================

  const saveToLocalStorage = useCallback(
    (content: string, html: string) => {
      if (!enableLocalBackup) return;

      try {
        const backup: LocalBackup = {
          documentId,
          content,
          html,
          savedAt: new Date().toISOString(),
          version: versionRef.current,
          checksum: generateChecksum(content),
        };

        localStorage.setItem(getLocalStorageKey(), JSON.stringify(backup));

        setState((prev) => ({ ...prev, localBackupExists: true }));
      } catch (error) {
        console.error('Failed to save local backup:', error);
      }
    },
    [documentId, enableLocalBackup, generateChecksum, getLocalStorageKey]
  );

  const loadFromLocalStorage = useCallback((): LocalBackup | null => {
    if (!enableLocalBackup) return null;

    try {
      const stored = localStorage.getItem(getLocalStorageKey());
      if (stored) {
        return JSON.parse(stored) as LocalBackup;
      }
    } catch (error) {
      console.error('Failed to load local backup:', error);
    }

    return null;
  }, [enableLocalBackup, getLocalStorageKey]);

  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(getLocalStorageKey());
      setState((prev) => ({ ...prev, localBackupExists: false }));
    } catch (error) {
      console.error('Failed to clear local backup:', error);
    }
  }, [getLocalStorageKey]);

  // ============================================================================
  // SERVER SYNC FUNCTIONS
  // ============================================================================

  const saveToServer = useCallback(
    async (content: string, html: string) => {
      if (!enableServerSync) return null;

      setState((prev) => ({ ...prev, isSaving: true, error: null }));
      onSaveStart?.();

      try {
        const response = await fetch(saveEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            content,
            html,
            version: versionRef.current,
            checksum: checksumRef.current,
          }),
        });

        if (response.status === 409) {
          // Conflict detected
          const conflictData = await response.json();
          onConflict?.({
            localVersion: versionRef.current,
            serverVersion: conflictData.version,
            localContent: content,
            serverContent: conflictData.content,
            serverModifiedAt: conflictData.modifiedAt,
          });

          setState((prev) => ({
            ...prev,
            isSaving: false,
            error: 'Conflict detected',
          }));

          return null;
        }

        if (!response.ok) {
          throw new Error(`Save failed: ${response.statusText}`);
        }

        const data: SaveResponse = await response.json();

        // Update version and checksum
        versionRef.current = data.version;
        checksumRef.current = data.checksum;

        const savedAt = new Date(data.savedAt);

        setState((prev) => ({
          ...prev,
          isSaving: false,
          lastSaved: savedAt,
          hasUnsavedChanges: false,
          error: null,
        }));

        onSaveSuccess?.(data);

        // Clear local backup after successful server save
        clearLocalStorage();

        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Save failed';

        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: errorMessage,
        }));

        onSaveError?.(error instanceof Error ? error : new Error(errorMessage));

        return null;
      }
    },
    [
      documentId,
      enableServerSync,
      saveEndpoint,
      onSaveStart,
      onSaveSuccess,
      onSaveError,
      onConflict,
      clearLocalStorage,
    ]
  );

  // ============================================================================
  // DEBOUNCED SAVE
  // ============================================================================

  const debouncedSave = useCallback(() => {
    if (!editor) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      const content = editor.getJSON();
      const html = editor.getHTML();
      const contentString = JSON.stringify(content);

      // Skip if content hasn't changed
      if (contentString === lastContentRef.current) {
        return;
      }

      lastContentRef.current = contentString;

      // Save locally first (immediate)
      saveToLocalStorage(contentString, html);

      // Then sync to server
      saveToServer(contentString, html);
    }, debounceMs);
  }, [editor, debounceMs, saveToLocalStorage, saveToServer]);

  // ============================================================================
  // MANUAL SAVE
  // ============================================================================

  const saveNow = useCallback(async () => {
    if (!editor) return null;

    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const content = editor.getJSON();
    const html = editor.getHTML();
    const contentString = JSON.stringify(content);

    lastContentRef.current = contentString;

    // Save locally first
    saveToLocalStorage(contentString, html);

    // Then sync to server
    return saveToServer(contentString, html);
  }, [editor, saveToLocalStorage, saveToServer]);

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  const resolveConflict = useCallback(
    async (resolution: 'keep-local' | 'keep-server' | 'merge') => {
      if (!editor) return;

      if (resolution === 'keep-server') {
        // Fetch server content and apply
        try {
          const response = await fetch(`${saveEndpoint}/${documentId}`);
          const data = await response.json();

          editor.commands.setContent(JSON.parse(data.content));
          versionRef.current = data.version;
          checksumRef.current = data.checksum;

          clearLocalStorage();

          setState((prev) => ({
            ...prev,
            hasUnsavedChanges: false,
            error: null,
          }));
        } catch (error) {
          console.error('Failed to fetch server content:', error);
        }
      } else if (resolution === 'keep-local') {
        // Force save local content
        const content = editor.getJSON();
        const html = editor.getHTML();

        try {
          const response = await fetch(saveEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId,
              content: JSON.stringify(content),
              html,
              forceOverwrite: true,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            versionRef.current = data.version;
            checksumRef.current = data.checksum;

            clearLocalStorage();

            setState((prev) => ({
              ...prev,
              hasUnsavedChanges: false,
              error: null,
            }));
          }
        } catch (error) {
          console.error('Failed to force save:', error);
        }
      }
      // 'merge' would require a more sophisticated diff/merge implementation
    },
    [editor, documentId, saveEndpoint, clearLocalStorage]
  );

  // ============================================================================
  // RESTORE FROM BACKUP
  // ============================================================================

  const restoreFromBackup = useCallback(() => {
    if (!editor) return false;

    const backup = loadFromLocalStorage();
    if (backup && backup.documentId === documentId) {
      try {
        const content = JSON.parse(backup.content);
        editor.commands.setContent(content);
        versionRef.current = backup.version;
        checksumRef.current = backup.checksum;

        setState((prev) => ({
          ...prev,
          hasUnsavedChanges: true,
        }));

        return true;
      } catch (error) {
        console.error('Failed to restore from backup:', error);
      }
    }

    return false;
  }, [editor, documentId, loadFromLocalStorage]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Listen for editor changes
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setState((prev) => ({ ...prev, hasUnsavedChanges: true }));
      debouncedSave();
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, debouncedSave]);

  // Check for local backup on mount
  useEffect(() => {
    const backup = loadFromLocalStorage();
    if (backup && backup.documentId === documentId) {
      setState((prev) => ({ ...prev, localBackupExists: true }));
    }
  }, [documentId, loadFromLocalStorage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.hasUnsavedChanges]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    ...state,
    saveNow,
    restoreFromBackup,
    clearLocalStorage,
    resolveConflict,
    setVersion: (version: number) => {
      versionRef.current = version;
    },
    setChecksum: (checksum: string) => {
      checksumRef.current = checksum;
    },
  };
}

// ============================================================================
// AUTOSAVE STATUS COMPONENT
// ============================================================================

export function AutosaveStatus({ isSaving, lastSaved, hasUnsavedChanges, error }: AutosaveState) {
  const getStatusText = () => {
    if (error) return `Error: ${error}`;
    if (isSaving) return 'Saving...';
    if (hasUnsavedChanges) return 'Unsaved changes';
    if (lastSaved) {
      const diff = Date.now() - lastSaved.getTime();
      if (diff < 60000) return 'Saved just now';
      if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)} min ago`;
      return `Saved at ${lastSaved.toLocaleTimeString()}`;
    }
    return 'No changes';
  };

  const getStatusColor = () => {
    if (error) return '#ef4444';
    if (isSaving) return '#f59e0b';
    if (hasUnsavedChanges) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="autosave-status" style={{ color: getStatusColor() }}>
      <span className="status-dot" style={{ backgroundColor: getStatusColor() }} />
      <span className="status-text">{getStatusText()}</span>
    </div>
  );
}
