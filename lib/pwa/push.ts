// @ts-nocheck
/**
 * Push Notification Support
 * Web Push API implementation for PWA
 */

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check current notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Convert to our format
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
      },
    };

    // Send to server
    await saveSubscription(subscriptionData);

    return subscriptionData;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from server first
      await removeSubscription(subscription.endpoint);
      // Then unsubscribe locally
      await subscription.unsubscribe();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) return null;

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Show a local notification (for testing)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (getNotificationPermission() !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, options);
}

/**
 * Save subscription to server
 */
async function saveSubscription(subscription: PushSubscriptionData): Promise<void> {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  });
}

/**
 * Remove subscription from server
 */
async function removeSubscription(endpoint: string): Promise<void> {
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint }),
  });
}

// Utility functions

/**
 * Convert URL-safe base64 to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Notification types for the app
 */
export const NOTIFICATION_TYPES = {
  NEW_POST: 'new_post',
  NEW_COMMENT: 'new_comment',
  NEW_FOLLOWER: 'new_follower',
  POST_PUBLISHED: 'post_published',
  POST_APPROVED: 'post_approved',
  MENTION: 'mention',
  SYSTEM: 'system',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Create notification payload for different types
 */
export function createNotificationPayload(
  type: NotificationType,
  data: Record<string, unknown>
): NotificationPayload {
  const basePayload: NotificationPayload = {
    title: 'Scroungers',
    body: '',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: type,
    data: { type, ...data },
  };

  switch (type) {
    case NOTIFICATION_TYPES.NEW_POST:
      return {
        ...basePayload,
        title: 'New Post',
        body: `${data.author} published "${data.title}"`,
        actions: [
          { action: 'view', title: 'View Post' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

    case NOTIFICATION_TYPES.NEW_COMMENT:
      return {
        ...basePayload,
        title: 'New Comment',
        body: `${data.author} commented on your post`,
        actions: [
          { action: 'view', title: 'View' },
          { action: 'reply', title: 'Reply' },
        ],
      };

    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return {
        ...basePayload,
        title: 'New Follower',
        body: `${data.follower} started following you`,
      };

    case NOTIFICATION_TYPES.POST_PUBLISHED:
      return {
        ...basePayload,
        title: 'Post Published!',
        body: `Your post "${data.title}" is now live`,
        actions: [
          { action: 'view', title: 'View Post' },
          { action: 'share', title: 'Share' },
        ],
      };

    case NOTIFICATION_TYPES.POST_APPROVED:
      return {
        ...basePayload,
        title: 'Post Approved',
        body: `Your post "${data.title}" has been approved`,
      };

    case NOTIFICATION_TYPES.MENTION:
      return {
        ...basePayload,
        title: 'You were mentioned',
        body: `${data.author} mentioned you in a ${data.context}`,
      };

    case NOTIFICATION_TYPES.SYSTEM:
      return {
        ...basePayload,
        title: (data.title as string) || 'System Notification',
        body: (data.message as string) || '',
      };

    default:
      return basePayload;
  }
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  newPosts: boolean;
  comments: boolean;
  mentions: boolean;
  followers: boolean;
  postUpdates: boolean;
  system: boolean;
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newPosts: true,
  comments: true,
  mentions: true,
  followers: true,
  postUpdates: true,
  system: true,
};

/**
 * Save notification preferences
 */
export async function saveNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  await fetch('/api/users/me/preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notifications: preferences }),
  });
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const response = await fetch('/api/users/me/preferences');
    const data = await response.json();
    return data.notifications || DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}
