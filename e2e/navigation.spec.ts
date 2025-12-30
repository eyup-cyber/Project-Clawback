import { expect, test } from '@playwright/test';

test.describe('Site Navigation', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/scroungers/i);
  });

  test('should navigate to articles', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /articles|content/i })
      .first()
      .click();
    await expect(page).toHaveURL(/articles|categories/);
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /about/i })).toBeVisible();
  });

  test('should navigate to contact page', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
  });

  test('should navigate to FAQ page', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.getByRole('heading', { name: /faq|questions/i })).toBeVisible();
  });

  test('should navigate to contributor application', async ({ page }) => {
    await page.goto('/apply');
    await expect(page.getByRole('heading', { name: /apply|contributor|join/i })).toBeVisible();
  });

  test('should have working header navigation', async ({ page }) => {
    await page.goto('/');
    // Header should be present
    await expect(page.locator('header')).toBeVisible();
  });

  test('should have working footer', async ({ page }) => {
    await page.goto('/');
    // Footer should be present
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
