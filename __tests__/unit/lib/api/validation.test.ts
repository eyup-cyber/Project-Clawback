/**
 * Unit tests for API validation schemas
 */

import {
  uuidSchema,
  slugSchema,
  emailSchema,
  urlSchema,
  paginationSchema,
  createPostSchema,
  createCommentSchema,
  contributorApplicationSchema,
  contactSubmissionSchema,
  generateSlug,
  calculateReadingTime,
} from '@/lib/api/validation';

describe('Validation Schemas', () => {
  describe('uuidSchema', () => {
    it('should accept valid UUIDs', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(() => uuidSchema.parse(validUuid)).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
      expect(() => uuidSchema.parse('123')).toThrow();
    });
  });

  describe('slugSchema', () => {
    it('should accept valid slugs', () => {
      expect(() => slugSchema.parse('valid-slug')).not.toThrow();
      expect(() => slugSchema.parse('post-123')).not.toThrow();
      expect(() => slugSchema.parse('my-great-article')).not.toThrow();
    });

    it('should reject invalid slugs', () => {
      expect(() => slugSchema.parse('Invalid Slug')).toThrow();
      expect(() => slugSchema.parse('slug_with_underscores')).toThrow();
      expect(() => slugSchema.parse('')).toThrow();
    });
  });

  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow();
      expect(() => emailSchema.parse('user.name@domain.co.uk')).not.toThrow();
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('not-an-email')).toThrow();
      expect(() => emailSchema.parse('@missing-local.com')).toThrow();
    });
  });

  describe('urlSchema', () => {
    it('should accept valid URLs', () => {
      expect(() => urlSchema.parse('https://example.com')).not.toThrow();
      expect(() => urlSchema.parse('http://localhost:3000')).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      expect(() => urlSchema.parse('not-a-url')).toThrow();
      expect(() => urlSchema.parse('ftp://invalid.com')).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('should provide defaults', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should accept valid pagination params', () => {
      const result = paginationSchema.parse({ page: 2, limit: 50 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should enforce max limit', () => {
      const result = paginationSchema.parse({ limit: 200 });
      expect(result.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('createPostSchema', () => {
    const validPost = {
      title: 'Test Post Title',
      content_type: 'written',
      category_id: '123e4567-e89b-12d3-a456-426614174000',
    };

    it('should accept valid post data', () => {
      expect(() => createPostSchema.parse(validPost)).not.toThrow();
    });

    it('should require title', () => {
      const { title: _title, ...noTitle } = validPost;
      expect(() => createPostSchema.parse(noTitle)).toThrow();
    });

    it('should require category_id', () => {
      const { category_id: _categoryId, ...noCategory } = validPost;
      expect(() => createPostSchema.parse(noCategory)).toThrow();
    });

    it('should validate content_type enum', () => {
      expect(() => createPostSchema.parse({ ...validPost, content_type: 'invalid' })).toThrow();
    });
  });

  describe('createCommentSchema', () => {
    it('should accept valid comment data', () => {
      const validComment = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'This is a valid comment',
      };
      expect(() => createCommentSchema.parse(validComment)).not.toThrow();
    });

    it('should require content', () => {
      const noContent = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => createCommentSchema.parse(noContent)).toThrow();
    });

    it('should allow optional parent_id for replies', () => {
      const reply = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Reply comment',
        parent_id: '223e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => createCommentSchema.parse(reply)).not.toThrow();
    });
  });

  describe('contributorApplicationSchema', () => {
    const validApplication = {
      full_name: 'John Doe',
      email: 'john@example.com',
      content_types: ['written'],
      topics: ['politics', 'economics'],
      first_piece_pitch: 'I want to write about housing policy from lived experience.',
      why_scroungers: 'I believe in amplifying marginalized voices.',
    };

    it('should accept valid application', () => {
      expect(() => contributorApplicationSchema.parse(validApplication)).not.toThrow();
    });

    it('should require all mandatory fields', () => {
      const { full_name: _fullName, ...noName } = validApplication;
      expect(() => contributorApplicationSchema.parse(noName)).toThrow();
    });
  });

  describe('contactSubmissionSchema', () => {
    it('should accept valid contact form', () => {
      const validContact = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'Inquiry',
        message: 'Hello, I have a question.',
        category: 'general',
      };
      expect(() => contactSubmissionSchema.parse(validContact)).not.toThrow();
    });
  });
});

describe('Helper Functions', () => {
  describe('generateSlug', () => {
    it('should convert title to slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('The Housing Crisis: A Deep Dive')).toBe(
        'the-housing-crisis-a-deep-dive'
      );
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello! World?')).toBe('hello-world');
      expect(generateSlug("It's a test")).toBe('its-a-test');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('Hello    World')).toBe('hello-world');
    });
  });

  describe('calculateReadingTime', () => {
    it('should calculate reading time based on word count', () => {
      // Assuming ~200 words per minute
      const shortText = 'This is a short text.'; // ~5 words
      const longText = 'word '.repeat(400); // 400 words

      expect(calculateReadingTime(shortText)).toBe(1); // Minimum 1 minute
      expect(calculateReadingTime(longText)).toBe(2); // ~2 minutes
    });

    it('should return 0 for empty content', () => {
      expect(calculateReadingTime('')).toBe(0);
    });
  });
});
