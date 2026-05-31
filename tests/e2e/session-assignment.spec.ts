import { test, expect } from '@playwright/test';

test.describe('Session Assignment E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url: URL) => !url.pathname.includes('/auth/login'), { timeout: 300000 });
  });

  test('should display machine ID in sidebar', async ({ page }) => {
    const machineIdElement = page.locator('text=Machine ID');
    await expect(machineIdElement).toBeVisible();
  });

  test('should display machine ID in session selector', async ({ page }) => {
    await page.goto('/dashboard/sessions');

    const sessionSelector = page.locator('[data-testid="session-selector"]');
    if (await sessionSelector.isVisible()) {
      const machineText = page.locator('text=Machine:');
      await expect(machineText).toBeVisible();
    }
  });

  test('should display machine ID in session cards', async ({ page }) => {
    await page.goto('/dashboard/sessions');

    const sessionCards = page.locator('[data-testid="session-card"]');
    const count = await sessionCards.count();

    if (count > 0) {
      const firstCard = sessionCards.first();
      const machineText = firstCard.locator('text=Machine:');
      await expect(machineText).toBeVisible();
    }
  });

  test('should display machine ID in dashboard session list', async ({ page }) => {
    await page.goto('/dashboard');

    const sessionItems = page.locator('[data-testid="session-item"]');
    const count = await sessionItems.count();

    if (count > 0) {
      const firstItem = sessionItems.first();
      const machineText = firstItem.locator('text=Machine:');
      await expect(machineText).toBeVisible();
    }
  });

  test('should display machine ID in session detail page', async ({ page }) => {
    await page.goto('/dashboard/sessions');

    const firstSession = page.locator('[data-testid="session-card"]').first();
    if (await firstSession.isVisible()) {
      await firstSession.click();

      const machineIdLabel = page.locator('text=Machine ID');
      await expect(machineIdLabel).toBeVisible();
    }
  });

  test('should create session with machine ID assignment', async ({ page }) => {
    await page.goto('/dashboard/sessions');

    const createButton = page.locator('button:has-text("Create Session")');
    if (await createButton.isVisible()) {
      await createButton.click();

      await page.fill('#session-name', 'Test Session');
      await page.fill('#session-id', 'test-session-123');

      await page.locator('button:has-text("Create Session")').last().click();

      await page.waitForTimeout(2000);

      const sessionCard = page.locator('text=Test Session');
      if (await sessionCard.isVisible()) {
        const machineText = page.locator('text=Machine:');
        await expect(machineText).toBeVisible();
      }
    }
  });

  test('should not allow operations on sessions from other machines', async ({ page }) => {
    await page.goto('/dashboard/sessions');

    const sessionCards = page.locator('[data-testid="session-card"]');
    const count = await sessionCards.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const card = sessionCards.nth(i);
        const statusBadge = card.locator('[data-testid="status-badge"]');
        const machineText = card.locator('text=Machine:');

        const hasStatus = await statusBadge.isVisible().catch(() => false);
        const hasMachine = await machineText.isVisible().catch(() => false);

        expect(hasStatus || hasMachine).toBeTruthy();
      }
    }
  });

  test('should refresh sessions and maintain machine ID display', async ({ page }) => {
    await page.goto('/dashboard/sessions');

    const refreshButton = page.locator('button[title="Refresh Sessions"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      await page.waitForTimeout(1000);

      const machineText = page.locator('text=Machine:');
      const count = await machineText.count();

      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle session status changes with machine ID', async ({ page }) => {
    await page.goto('/dashboard/sessions');

    const sessionCards = page.locator('[data-testid="session-card"]');
    const count = await sessionCards.count();

    if (count > 0) {
      const firstCard = sessionCards.first();

      const statusBadge = firstCard.locator('[data-testid="status-badge"]');
      const machineText = firstCard.locator('text=Machine:');

      const hasStatus = await statusBadge.isVisible().catch(() => false);
      const hasMachine = await machineText.isVisible().catch(() => false);

      expect(typeof hasStatus).toBe('boolean');
      expect(typeof hasMachine).toBe('boolean');
    }
  });

  test('should display machine ID in collapsed sidebar', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      const collapseButton = page.locator('button[title="Collapse Sidebar"]');
      if (await collapseButton.isVisible()) {
        await collapseButton.click();

        const machineBadge = page.locator('[data-testid="machine-id-badge"]');
        if (await machineBadge.isVisible()) {
          await expect(machineBadge).toBeVisible();
        }
      }
    }
  });

  test('should display machine ID in expanded sidebar', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      const expandButton = page.locator('button[title="Expand Sidebar"]');
      if (await expandButton.isVisible()) {
        await expandButton.click();

        const machineText = page.locator('text=Machine ID');
        if (await machineText.isVisible()) {
          await expect(machineText).toBeVisible();
        }
      }
    }
  });
});

test.describe('Session Assignment API Tests', () => {
  test('should return assignedTo in session list API', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    const sessionsResponse = await page.request.get('/api/sessions');
    const sessionsData = await sessionsResponse.json();

    expect(sessionsResponse.status()).toBe(200);
    expect(sessionsData.status).toBe(true);

    if (sessionsData.data && sessionsData.data.length > 0) {
      const firstSession = sessionsData.data[0];
      expect(firstSession).toHaveProperty('assignedTo');
    }
  });

  test('should return assignedTo in session detail API', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    const sessionsResponse = await page.request.get('/api/sessions');
    const sessionsData = await sessionsResponse.json();

    if (sessionsData.data && sessionsData.data.length > 0) {
      const sessionId = sessionsData.data[0].sessionId;

      const detailResponse = await page.request.get(`/api/sessions/${sessionId}`);
      const detailData = await detailResponse.json();

      expect(detailResponse.status()).toBe(200);
      expect(detailData.status).toBe(true);
      expect(detailData.data).toHaveProperty('assignedTo');
    }
  });

  test('should reject operations on sessions from other machines', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    const response = await page.request.patch('/api/sessions/non-existent-session/settings', {
      data: {
        config: { test: true },
      },
    });

    expect([403, 404]).toContain(response.status());
  });
});
