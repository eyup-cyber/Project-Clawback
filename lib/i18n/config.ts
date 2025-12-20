/**
 * Internationalization Configuration
 * Phase 15: next-intl setup, locale detection, RTL support
 */

// ============================================================================
// SUPPORTED LOCALES
// ============================================================================

export const locales = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh', 'ar', 'he'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// ============================================================================
// LOCALE METADATA
// ============================================================================

export interface LocaleMetadata {
  code: Locale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  currency: string;
}

export const localeMetadata: Record<Locale, LocaleMetadata> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currency: 'USD',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currency: 'EUR',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currency: 'EUR',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currency: 'EUR',
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currency: 'BRL',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    dateFormat: 'yyyy/MM/dd',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
    currency: 'JPY',
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    dateFormat: 'yyyy.MM.dd',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
    currency: 'KRW',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    dateFormat: 'yyyy/MM/dd',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currency: 'CNY',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currency: 'SAR',
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currency: 'ILS',
  },
};

// ============================================================================
// HELPERS
// ============================================================================

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleMetadata(locale: Locale): LocaleMetadata {
  return localeMetadata[locale] || localeMetadata[defaultLocale];
}

export function isRTL(locale: Locale): boolean {
  return getLocaleMetadata(locale).direction === 'rtl';
}

export function getDateFormat(locale: Locale): string {
  return getLocaleMetadata(locale).dateFormat;
}

export function getCurrency(locale: Locale): string {
  return getLocaleMetadata(locale).currency;
}

// ============================================================================
// LOCALE DETECTION
// ============================================================================

export function detectLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(),
        q: qValue ? parseFloat(qValue) : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  for (const { code } of languages) {
    if (isValidLocale(code)) {
      return code;
    }
  }

  return defaultLocale;
}

export function detectLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/');
  const potentialLocale = segments[1];

  if (potentialLocale && isValidLocale(potentialLocale)) {
    return potentialLocale;
  }

  return null;
}

// ============================================================================
// URL HELPERS
// ============================================================================

export function getLocalizedPath(pathname: string, locale: Locale): string {
  // Remove existing locale from path
  const segments = pathname.split('/');
  const currentLocale = segments[1];

  if (isValidLocale(currentLocale)) {
    segments.splice(1, 1);
  }

  // Add new locale (skip for default locale)
  if (locale !== defaultLocale) {
    segments.splice(1, 0, locale);
  }

  return segments.join('/') || '/';
}

export function getPathWithoutLocale(pathname: string): string {
  const segments = pathname.split('/');
  const potentialLocale = segments[1];

  if (potentialLocale && isValidLocale(potentialLocale)) {
    segments.splice(1, 1);
  }

  return segments.join('/') || '/';
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

export function formatNumber(value: number, locale: Locale): string {
  const metadata = getLocaleMetadata(locale);
  return new Intl.NumberFormat(locale, metadata.numberFormat).format(value);
}

export function formatCurrency(value: number, locale: Locale, currency?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || getCurrency(locale),
  }).format(value);
}

export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...options,
  }).format(d);
}

export function formatRelativeTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSeconds < 60) {
    return rtf.format(-diffSeconds, 'second');
  } else if (diffMinutes < 60) {
    return rtf.format(-diffMinutes, 'minute');
  } else if (diffHours < 24) {
    return rtf.format(-diffHours, 'hour');
  } else if (diffDays < 30) {
    return rtf.format(-diffDays, 'day');
  } else if (diffDays < 365) {
    return rtf.format(-Math.floor(diffDays / 30), 'month');
  } else {
    return rtf.format(-Math.floor(diffDays / 365), 'year');
  }
}

const i18nConfig = {
  locales,
  defaultLocale,
  localeMetadata,
  isValidLocale,
  getLocaleMetadata,
  isRTL,
  getDateFormat,
  getCurrency,
  detectLocaleFromHeaders,
  detectLocaleFromPath,
  getLocalizedPath,
  getPathWithoutLocale,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
};

export default i18nConfig;
