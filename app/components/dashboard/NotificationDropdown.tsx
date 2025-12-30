/**
 * Notification Dropdown Component
 * Phase 6.3: Bell icon, dropdown, grouping, real-time updates
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Notification, useRealtimeNotifications } from '@/lib/hooks/useRealtimeNotifications';
import { formatRelativeTime } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationDropdownProps {
  userId: string | null;
}

interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  bell: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  comment: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  heart: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  userPlus: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  atSign: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  ),
  send: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  check: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  trash: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  checkAll: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 8 22 12 18 16" />
      <polyline points="6 8 2 12 6 16" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
};

// ============================================================================
// NOTIFICATION ICON MAP
// ============================================================================

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'comment':
    case 'reply':
      return Icons.comment;
    case 'reaction':
      return Icons.heart;
    case 'follow':
      return Icons.userPlus;
    case 'mention':
      return Icons.atSign;
    case 'post_published':
      return Icons.send;
    case 'application_approved':
      return Icons.check;
    case 'application_rejected':
    case 'post_rejected':
      return Icons.x;
    case 'system':
    default:
      return Icons.info;
  }
};

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'reaction':
      return 'var(--accent)';
    case 'follow':
      return 'var(--primary)';
    case 'application_approved':
    case 'post_published':
      return 'var(--secondary)';
    case 'application_rejected':
    case 'post_rejected':
      return '#ef4444';
    default:
      return 'var(--foreground)';
  }
};

// ============================================================================
// GROUP NOTIFICATIONS BY DATE
// ============================================================================

function groupNotificationsByDate(notifications: Notification[]): NotificationGroup[] {
  const groups: Map<string, Notification[]> = new Map();

  notifications.forEach((notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(notification);
  });

  return Array.from(groups.entries()).map(([date, notifications]) => ({
    date,
    notifications,
  }));
}

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
  };

  const getLink = () => {
    if (notification.post_slug) {
      return `/articles/${notification.post_slug}`;
    }
    if (notification.type === 'follow' && notification.actor_username) {
      return `/@${notification.actor_username}`;
    }
    if (notification.type === 'application_approved') {
      return '/dashboard/posts/new';
    }
    return '/dashboard';
  };

  return (
    <div
      className={`
        relative p-3 transition-colors
        ${notification.is_read ? 'opacity-70' : ''}
      `}
      style={{
        background: notification.is_read ? 'transparent' : 'var(--surface-elevated)',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Link href={getLink()} onClick={handleClick} className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `${getNotificationColor(notification.type)}20`,
            color: getNotificationColor(notification.type),
          }}
        >
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm ${notification.is_read ? '' : 'font-medium'}`}
            style={{ color: 'var(--foreground)' }}
          >
            {notification.title}
          </p>
          {notification.message && (
            <p
              className="text-xs mt-0.5 truncate"
              style={{ color: 'var(--foreground)', opacity: 0.6 }}
            >
              {notification.message}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.4 }}>
            {formatRelativeTime(notification.created_at)}
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.is_read && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
            style={{ background: 'var(--primary)' }}
          />
        )}
      </Link>

      {/* Actions */}
      {showActions && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {!notification.is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              className="p-1.5 rounded transition-colors hover:bg-[var(--surface)]"
              style={{ color: 'var(--foreground)', opacity: 0.6 }}
              title="Mark as read"
            >
              {Icons.check}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1.5 rounded transition-colors hover:bg-[var(--surface)]"
            style={{ color: 'var(--foreground)', opacity: 0.6 }}
            title="Delete"
          >
            {Icons.trash}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useRealtimeNotifications({
    userId,
    enableSound: true,
    enableToast: true,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleMarkRead = async (id: string) => {
    await markAsRead([id]);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      await clearAll();
    }
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  if (!userId) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors hover:bg-[var(--surface)]"
        style={{ color: 'var(--foreground)' }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        {Icons.bell}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: 'var(--accent)',
              color: 'var(--background)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection indicator */}
        {isConnected && (
          <span
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full"
            style={{ background: 'var(--secondary)' }}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 max-h-[500px] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: 'var(--surface)',
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
                fontFamily: 'var(--font-kindergarten)',
              }}
            >
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => void handleMarkAllRead()}
                  className="text-xs px-2 py-1 rounded transition-colors hover:bg-[var(--surface-elevated)]"
                  style={{ color: 'var(--primary)' }}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => void handleClearAll()}
                  className="p-1.5 rounded transition-colors hover:bg-[var(--surface-elevated)]"
                  style={{ color: 'var(--foreground)', opacity: 0.6 }}
                  title="Clear all"
                >
                  {Icons.trash}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div
                  className="animate-spin w-8 h-8 border-2 rounded-full mx-auto"
                  style={{
                    borderColor: 'var(--border)',
                    borderTopColor: 'var(--primary)',
                  }}
                />
                <p className="mt-2 text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{
                    background: 'var(--surface-elevated)',
                    color: 'var(--foreground)',
                    opacity: 0.4,
                  }}
                >
                  {Icons.bell}
                </div>
                <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>No notifications yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.4 }}>
                  We&apos;ll let you know when something happens
                </p>
              </div>
            ) : (
              <div>
                {groupedNotifications.map((group) => (
                  <div key={group.date}>
                    <div
                      className="px-4 py-2 text-xs font-medium sticky top-0"
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                        opacity: 0.5,
                      }}
                    >
                      {group.date}
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {group.notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkRead={(id) => void handleMarkRead(id)}
                          onDelete={(id) => void handleDelete(id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <Link
              href="/dashboard/notifications"
              className="block text-center text-sm transition-colors hover:underline"
              style={{ color: 'var(--primary)' }}
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
