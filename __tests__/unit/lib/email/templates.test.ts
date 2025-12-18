/**
 * Unit tests for email templates
 */

import {
  welcomeEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
  postPublishedEmail,
  newCommentEmail,
  newsletterWelcomeEmail,
  passwordResetEmail,
} from '@/lib/email/templates';

describe('Email Templates', () => {
  describe('welcomeEmail', () => {
    it('should generate welcome email with username', () => {
      const { html, subject } = welcomeEmail('TestUser');

      expect(subject).toContain('Welcome');
      expect(html).toContain('TestUser');
      expect(html).toContain('Scroungers');
    });

    it('should include call-to-action link', () => {
      const { html } = welcomeEmail('User');

      expect(html).toContain('href=');
      // Button is rendered as a styled anchor tag
      expect(html).toContain('Explore Content');
    });
  });

  describe('applicationApprovedEmail', () => {
    it('should include approval message', () => {
      const { html, subject } = applicationApprovedEmail('Jane Doe');

      expect(subject.toLowerCase()).toContain('approved');
      expect(html).toContain('Jane Doe');
      expect(html).toContain('contributor');
    });

    it('should include next steps', () => {
      const { html } = applicationApprovedEmail('User');

      expect(html).toContain('start');
    });
  });

  describe('applicationRejectedEmail', () => {
    it('should include rejection message', () => {
      const { html, subject: _subject } = applicationRejectedEmail('John Doe');

      expect(html).toContain('John Doe');
      expect(html).toContain('not to move forward');
    });

    it('should be respectful in tone', () => {
      const { html } = applicationRejectedEmail('User');

      // Should not contain harsh language
      expect(html.toLowerCase()).not.toContain('denied');
      expect(html.toLowerCase()).not.toContain('failed');
    });
  });

  describe('postPublishedEmail', () => {
    it('should include post title and link', () => {
      const { html, subject } = postPublishedEmail(
        'Author Name',
        'My Great Article',
        'my-great-article'
      );

      expect(subject).toContain('live');
      expect(html).toContain('My Great Article');
      expect(html).toContain('my-great-article');
    });

    it('should congratulate the author', () => {
      const { html } = postPublishedEmail('User', 'Title', 'slug');

      expect(html.toLowerCase()).toMatch(/congrat|great|published/);
    });
  });

  describe('newCommentEmail', () => {
    it('should include commenter and post info', () => {
      const { html, subject } = newCommentEmail(
        'Post Author',
        'Commenter Name',
        'Article Title',
        'article-slug',
        'This is a great article...'
      );

      expect(subject).toContain('Commenter Name');
      expect(html).toContain('Post Author');
      expect(html).toContain('Article Title');
      expect(html).toContain('great article');
    });

    it('should include link to comment', () => {
      const { html } = newCommentEmail('A', 'B', 'T', 'slug', 'preview');

      expect(html).toContain('slug');
      expect(html).toContain('#comments');
    });
  });

  describe('newsletterWelcomeEmail', () => {
    it('should confirm subscription', () => {
      const { html, subject } = newsletterWelcomeEmail('test@example.com');

      expect(subject.toLowerCase()).toContain('subscri');
      expect(html).toContain('newsletter');
    });

    it('should include unsubscribe option', () => {
      const { html } = newsletterWelcomeEmail('test@example.com');

      // Email should mention unsubscribe even if link is in footer
      expect(html.toLowerCase()).toMatch(/unsubscribe|manage|preferences/);
    });
  });

  describe('passwordResetEmail', () => {
    it('should include reset link', () => {
      const resetUrl = 'https://example.com/reset?token=abc123';
      const { html, subject } = passwordResetEmail(resetUrl);

      expect(subject.toLowerCase()).toContain('password');
      expect(html).toContain(resetUrl);
    });

    it('should include security warning', () => {
      const { html } = passwordResetEmail('https://example.com/reset');

      expect(html.toLowerCase()).toMatch(/ignore|didn't request|expire/);
    });
  });

  describe('Email HTML structure', () => {
    it('all templates should produce valid HTML', () => {
      const templates = [
        welcomeEmail('User'),
        applicationApprovedEmail('User'),
        applicationRejectedEmail('User'),
        postPublishedEmail('User', 'Title', 'slug'),
        newCommentEmail('A', 'B', 'T', 'slug', 'preview'),
        newsletterWelcomeEmail('test@example.com'),
        passwordResetEmail('https://example.com'),
      ];

      for (const { html } of templates) {
        // Should have DOCTYPE
        expect(html).toContain('<!DOCTYPE html>');
        // Should have html tag
        expect(html).toContain('<html');
        // Should have body
        expect(html).toContain('<body');
        // Should be properly closed
        expect(html).toContain('</html>');
      }
    });

    it('all templates should include branding', () => {
      const templates = [
        welcomeEmail('User'),
        applicationApprovedEmail('User'),
        newsletterWelcomeEmail('test@example.com'),
      ];

      for (const { html } of templates) {
        expect(html.toLowerCase()).toContain('scroungers');
      }
    });
  });
});
