'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
      setLoading(false);
    };

    void fetchNotifications();
  }, [userId, supabase]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_approved':
        return '✅';
      case 'post_rejected':
        return '❌';
      case 'post_changes_requested':
        return '✏️';
      case 'new_comment':
        return '💬';
      case 'new_reaction':
        return '⭐';
      case 'application_approved':
        return '🎉';
      case 'application_rejected':
        return '📋';
      default:
        return '🔔';
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--foreground)' }}
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold flex items-center justify-center"
            style={{
              background: 'var(--accent)',
              color: 'var(--background)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-lg overflow-hidden"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <h3
              className="font-bold"
              style={{
                color: 'var(--foreground)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="text-xs hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div
                  className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
                  style={{
                    borderColor: 'var(--border)',
                    borderTopColor: 'var(--primary)',
                  }}
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-3xl block mb-2">🔔</span>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b transition-colors hover:bg-[var(--surface)] ${
                    !notification.read ? 'bg-[var(--surface)]' : ''
                  }`}
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex gap-3">
                    <span className="text-xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          onClick={() => void markAsRead(notification.id)}
                          className="block"
                        >
                          <p
                            className="font-medium text-sm truncate"
                            style={{
                              color: 'var(--foreground)',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p
                              className="text-xs mt-0.5 line-clamp-2"
                              style={{
                                color: 'var(--foreground)',
                                opacity: 0.7,
                              }}
                            >
                              {notification.message}
                            </p>
                          )}
                        </Link>
                      ) : (
                        <>
                          <p
                            className="font-medium text-sm truncate"
                            style={{
                              color: 'var(--foreground)',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p
                              className="text-xs mt-0.5 line-clamp-2"
                              style={{
                                color: 'var(--foreground)',
                                opacity: 0.7,
                              }}
                            >
                              {notification.message}
                            </p>
                          )}
                        </>
                      )}
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'var(--foreground)', opacity: 0.5 }}
                      >
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                        style={{ background: 'var(--primary)' }}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <Link
                href="/dashboard/notifications"
                className="block text-center text-sm py-2 rounded-lg hover:bg-[var(--surface)]"
                style={{ color: 'var(--primary)' }}
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
