import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/WA-AKG/);
});

test('can navigate to login', async ({ page }) => {
  await page.goto('/');
});
