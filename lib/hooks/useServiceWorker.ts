/**
 * Service Worker Hook
 * Phase 16: Registration, updates, and offline detection
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface UseServiceWorkerOptions {
  onUpdateAvailable?: () => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useServiceWorker(options: UseServiceWorkerOptions = {}) {
  const { onUpdateAvailable, onOffline, onOnline } = options;

  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    isUpdateAvailable: false,
    registration: null,
  });

  // ============================================================================
  // REGISTER SERVICE WORKER
  // ============================================================================

  const register = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // eslint-disable-next-line no-console
      console.info('[SW] Service worker registered:', registration.scope);

      // Check for updates on registration
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // eslint-disable-next-line no-console
              console.info('[SW] New update available');
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
              onUpdateAvailable?.();
            }
          });
        }
      });

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        registration,
      }));

      return registration;
    } catch (error) {
      console.error('[SW] Registration failed:', error);
      return null;
    }
  }, [onUpdateAvailable]);

  // ============================================================================
  // UPDATE SERVICE WORKER
  // ============================================================================

  const update = useCallback(async () => {
    if (!state.registration) return false;

    try {
      await state.registration.update();
      return true;
    } catch (error) {
      console.error('[SW] Update check failed:', error);
      return false;
    }
  }, [state.registration]);

  // ============================================================================
  // APPLY UPDATE
  // ============================================================================

  const applyUpdate = useCallback(() => {
    if (!state.registration?.waiting) return;

    // Tell the waiting service worker to activate
    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload the page to use new service worker
    window.location.reload();
  }, [state.registration]);

  // ============================================================================
  // UNREGISTER
  // ============================================================================

  const unregister = useCallback(async () => {
    if (!state.registration) return false;

    try {
      const success = await state.registration.unregister();
      if (success) {
        setState((prev) => ({
          ...prev,
          isRegistered: false,
          registration: null,
        }));
      }
      return success;
    } catch (error) {
      console.error('[SW] Unregister failed:', error);
      return false;
    }
  }, [state.registration]);

  // ============================================================================
  // CLEAR CACHE
  // ============================================================================

  const clearCache = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return false;

    return new Promise<boolean>((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = () => {
        resolve(true);
      };

      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' }, [
        messageChannel.port2,
      ]);

      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000);
    });
  }, []);

  // ============================================================================
  // GET VERSION
  // ============================================================================

  const getVersion = useCallback(async (): Promise<string | null> => {
    if (!navigator.serviceWorker.controller) return null;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data?.version || null);
      };

      navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [
        messageChannel.port2,
      ]);

      // Timeout after 2 seconds
      setTimeout(() => resolve(null), 2000);
    });
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Check support and initial state
  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
    const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((prev) => ({
      ...prev,
      isSupported,
      isOnline,
    }));

    if (isSupported) {
      void register();
    }
  }, [register]);

  // Online/offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      onOnline?.();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
      onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);

  // Listen for controller changes (new service worker activated)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // eslint-disable-next-line no-console
      console.info('[SW] Controller changed, reloading...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    ...state,
    register,
    update,
    applyUpdate,
    unregister,
    clearCache,
    getVersion,
  };
}

// ============================================================================
// PUSH NOTIFICATION HELPERS
// ============================================================================

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if we have push permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      // eslint-disable-next-line no-console
      console.info('[SW] Push notification permission denied');
      return null;
    }

    // Get VAPID public key from server
    const response = await fetch('/api/keys');
    const { vapidPublicKey } = await response.json();

    if (!vapidPublicKey) {
      console.error('[SW] VAPID public key not available');
      return null;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // eslint-disable-next-line no-console
    console.info('[SW] Push subscription:', subscription);

    // Send subscription to server
    await fetch('/api/notifications/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    return subscription;
  } catch (error) {
    console.error('[SW] Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Notify server
      await fetch('/api/notifications/push-subscription', {
        method: 'DELETE',
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('[SW] Push unsubscription failed:', error);
    return false;
  }
}

// Helper to convert VAPID key
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

export default useServiceWorker;
