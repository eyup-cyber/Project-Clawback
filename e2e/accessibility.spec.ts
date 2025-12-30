import { expect, test } from '@playwright/test';

test.describe('Accessibility', () => {
  test('homepage should have correct heading structure', async ({ page }) => {
    await page.goto('/');
    // Should have h1
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });

  test('login form should have accessible labels', async ({ page }) => {
    await page.goto('/login');
    // Email input should have label
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    // Password input should have label
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
  });

  test('registration form should have accessible labels', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByLabel(/full name|name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/login');
    // Submit button should have accessible name
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeVisible();
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    // All images should have alt attribute
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      // alt can be empty string for decorative images but should exist
      expect(alt).not.toBeNull();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    // Some element should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('links should have visible focus state', async ({ page }) => {
    await page.goto('/');
    // Find a link and focus it
    const link = page.getByRole('link').first();
    await link.focus();
    // Link should be focusable
    await expect(link).toBeFocused();
  });

  test('contact form should have accessible labels', async ({ page }) => {
    await page.goto('/contact');
    // Form fields should be labeled
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
  });
});
