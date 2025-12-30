'use client';

import { useState, useEffect } from 'react';
import {
  COOKIE_CATEGORIES,
  DEFAULT_PREFERENCES,
  type CookiePreferences,
} from '@/lib/compliance/cookies';

interface CookieConsentProps {
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onSave?: (preferences: CookiePreferences) => void;
}

export default function CookieConsent({ onAcceptAll, onRejectAll, onSave }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = document.cookie.split('; ').find((row) => row.startsWith('cookie_consent='));

    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const value = encodeURIComponent(
      JSON.stringify({
        ...prefs,
        necessary: true,
        timestamp: Date.now(),
      })
    );
    document.cookie = `cookie_consent=${value}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
    setIsVisible(false);
    onSave?.(prefs);
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
    onAcceptAll?.();
  };

  const handleRejectAll = () => {
    savePreferences(DEFAULT_PREFERENCES);
    onRejectAll?.();
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="max-w-4xl mx-auto rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {!showDetails ? (
          // Simple Banner
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                🍪 Cookie Preferences
              </h3>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                We use cookies to enhance your experience. Some cookies are essential for the site
                to work, while others help us improve your experience and understand how you use our
                site.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                Customize
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          // Detailed Preferences
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                Cookie Preferences
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-sm hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                ← Back
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {Object.entries(COOKIE_CATEGORIES).map(([key, category]) => (
                <div
                  key={key}
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--background)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>
                          {category.name}
                        </h4>
                        {category.required && (
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ background: 'var(--primary)', color: 'var(--background)' }}
                          >
                            Required
                          </span>
                        )}
                      </div>
                      <p
                        className="text-sm mt-1"
                        style={{ color: 'var(--foreground)', opacity: 0.7 }}
                      >
                        {category.description}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={category.required || preferences[key as keyof CookiePreferences]}
                        disabled={category.required}
                        onChange={(e) => {
                          if (!category.required) {
                            setPreferences((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }));
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div
                        className="w-11 h-6 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={{
                          background:
                            category.required || preferences[key as keyof CookiePreferences]
                              ? 'var(--primary)'
                              : 'var(--border)',
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                Reject All
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

        <p
          className="text-xs mt-4 text-center"
          style={{ color: 'var(--foreground)', opacity: 0.5 }}
        >
          By continuing to use our site, you agree to our{' '}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/terms" className="underline">
            Terms of Service
          </a>
          .
        </p>
      </div>
    </div>
  );
}
