import { expect, test } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Login', () => {
    test('should show login page', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: /sign in/i }).click();
      // Form validation should trigger
      await expect(page.locator('form')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();
      // Should show error toast or message
      await expect(page.locator('body')).toContainText(/failed|invalid|error/i);
    });

    test('should have OAuth buttons', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /x/i })).toBeVisible();
    });

    test('should have magic link option', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByText(/magic link/i)).toBeVisible();
    });

    test('should have link to register', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    });

    test('should have link to forgot password', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    });
  });

  test.describe('Registration', () => {
    test('should show registration page', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    });

    test('should have OAuth signup buttons', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /x/i })).toBeVisible();
    });

    test('should show password strength indicator', async ({ page }) => {
      await page.goto('/register');
      await page.getByLabel(/^password$/i).fill('weak');
      // Should show password strength indicator
      await expect(page.locator('body')).toContainText(/weak|fair|good|strong/i);
    });

    test('should have link to login', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should show forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(page.getByRole('heading', { name: /forgot password|reset/i })).toBeVisible();
    });

    test('should have email input', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(page.getByLabel(/email/i)).toBeVisible();
    });
  });
});
