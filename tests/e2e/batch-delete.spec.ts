import { test, expect } from '@playwright/test';

async function login(page: any) {
  await page.goto('/auth/login');
  await page.waitForSelector('input[name="email"]', { timeout: 30000 });
  await page.fill('input[name="email"]', 'admin@admin.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL((url: URL) => !url.pathname.includes('/auth/login'), { timeout: 300000 });
}

test.describe('Session Batch Delete - API', () => {
  test('should handle API batch delete request', async ({ page }) => {
    await login(page);
    const sessionsResponse = await page.request.get('/api/sessions');
    const sessionsData = await sessionsResponse.json();

    if (sessionsData.data && sessionsData.data.length > 0) {
      const sessionId = sessionsData.data[0].sessionId;
      const deleteResponse = await page.request.post('/api/sessions/batch-delete', {
        data: { sessionIds: [sessionId] }
      });
      expect(deleteResponse.status()).toBe(200);
      const deleteData = await deleteResponse.json();
      expect(deleteData.status).toBe(true);
      expect(deleteData.data.deleted).toBe(1);
    }
  });

  test('should reject empty sessionIds array', async ({ page }) => {
    await login(page);
    const deleteResponse = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds: [] }
    });
    expect(deleteResponse.status()).toBe(400);
    const deleteData = await deleteResponse.json();
    expect(deleteData.message).toBe('sessionIds array is required');
  });

  test('should reject batch size over 50', async ({ page }) => {
    await login(page);
    const sessionIds = Array.from({ length: 51 }, (_, i) => `session-${i}`);
    const deleteResponse = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds }
    });
    expect(deleteResponse.status()).toBe(400);
    const deleteData = await deleteResponse.json();
    expect(deleteData.message).toBe('Maximum 50 sessions per batch');
  });

  test('should handle partial failures gracefully', async ({ page }) => {
    await login(page);
    const deleteResponse = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds: ['non-existent-session-1', 'non-existent-session-2'] }
    });
    expect(deleteResponse.status()).toBe(200);
    const deleteData = await deleteResponse.json();
    expect(deleteData.status).toBe(true);
  });

  test('should not affect other sessions when deleting', async ({ page }) => {
    await login(page);
    const sessionsBefore = await page.request.get('/api/sessions');
    const sessionsDataBefore = await sessionsBefore.json();

    if (sessionsDataBefore.data && sessionsDataBefore.data.length > 1) {
      const sessionToDelete = sessionsDataBefore.data[0].sessionId;
      const sessionToKeep = sessionsDataBefore.data[1].sessionId;

      await page.request.post('/api/sessions/batch-delete', {
        data: { sessionIds: [sessionToDelete] }
      });

      const sessionsAfter = await page.request.get('/api/sessions');
      const sessionsDataAfter = await sessionsAfter.json();
      const keptSession = sessionsDataAfter.data.find((s: any) => s.sessionId === sessionToKeep);
      expect(keptSession).toBeDefined();
    }
  });
});

test.describe('Session Batch Delete - UI', () => {
  test('should display batch delete UI elements', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/sessions', { timeout: 300000 });
    await page.waitForLoadState('domcontentloaded');
    const selectAll = page.locator('button:has-text("Select All")');
    await expect(selectAll).toBeVisible({ timeout: 60000 });
  });

  test('should show delete button when sessions are selected', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/sessions', { timeout: 300000 });
    await page.waitForLoadState('domcontentloaded');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();
      const deleteBtn = page.locator('button:has-text("Delete")');
      await expect(deleteBtn).toBeVisible();
    }
  });

  test('should show confirmation dialog before delete', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/sessions', { timeout: 300000 });
    await page.waitForLoadState('domcontentloaded');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();
      await page.locator('button:has-text("Delete")').click();
      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
    }
  });

  test('should cancel batch delete', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/sessions', { timeout: 300000 });
    await page.waitForLoadState('domcontentloaded');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();
      await page.locator('button:has-text("Delete")').click();
      await page.locator('[role="alertdialog"] button:has-text("Cancel")').click();
      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();
    }
  });

  test('should clear selection', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/sessions', { timeout: 300000 });
    await page.waitForLoadState('domcontentloaded');

    const selectAll = page.locator('button:has-text("Select All")');
    if (await selectAll.isVisible()) {
      await selectAll.click();
      await page.locator('button:has-text("Clear")').click();
      await expect(page.locator('button:has-text("Clear")')).not.toBeVisible();
    }
  });
});
