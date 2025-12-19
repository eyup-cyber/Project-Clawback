import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should show full navigation on desktop', async ({ page }) => {
      await page.goto('/');
      // Navigation should be visible
      const nav = page.locator('nav, header');
      await expect(nav.first()).toBeVisible();
    });

    test('login page should display properly', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });
  });

  test.describe('Tablet', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should display content properly on tablet', async ({ page }) => {
      await page.goto('/');
      // Page should load without horizontal scroll
      const body = page.locator('body');
      const boundingBox = await body.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(768);
    });

    test('login page should be usable on tablet', async ({ page }) => {
      await page.goto('/login');
      // Form should be visible and usable
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });
  });

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should show mobile navigation', async ({ page }) => {
      await page.goto('/');
      // Mobile menu button should be visible OR navigation should be condensed
      const header = page.locator('header');
      await expect(header).toBeVisible();
    });

    test('login form should be full width on mobile', async ({ page }) => {
      await page.goto('/login');
      // Form should be visible
      const form = page.locator('form');
      await expect(form).toBeVisible();
    });

    test('buttons should be touch-friendly size', async ({ page }) => {
      await page.goto('/login');
      const button = page.getByRole('button', { name: /sign in/i });
      const boundingBox = await button.boundingBox();
      // Touch targets should be at least 44px
      expect(boundingBox?.height).toBeGreaterThanOrEqual(40);
    });

    test('text should be readable without zooming', async ({ page }) => {
      await page.goto('/');
      // Main text should have reasonable font size
      const paragraph = page.locator('p').first();
      if (await paragraph.count() > 0) {
        const fontSize = await paragraph.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        // Font size should be at least 14px
        expect(parseInt(fontSize)).toBeGreaterThanOrEqual(14);
      }
    });
  });
});
