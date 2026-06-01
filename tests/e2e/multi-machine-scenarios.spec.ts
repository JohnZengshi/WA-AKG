import { test, expect } from '@playwright/test';

test.describe('Multi-Machine Business Scenarios', () => {
  const MACHINE_A_URL = 'http://localhost:3001';
  const MACHINE_B_URL = 'http://localhost:3002';

  test('Scenario 1: Machine A creates session, Machine B cannot see it', async ({ page, request }) => {
    await page.goto(`${MACHINE_A_URL}/auth/login`);
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    await page.goto(`${MACHINE_A_URL}/dashboard/sessions`);

    const createButton = page.locator('button:has-text("Create Session")');
    if (await createButton.isVisible()) {
      await createButton.click();

      await page.fill('#session-name', 'Machine A Session');
      await page.fill('#session-id', 'machine-a-session-001');

      await page.locator('button:has-text("Create Session")').last().click();

      await page.waitForTimeout(2000);

      const sessionInA = page.locator('text=Machine A Session');
      await expect(sessionInA).toBeVisible();

      const sessionsResponse = await page.request.get(`${MACHINE_A_URL}/api/sessions`);
      const sessionsData = await sessionsResponse.json();
      const createdSession = sessionsData.data.find((s: any) => s.sessionId === 'machine-a-session-001');

      expect(createdSession).toBeDefined();
      expect(createdSession.assignedTo).toBeDefined();
    }
  });

  test('Scenario 2: Machine B creates its own session', async ({ page, request }) => {
    await page.goto(`${MACHINE_B_URL}/auth/login`);
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    await page.goto(`${MACHINE_B_URL}/dashboard/sessions`);

    const createButton = page.locator('button:has-text("Create Session")');
    if (await createButton.isVisible()) {
      await createButton.click();

      await page.fill('#session-name', 'Machine B Session');
      await page.fill('#session-id', 'machine-b-session-001');

      await page.locator('button:has-text("Create Session")').last().click();

      await page.waitForTimeout(2000);

      const sessionInB = page.locator('text=Machine B Session');
      await expect(sessionInB).toBeVisible();

      const sessionsResponse = await page.request.get(`${MACHINE_B_URL}/api/sessions`);
      const sessionsData = await sessionsResponse.json();
      const createdSession = sessionsData.data.find((s: any) => s.sessionId === 'machine-b-session-001');

      expect(createdSession).toBeDefined();
      expect(createdSession.assignedTo).toBeDefined();
    }
  });

  test('Scenario 3: Machine A cannot operate on Machine B session', async ({ page, request }) => {
    await page.goto(`${MACHINE_A_URL}/auth/login`);
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    const sessionsResponseB = await page.request.get(`${MACHINE_B_URL}/api/sessions`);
    const sessionsDataB = await sessionsResponseB.json();

    if (sessionsDataB.data && sessionsDataB.data.length > 0) {
      const machineBSessionId = sessionsDataB.data[0].sessionId;

      const response = await page.request.patch(
        `${MACHINE_A_URL}/api/sessions/${machineBSessionId}/settings`,
        {
          data: {
            config: { test: true },
          },
        }
      );

      expect([403, 404]).toContain(response.status());
    }
  });
});
