/**
 * Real-time Notifications Hook
 * Phase 6.4: Supabase subscriptions, sound effects, toast notifications
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  post_id: string | null;
  comment_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  actor_username?: string;
  actor_display_name?: string;
  actor_avatar_url?: string;
  post_title?: string;
  post_slug?: string;
}

export type NotificationType =
  | 'comment'
  | 'reaction'
  | 'reply'
  | 'mention'
  | 'follow'
  | 'post_published'
  | 'post_rejected'
  | 'application_approved'
  | 'application_rejected'
  | 'system';

interface UseRealtimeNotificationsOptions {
  userId: string | null;
  enableSound?: boolean;
  enableToast?: boolean;
  onNewNotification?: (notification: Notification) => void;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// SOUND EFFECT
// ============================================================================

const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3';

function playNotificationSound() {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore errors - user may not have interacted with page yet
    });
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// TOAST HELPER
// ============================================================================

function showToastNotification(notification: Notification) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  // Request permission if needed
  if (Notification.permission === 'default') {
    void Notification.requestPermission();
    return;
  }

  if (Notification.permission === 'granted') {
    const browserNotification = new Notification(notification.title, {
      body: notification.message || undefined,
      icon: notification.actor_avatar_url || '/favicon.ico',
      tag: notification.id,
    });

    // Click to focus window and navigate
    browserNotification.onclick = () => {
      window.focus();
      if (notification.post_slug) {
        window.location.href = `/articles/${notification.post_slug}`;
      } else {
        window.location.href = '/dashboard';
      }
    };

    // Auto-close after 5 seconds
    setTimeout(() => browserNotification.close(), 5000);
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions) {
  const { userId, enableSound = true, enableToast = true, onNewNotification } = options;

  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isConnected: false,
    isLoading: true,
    error: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  // ============================================================================
  // FETCH INITIAL NOTIFICATIONS
  // ============================================================================

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/notifications?limit=50');
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();

      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0,
          isLoading: false,
        }));
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }
  }, [userId]);

  // ============================================================================
  // SUBSCRIBE TO REALTIME UPDATES
  // ============================================================================

  const subscribeToNotifications = useCallback(async () => {
    if (!userId) return;

    const supabase = createClient();

    // Unsubscribe from previous channel
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
    }

    // Subscribe to notifications for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;

          // Fetch additional details (actor, post)
          const enrichedNotification = await enrichNotification(newNotification);

          if (isMountedRef.current) {
            setState((prev) => ({
              ...prev,
              notifications: [enrichedNotification, ...prev.notifications].slice(0, 50),
              unreadCount: prev.unreadCount + 1,
            }));

            // Play sound
            if (enableSound) {
              playNotificationSound();
            }

            // Show toast
            if (enableToast) {
              showToastNotification(enrichedNotification);
            }

            // Callback
            onNewNotification?.(enrichedNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;

          if (isMountedRef.current) {
            setState((prev) => ({
              ...prev,
              notifications: prev.notifications.map((n) =>
                n.id === updatedNotification.id ? { ...n, ...updatedNotification } : n
              ),
              unreadCount: Math.max(0, prev.unreadCount + (updatedNotification.is_read ? -1 : 0)),
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;

          if (isMountedRef.current) {
            setState((prev) => {
              const deleted = prev.notifications.find((n) => n.id === deletedId);
              return {
                ...prev,
                notifications: prev.notifications.filter((n) => n.id !== deletedId),
                unreadCount:
                  deleted && !deleted.is_read
                    ? Math.max(0, prev.unreadCount - 1)
                    : prev.unreadCount,
              };
            });
          }
        }
      )
      .subscribe((status) => {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isConnected: status === 'SUBSCRIBED',
          }));
        }
      });

    channelRef.current = channel;
  }, [userId, enableSound, enableToast, onNewNotification]);

  // ============================================================================
  // ENRICH NOTIFICATION
  // ============================================================================

  const enrichNotification = async (notification: Notification): Promise<Notification> => {
    const supabase = createClient();
    let enriched = { ...notification };

    // Fetch actor details
    if (notification.actor_id) {
      const { data: actor } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', notification.actor_id)
        .single();

      if (actor) {
        enriched = {
          ...enriched,
          actor_username: actor.username,
          actor_display_name: actor.display_name,
          actor_avatar_url: actor.avatar_url,
        };
      }
    }

    // Fetch post details
    if (notification.post_id) {
      const { data: post } = await supabase
        .from('posts')
        .select('title, slug')
        .eq('id', notification.post_id)
        .single();

      if (post) {
        enriched = {
          ...enriched,
          post_title: post.title,
          post_slug: post.slug,
        };
      }
    }

    return enriched;
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const markAsRead = useCallback(async (notificationIds: string[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: notificationIds }),
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          notificationIds.includes(n.id)
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        ),
        unreadCount: Math.max(
          0,
          prev.unreadCount -
            prev.notifications.filter((n) => notificationIds.includes(n.id) && !n.is_read).length
        ),
      }));

      return true;
    } catch {
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        })),
        unreadCount: 0,
      }));

      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      setState((prev) => {
        const deleted = prev.notifications.find((n) => n.id === notificationId);
        return {
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== notificationId),
          unreadCount:
            deleted && !deleted.is_read ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
        };
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  const clearAll = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to clear notifications');

      setState((prev) => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
      }));

      return true;
    } catch {
      return false;
    }
  }, []);

  const refresh = useCallback(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;

    if (userId) {
      void fetchNotifications();
      void subscribeToNotifications();
    }

    return () => {
      isMountedRef.current = false;
      const supabase = createClient();
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, fetchNotifications, subscribeToNotifications]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh,
  };
}

export default useRealtimeNotifications;
