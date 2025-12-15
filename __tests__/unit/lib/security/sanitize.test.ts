/**
 * Unit tests for security sanitization utilities
 */

import { sanitizeHtml, sanitizeText, sanitizeUrl, sanitizeFilename } from '@/lib/security/sanitize';

describe('Security Sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain('<script>');
      expect(result).toContain('Safe content');
    });

    it('should remove event handlers', () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(malicious);

      expect(result).not.toContain('onerror');
    });

    it('should allow safe HTML tags', () => {
      const safe = '<p>Paragraph</p><strong>Bold</strong><a href="https://example.com">Link</a>';
      const result = sanitizeHtml(safe);

      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<a');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should strip all HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeText(html);

      expect(result).toBe('Hello World');
    });

    it('should handle malicious content', () => {
      const malicious = '<script>alert(1)</script>Safe text';
      const result = sanitizeText(malicious);

      expect(result).not.toContain('<script>');
      expect(result).toContain('Safe text');
    });

    it('should preserve plain text', () => {
      const text = 'Just plain text';
      expect(sanitizeText(text)).toBe('Just plain text');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow https URLs', () => {
      const url = 'https://example.com/page';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should allow http URLs', () => {
      const url = 'http://example.com/page';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should reject javascript: URLs', () => {
      const malicious = 'javascript:alert(1)';
      expect(sanitizeUrl(malicious)).toBeNull();
    });

    it('should reject data: URLs', () => {
      const malicious = 'data:text/html,<script>alert(1)</script>';
      expect(sanitizeUrl(malicious)).toBeNull();
    });

    it('should handle empty input', () => {
      expect(sanitizeUrl('')).toBeNull();
    });

    it('should handle malformed URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      const malicious = '../../../etc/passwd';
      const result = sanitizeFilename(malicious);

      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    it('should remove dangerous characters', () => {
      const malicious = 'file<name>.txt';
      const result = sanitizeFilename(malicious);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should preserve safe filenames', () => {
      const safe = 'my-file_2024.png';
      expect(sanitizeFilename(safe)).toBe(safe);
    });

    it('should handle spaces', () => {
      const withSpaces = 'my file name.txt';
      const result = sanitizeFilename(withSpaces);

      // Should either replace or remove spaces
      expect(result).not.toContain(' ');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);

      expect(result.length).toBeLessThanOrEqual(255);
    });
  });
});
