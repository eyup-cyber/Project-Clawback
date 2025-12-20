/**
 * Reading Progress Hook
 * Phase 3.3.1: Client-side reading progress tracking
 */

import { useEffect, useCallback, useRef } from 'react';

export interface ReadingProgress {
  progress: number;
  scrollPosition: number;
  timeSpent: number;
}

interface UseReadingProgressOptions {
  postId: string;
  enabled?: boolean;
  syncInterval?: number; // milliseconds
  onProgressChange?: (progress: ReadingProgress) => void;
}

export function useReadingProgress(options: UseReadingProgressOptions) {
  const {
    postId,
    enabled = true,
    syncInterval = 5000, // 5 seconds
    onProgressChange,
  } = options;

  const startTimeRef = useRef<number>(0);
  const lastSyncRef = useRef<number>(0);
  const timeSpentRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize start time in effect to avoid impure function during render
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const syncProgress = useCallback(
    async (progress: ReadingProgress) => {
      if (!enabled || Date.now() - lastSyncRef.current < syncInterval) {
        return;
      }

      lastSyncRef.current = Date.now();

      try {
        const response = await fetch('/api/reading-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post_id: postId,
            progress: progress.progress,
            scroll_position: progress.scrollPosition,
            time_spent: Math.round(progress.timeSpent),
          }),
        });

        if (!response.ok) {
          console.error('Failed to sync reading progress');
        }
      } catch (error) {
        console.error('Error syncing reading progress:', error);
      }
    },
    [postId, enabled, syncInterval]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Calculate progress (0 to 1)
      const scrollableHeight = documentHeight - windowHeight;
      const progress =
        scrollableHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollableHeight)) : 1;

      const currentTime = Date.now();
      const elapsed = isVisibleRef.current ? (currentTime - startTimeRef.current) / 1000 : 0;

      timeSpentRef.current += elapsed;
      startTimeRef.current = currentTime;

      const progressData: ReadingProgress = {
        progress,
        scrollPosition: scrollTop,
        timeSpent: timeSpentRef.current,
      };

      // Save to localStorage as backup
      try {
        localStorage.setItem(`reading_progress_${postId}`, JSON.stringify(progressData));
      } catch {
        // Ignore localStorage errors
      }

      // Call callback
      onProgressChange?.(progressData);

      // Sync to server (debounced)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        void syncProgress(progressData);
      }, 2000); // Sync 2 seconds after last scroll
    };

    const handleVisibilityChange = () => {
      const wasVisible = isVisibleRef.current;
      isVisibleRef.current = !document.hidden;

      if (!wasVisible && !document.hidden) {
        // Page became visible, reset start time
        startTimeRef.current = Date.now();
      }
    };

    // Restore from localStorage
    try {
      const saved = localStorage.getItem(`reading_progress_${postId}`);
      if (saved) {
        const savedData: ReadingProgress = JSON.parse(saved);
        timeSpentRef.current = savedData.timeSpent || 0;
      }
    } catch {
      // Ignore parse errors
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial calculation
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [postId, enabled, syncProgress, onProgressChange]);

  const markAsCompleted = useCallback(async () => {
    try {
      await fetch(`/api/reading-history/${postId}/complete`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error marking as completed:', error);
    }
  }, [postId]);

  return { markAsCompleted };
}

export function useReadingPosition(postId: string) {
  useEffect(() => {
    // Restore scroll position from localStorage
    try {
      const saved = localStorage.getItem(`reading_position_${postId}`);
      if (saved) {
        const position = parseInt(saved, 10);
        if (position > 0) {
          // Wait for content to load
          setTimeout(() => {
            window.scrollTo(0, position);

            // Show toast
            const event = new CustomEvent('show-toast', {
              detail: {
                message: 'Resuming where you left off',
                type: 'info',
              },
            });
            window.dispatchEvent(event);
          }, 500);
        }
      }
    } catch {
      // Ignore errors
    }

    // Save scroll position
    const handleScroll = () => {
      const position = window.pageYOffset || document.documentElement.scrollTop;
      try {
        localStorage.setItem(`reading_position_${postId}`, position.toString());
      } catch {
        // Ignore localStorage errors
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [postId]);
}
