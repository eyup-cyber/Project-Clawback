/**
 * Cookie Consent Management
 * Handles cookie preferences and compliance
 */

export interface CookiePreferences {
  necessary: boolean; // Always true, cannot be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export const COOKIE_CATEGORIES = {
  necessary: {
    name: 'Necessary',
    description: 'Essential cookies required for the website to function properly.',
    required: true,
    cookies: ['session', 'csrf', 'auth'],
  },
  functional: {
    name: 'Functional',
    description: 'Cookies that enable enhanced functionality and personalization.',
    required: false,
    cookies: ['theme', 'language', 'preferences'],
  },
  analytics: {
    name: 'Analytics',
    description: 'Cookies that help us understand how visitors interact with our website.',
    required: false,
    cookies: ['_ga', '_gid', 'analytics'],
  },
  marketing: {
    name: 'Marketing',
    description: 'Cookies used to track visitors for marketing purposes.',
    required: false,
    cookies: ['_fbp', 'ads'],
  },
} as const;

const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Get cookie preferences from cookie string
 */
export function getPreferencesFromCookie(cookieString: string): CookiePreferences | null {
  try {
    const cookies = parseCookies(cookieString);
    const consent = cookies[CONSENT_COOKIE_NAME];

    if (!consent) {
      return null;
    }

    const preferences = JSON.parse(decodeURIComponent(consent)) as Partial<CookiePreferences>;

    return {
      necessary: true, // Always true
      functional: preferences.functional ?? false,
      analytics: preferences.analytics ?? false,
      marketing: preferences.marketing ?? false,
    };
  } catch {
    return null;
  }
}

/**
 * Create consent cookie value
 */
export function createConsentCookie(preferences: CookiePreferences): string {
  const value = encodeURIComponent(
    JSON.stringify({
      ...preferences,
      necessary: true, // Always true
      timestamp: Date.now(),
    })
  );

  return `${CONSENT_COOKIE_NAME}=${value}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Check if a specific cookie category is allowed
 */
export function isCategoryAllowed(
  preferences: CookiePreferences | null,
  category: keyof CookiePreferences
): boolean {
  if (category === 'necessary') {
    return true;
  }

  if (!preferences) {
    return false;
  }

  return preferences[category];
}

/**
 * Check if a specific cookie is allowed
 */
export function isCookieAllowed(
  preferences: CookiePreferences | null,
  cookieName: string
): boolean {
  // Necessary cookies are always allowed
  if (COOKIE_CATEGORIES.necessary.cookies.some((c) => cookieName.includes(c))) {
    return true;
  }

  if (!preferences) {
    return false;
  }

  // Check each category
  for (const [category, config] of Object.entries(COOKIE_CATEGORIES)) {
    if (config.cookies.some((c) => cookieName.includes(c))) {
      return preferences[category as keyof CookiePreferences];
    }
  }

  // Unknown cookies default to marketing category behavior
  return preferences.marketing;
}

/**
 * Get cookies that should be deleted based on preferences
 */
export function getCookiesToDelete(preferences: CookiePreferences): string[] {
  const toDelete: string[] = [];

  for (const [category, config] of Object.entries(COOKIE_CATEGORIES)) {
    if (!preferences[category as keyof CookiePreferences] && !config.required) {
      toDelete.push(...config.cookies);
    }
  }

  return toDelete;
}

/**
 * Parse cookies from a cookie string
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieString) {
    return cookies;
  }

  cookieString.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=');
    if (name && value) {
      cookies[name.trim()] = value.trim();
    }
  });

  return cookies;
}

/**
 * Generate script tags based on consent
 */
export function getConsentedScripts(preferences: CookiePreferences): string[] {
  const scripts: string[] = [];

  if (preferences.analytics) {
    scripts.push(
      `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>`
    );
  }

  if (preferences.marketing) {
    scripts.push(
      `<!-- Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'PIXEL_ID');
  fbq('track', 'PageView');
</script>`
    );
  }

  return scripts;
}

/**
 * Client-side helper to update preferences
 */
export const clientHelpers = `
window.CookieConsent = {
  getPreferences: function() {
    try {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('${CONSENT_COOKIE_NAME}='));
      if (!cookie) return null;
      return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    } catch (e) {
      return null;
    }
  },

  setPreferences: function(prefs) {
    const value = encodeURIComponent(JSON.stringify({
      ...prefs,
      necessary: true,
      timestamp: Date.now()
    }));
    document.cookie = '${CONSENT_COOKIE_NAME}=' + value + '; path=/; max-age=${CONSENT_COOKIE_MAX_AGE}; samesite=lax';
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: prefs }));
  },

  acceptAll: function() {
    this.setPreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    });
  },

  rejectAll: function() {
    this.setPreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    });
  }
};
`;
