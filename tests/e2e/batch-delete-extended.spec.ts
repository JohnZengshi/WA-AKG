import { test, expect } from '@playwright/test';

test.describe('Session Batch Delete - Extended', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');
  });

  test('should fail to delete with invalid JSON body', async ({ page }) => {
    const response = await page.request.post('/api/sessions/batch-delete', {
      data: undefined,
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json().catch(() => null);
    expect(response.status()).toBe(400);
  });

  test('should handle empty session list gracefully', async ({ page }) => {
    const response = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds: [] }
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toBe('sessionIds array is required');
  });

  test('should handle single non-existent session', async ({ page }) => {
    const response = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds: ['non-existent-session'] }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.data.failed).toBe(1);
    expect(data.data.errors[0]).toContain('non-existent-session');
  });

  test('should reject batch of 51 sessions', async ({ page }) => {
    const sessionIds = Array.from({ length: 51 }, (_, i) => `session-${i}`);
    const response = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds }
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toContain('Maximum');
  });

  test('should accept batch of exactly 50 sessions', async ({ page }) => {
    const sessionIds = Array.from({ length: 50 }, (_, i) => `non-existent-${i}`);
    const response = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds }
    });
    expect(response.status()).toBe(200);
  });
});

test.describe('Batch Delete UI - Extended', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');
  });

  test('should show select all button', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAll = page.locator('button:has-text("Select All")');
    await expect(selectAll).toBeVisible();
  });

  test('should toggle between select all and deselect all', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();

      const deselectAll = page.locator('button:has-text("Deselect All")');
      await expect(deselectAll).toBeVisible();

      await deselectAll.click();
      await expect(selectAll).toBeVisible();
    }
  });

  test('should show delete button when sessions are selected', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();

      const deleteBtn = page.locator('button:has-text("Delete")');
      await expect(deleteBtn).toBeVisible();

      const clearBtn = page.locator('button:has-text("Clear")');
      await expect(clearBtn).toBeVisible();
    }
  });

  test('should show selected count', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();

      const count = page.locator('text=/\\d+ selected/');
      await expect(count).toBeVisible();
    }
  });

  test('should clear selection when clear button is clicked', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();

      const clearBtn = page.locator('button:has-text("Clear")');
      await clearBtn.click();

      const selectAllAgain = page.locator('button:has-text("Select All")');
      await expect(selectAllAgain).toBeVisible();
      await expect(page.locator('button:has-text("Clear")')).not.toBeVisible();
    }
  });

  test('should show confirmation dialog before delete', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();

      const deleteBtn = page.locator('button:has-text("Delete")');
      await deleteBtn.click();

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('text=Delete')).toBeVisible();
      await expect(dialog.locator('text=Cancel')).toBeVisible();
    }
  });

  test('should have working cancel button in dialog', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();

      await page.locator('button:has-text("Delete")').click();

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();

      await dialog.locator('button:has-text("Cancel")').click();

      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();
    }
  });
});
