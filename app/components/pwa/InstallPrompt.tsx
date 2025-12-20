'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed the prompt
    const promptDismissed = localStorage.getItem('pwa-install-dismissed');
    if (promptDismissed) {
      const dismissedAt = new Date(promptDismissed);
      const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setDismissed(true);
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    } finally {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't render if installed, dismissed, or no prompt available
  if (isInstalled || dismissed || !showPrompt) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up"
      role="dialog"
      aria-labelledby="install-title"
      aria-describedby="install-description"
    >
      <div
        className="p-4 rounded-xl shadow-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start gap-4">
          {/* App icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            <span className="text-2xl">📱</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              id="install-title"
              className="font-bold text-lg"
              style={{ color: 'var(--foreground)' }}
            >
              Install Scroungers
            </h3>
            <p
              id="install-description"
              className="text-sm mt-1"
              style={{ color: 'var(--foreground)', opacity: 0.7 }}
            >
              Get the full experience with offline access, push notifications, and faster loading.
            </p>

            {/* Features */}
            <div
              className="flex flex-wrap gap-2 mt-3 text-xs"
              style={{ color: 'var(--foreground)', opacity: 0.6 }}
            >
              <span className="flex items-center gap-1">✓ Works offline</span>
              <span className="flex items-center gap-1">✓ Faster loading</span>
              <span className="flex items-center gap-1">✓ Push notifications</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                Install Now
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2 rounded-lg text-sm transition-all"
                style={{ color: 'var(--foreground)', opacity: 0.6 }}
              >
                Not now
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-[var(--background)] transition-colors"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--foreground)', opacity: 0.5 }}
              />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
