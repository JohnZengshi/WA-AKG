import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('redirects to login when accessing dashboard sessions', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('redirects to login when accessing dashboard chat', async ({ page }) => {
    await page.goto('/dashboard/chat');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
