/**
 * Editor Autosave Hook
 * Phase 3.6: Local backup, server sync, conflict resolution
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';

// ============================================================================
// TYPES
// ============================================================================

interface AutosaveState {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  lastSaved: Date | null;
  error: string | null;
  hasUnsavedChanges: boolean;
}

interface AutosaveOptions {
  postId: string;
  debounceMs?: number;
  enableLocalBackup?: boolean;
  onSave?: (content: string, title: string) => Promise<{ serverVersion?: number }>;
  onConflict?: (local: string, server: string) => void;
}

interface LocalBackup {
  postId: string;
  title: string;
  content: string;
  savedAt: string;
  version: number;
}

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

const getLocalStorageKey = (postId: string) => `editor-backup-${postId}`;

// ============================================================================
// HOOK
// ============================================================================

export function useEditorAutosave(options: AutosaveOptions) {
  const { postId, debounceMs = 3000, enableLocalBackup = true, onSave, onConflict } = options;

  const [state, setState] = useState<AutosaveState>({
    status: 'idle',
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false,
  });

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const debouncedContent = useDebounce(content, debounceMs);
  const debouncedTitle = useDebounce(title, debounceMs);

  const versionRef = useRef<number>(0);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedTitleRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // ============================================================================
  // LOCAL BACKUP
  // ============================================================================

  const saveLocalBackup = useCallback(
    (contentToSave: string, titleToSave: string) => {
      if (!enableLocalBackup || typeof window === 'undefined') return;

      const backup: LocalBackup = {
        postId,
        title: titleToSave,
        content: contentToSave,
        savedAt: new Date().toISOString(),
        version: versionRef.current,
      };

      try {
        localStorage.setItem(getLocalStorageKey(postId), JSON.stringify(backup));
      } catch {
        console.warn('[Autosave] Failed to save local backup');
      }
    },
    [postId, enableLocalBackup]
  );

  const loadLocalBackup = useCallback((): LocalBackup | null => {
    if (!enableLocalBackup || typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(getLocalStorageKey(postId));
      if (stored) {
        return JSON.parse(stored) as LocalBackup;
      }
    } catch {
      console.warn('[Autosave] Failed to load local backup');
    }
    return null;
  }, [postId, enableLocalBackup]);

  const clearLocalBackup = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(getLocalStorageKey(postId));
    } catch {
      // Ignore errors
    }
  }, [postId]);

  // ============================================================================
  // SERVER SAVE
  // ============================================================================

  const saveToServer = useCallback(
    async (contentToSave: string, titleToSave: string): Promise<boolean> => {
      if (!onSave) return true;

      setState((prev) => ({ ...prev, status: 'saving', error: null }));

      try {
        const result = await onSave(contentToSave, titleToSave);

        if (!isMountedRef.current) return false;

        // Check for version conflict
        if (result.serverVersion && result.serverVersion > versionRef.current) {
          setState((prev) => ({
            ...prev,
            status: 'conflict',
            error: 'Content was modified elsewhere',
          }));
          onConflict?.(contentToSave, ''); // Would need to fetch server content
          return false;
        }

        // Update version
        if (result.serverVersion) {
          versionRef.current = result.serverVersion;
        } else {
          versionRef.current++;
        }

        // Mark as saved
        lastSavedContentRef.current = contentToSave;
        lastSavedTitleRef.current = titleToSave;

        setState((prev) => ({
          ...prev,
          status: 'saved',
          lastSaved: new Date(),
          hasUnsavedChanges: false,
        }));

        // Clear local backup on successful server save
        clearLocalBackup();

        return true;
      } catch (error) {
        if (!isMountedRef.current) return false;

        const errorMessage = error instanceof Error ? error.message : 'Failed to save';

        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));

        // Save local backup on server error
        saveLocalBackup(contentToSave, titleToSave);

        return false;
      }
    },
    [onSave, onConflict, clearLocalBackup, saveLocalBackup]
  );

  // ============================================================================
  // AUTO-SAVE EFFECT
  // ============================================================================

  useEffect(() => {
    // Skip if content hasn't changed from last saved
    const contentChanged = debouncedContent !== lastSavedContentRef.current;
    const titleChanged = debouncedTitle !== lastSavedTitleRef.current;

    if (!contentChanged && !titleChanged) return;
    if (!debouncedContent && !debouncedTitle) return;

    // Save to local storage immediately
    if (enableLocalBackup) {
      saveLocalBackup(debouncedContent, debouncedTitle);
    }

    // Save to server - setState is called async after server responds, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void saveToServer(debouncedContent, debouncedTitle);
  }, [debouncedContent, debouncedTitle, saveToServer, saveLocalBackup, enableLocalBackup]);

  // ============================================================================
  // MOUNT/UNMOUNT
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setState((prev) => ({
      ...prev,
      hasUnsavedChanges: newContent !== lastSavedContentRef.current,
    }));
  }, []);

  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setState((prev) => ({
      ...prev,
      hasUnsavedChanges: newTitle !== lastSavedTitleRef.current,
    }));
  }, []);

  const forceSave = useCallback(async () => {
    return saveToServer(content, title);
  }, [content, title, saveToServer]);

  const setInitialContent = useCallback(
    (initialContent: string, initialTitle: string, version?: number) => {
      setContent(initialContent);
      setTitle(initialTitle);
      lastSavedContentRef.current = initialContent;
      lastSavedTitleRef.current = initialTitle;
      if (version) {
        versionRef.current = version;
      }
    },
    []
  );

  const recoverFromBackup = useCallback(() => {
    const backup = loadLocalBackup();
    if (backup) {
      setContent(backup.content);
      setTitle(backup.title);
      setState((prev) => ({ ...prev, hasUnsavedChanges: true }));
      return true;
    }
    return false;
  }, [loadLocalBackup]);

  const hasBackup = useCallback(() => {
    return loadLocalBackup() !== null;
  }, [loadLocalBackup]);

  const resolveConflict = useCallback(
    (useLocal: boolean) => {
      if (useLocal) {
        // Keep local version, force save
        void forceSave();
      } else {
        // Discard local changes, will need to reload from server
        clearLocalBackup();
        setState((prev) => ({
          ...prev,
          status: 'idle',
          hasUnsavedChanges: false,
        }));
      }
    },
    [forceSave, clearLocalBackup]
  );

  return {
    ...state,
    content,
    title,
    updateContent,
    updateTitle,
    forceSave,
    setInitialContent,
    recoverFromBackup,
    hasBackup,
    resolveConflict,
    clearLocalBackup,
  };
}

export default useEditorAutosave;
