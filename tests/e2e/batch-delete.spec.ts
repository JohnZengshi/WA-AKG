import { test, expect } from '@playwright/test';

test.describe('Session Batch Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');
  });

  test('should display batch delete UI elements', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAllButton = page.locator('button:has-text("Select All")');
    await expect(selectAllButton).toBeVisible();
  });

  test('should select and deselect sessions', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAllButton = page.locator('button:has-text("Select All")');
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click();

      const deselectButton = page.locator('button:has-text("Deselect All")');
      await expect(deselectButton).toBeVisible();

      const selectedCount = page.locator('text=/\\d+ selected/');
      await expect(selectedCount).toBeVisible();

      await deselectButton.click();
      await expect(selectAllButton).toBeVisible();
    }
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAllButton = page.locator('button:has-text("Select All")');
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click();

      const deleteButton = page.locator('button:has-text("Delete Selected")');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const confirmDialog = page.locator('[role="alertdialog"]');
        await expect(confirmDialog).toBeVisible();

        const cancelButton = page.locator('button:has-text("Cancel")');
        await cancelButton.click();
      }
    }
  });

  test('should cancel batch delete', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAllButton = page.locator('button:has-text("Select All")');
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click();

      const deleteButton = page.locator('button:has-text("Delete Selected")');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const cancelButton = page.locator('button:has-text("Cancel")');
        await cancelButton.click();

        const sessionsStillExist = page.locator('text=/Session/');
        await expect(sessionsStillExist).toBeVisible();
      }
    }
  });

  test('should handle API batch delete request', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

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
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const deleteResponse = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds: [] }
    });

    expect(deleteResponse.status()).toBe(400);
    const deleteData = await deleteResponse.json();
    expect(deleteData.message).toBe('sessionIds array is required');
  });

  test('should reject batch size over 50', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const sessionIds = Array.from({ length: 51 }, (_, i) => `session-${i}`);
    const deleteResponse = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds }
    });

    expect(deleteResponse.status()).toBe(400);
    const deleteData = await deleteResponse.json();
    expect(deleteData.message).toBe('Maximum 50 sessions per batch');
  });

  test('should handle partial failures gracefully', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const deleteResponse = await page.request.post('/api/sessions/batch-delete', {
      data: { sessionIds: ['non-existent-session-1', 'non-existent-session-2'] }
    });

    expect(deleteResponse.status()).toBe(200);
    const deleteData = await deleteResponse.json();
    expect(deleteData.status).toBe(true);
    expect(deleteData.data.failed).toBe(2);
    expect(deleteData.data.errors.length).toBe(2);
  });

  test('should verify sessions are actually deleted', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const sessionsBefore = await page.request.get('/api/sessions');
    const sessionsDataBefore = await sessionsBefore.json();

    if (sessionsDataBefore.data && sessionsDataBefore.data.length > 0) {
      const sessionId = sessionsDataBefore.data[0].sessionId;

      await page.request.post('/api/sessions/batch-delete', {
        data: { sessionIds: [sessionId] }
      });

      const sessionsAfter = await page.request.get('/api/sessions');
      const sessionsDataAfter = await sessionsAfter.json();

      const deletedSession = sessionsDataAfter.data.find((s: any) => s.sessionId === sessionId);
      expect(deletedSession).toBeUndefined();
    }
  });

  test('should not affect other sessions when deleting', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

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
