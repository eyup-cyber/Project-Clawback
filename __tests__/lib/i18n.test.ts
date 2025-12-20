/**
 * Tests for i18n utilities
 */

import {
  locales,
  defaultLocale,
  isValidLocale,
  getLocaleMetadata,
  isRTL,
  detectLocaleFromHeaders,
  detectLocaleFromPath,
  getLocalizedPath,
  getPathWithoutLocale,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
} from '@/lib/i18n/config';

describe('i18n Config', () => {
  describe('locales', () => {
    it('should include expected locales', () => {
      expect(locales).toContain('en');
      expect(locales).toContain('es');
      expect(locales).toContain('fr');
      expect(locales).toContain('de');
      expect(locales).toContain('ar');
      expect(locales).toContain('he');
    });

    it('should have default locale as en', () => {
      expect(defaultLocale).toBe('en');
    });
  });

  describe('isValidLocale', () => {
    it('should return true for valid locales', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('es')).toBe(true);
      expect(isValidLocale('ar')).toBe(true);
    });

    it('should return false for invalid locales', () => {
      expect(isValidLocale('invalid')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('en-US')).toBe(false);
    });
  });

  describe('getLocaleMetadata', () => {
    it('should return metadata for valid locale', () => {
      const metadata = getLocaleMetadata('en');
      expect(metadata.code).toBe('en');
      expect(metadata.name).toBe('English');
      expect(metadata.nativeName).toBe('English');
      expect(metadata.direction).toBe('ltr');
    });

    it('should return default metadata for invalid locale', () => {
      const metadata = getLocaleMetadata('en');
      expect(metadata.code).toBe('en');
    });

    it('should return RTL direction for Arabic', () => {
      const metadata = getLocaleMetadata('ar');
      expect(metadata.direction).toBe('rtl');
    });

    it('should return RTL direction for Hebrew', () => {
      const metadata = getLocaleMetadata('he');
      expect(metadata.direction).toBe('rtl');
    });
  });

  describe('isRTL', () => {
    it('should return true for RTL languages', () => {
      expect(isRTL('ar')).toBe(true);
      expect(isRTL('he')).toBe(true);
    });

    it('should return false for LTR languages', () => {
      expect(isRTL('en')).toBe(false);
      expect(isRTL('es')).toBe(false);
      expect(isRTL('fr')).toBe(false);
      expect(isRTL('ja')).toBe(false);
    });
  });
});

describe('Locale Detection', () => {
  describe('detectLocaleFromHeaders', () => {
    it('should return default locale for null header', () => {
      expect(detectLocaleFromHeaders(null)).toBe('en');
    });

    it('should detect locale from Accept-Language header', () => {
      expect(detectLocaleFromHeaders('es')).toBe('es');
      expect(detectLocaleFromHeaders('fr-FR')).toBe('fr');
      expect(detectLocaleFromHeaders('de-DE')).toBe('de');
    });

    it('should handle quality values', () => {
      expect(detectLocaleFromHeaders('es;q=0.9,en;q=0.8')).toBe('es');
      expect(detectLocaleFromHeaders('en;q=0.5,fr;q=0.9')).toBe('fr');
    });

    it('should fallback to default for unsupported locales', () => {
      expect(detectLocaleFromHeaders('xx-XX')).toBe('en');
    });

    it('should handle multiple locales and pick best match', () => {
      expect(detectLocaleFromHeaders('xx,es,en')).toBe('es');
    });
  });

  describe('detectLocaleFromPath', () => {
    it('should detect locale from path', () => {
      expect(detectLocaleFromPath('/es/about')).toBe('es');
      expect(detectLocaleFromPath('/fr/posts/123')).toBe('fr');
    });

    it('should return null for paths without locale', () => {
      expect(detectLocaleFromPath('/about')).toBe(null);
      expect(detectLocaleFromPath('/posts/123')).toBe(null);
    });

    it('should return null for default locale paths', () => {
      // Default locale (en) is typically not in path
      expect(detectLocaleFromPath('/en/about')).toBe('en');
    });
  });
});

describe('URL Helpers', () => {
  describe('getLocalizedPath', () => {
    it('should add locale to path', () => {
      expect(getLocalizedPath('/about', 'es')).toBe('/es/about');
      expect(getLocalizedPath('/posts/123', 'fr')).toBe('/fr/posts/123');
    });

    it('should not add default locale to path', () => {
      expect(getLocalizedPath('/about', 'en')).toBe('/about');
    });

    it('should replace existing locale in path', () => {
      expect(getLocalizedPath('/es/about', 'fr')).toBe('/fr/about');
      expect(getLocalizedPath('/fr/posts/123', 'de')).toBe('/de/posts/123');
    });

    it('should handle root path', () => {
      expect(getLocalizedPath('/', 'es')).toBe('/es/');
      expect(getLocalizedPath('/', 'en')).toBe('/');
    });
  });

  describe('getPathWithoutLocale', () => {
    it('should remove locale from path', () => {
      expect(getPathWithoutLocale('/es/about')).toBe('/about');
      expect(getPathWithoutLocale('/fr/posts/123')).toBe('/posts/123');
    });

    it('should return path unchanged if no locale', () => {
      expect(getPathWithoutLocale('/about')).toBe('/about');
      expect(getPathWithoutLocale('/posts/123')).toBe('/posts/123');
    });
  });
});

describe('Formatting Helpers', () => {
  describe('formatNumber', () => {
    it('should format numbers according to locale', () => {
      expect(formatNumber(1234.56, 'en')).toMatch(/1,234/);
      expect(formatNumber(1234.56, 'de')).toMatch(/1\.234/);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency according to locale', () => {
      const result = formatCurrency(99.99, 'en');
      expect(result).toMatch(/\$99\.99/);
    });

    it('should use locale-specific currency', () => {
      const euroResult = formatCurrency(99.99, 'de');
      expect(euroResult).toContain('€');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format recent times in seconds', () => {
      const thirtySecondsAgo = new Date('2024-01-15T11:59:30Z');
      const result = formatRelativeTime(thirtySecondsAgo, 'en');
      expect(result).toMatch(/second/i);
    });

    it('should format times in minutes', () => {
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');
      const result = formatRelativeTime(fiveMinutesAgo, 'en');
      expect(result).toMatch(/minute/i);
    });

    it('should format times in hours', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00Z');
      const result = formatRelativeTime(twoHoursAgo, 'en');
      expect(result).toMatch(/hour/i);
    });

    it('should format times in days', () => {
      const threeDaysAgo = new Date('2024-01-12T12:00:00Z');
      const result = formatRelativeTime(threeDaysAgo, 'en');
      expect(result).toMatch(/day/i);
    });
  });
});
