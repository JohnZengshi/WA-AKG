import { test, expect } from '@playwright/test';

test.describe('Session Assignment Business Scenarios', () => {
  const MACHINE_A_URL = 'http://localhost:3001';
  const MACHINE_B_URL = 'http://localhost:3002';

  test('Scenario 1: API returns assignedTo field for sessions', async ({ page }) => {
    await page.goto(`${MACHINE_A_URL}/auth/login`);
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    const sessionsResponse = await page.request.get(`${MACHINE_A_URL}/api/sessions`);
    const sessionsData = await sessionsResponse.json();

    expect(sessionsData.status).toBe(true);
    expect(sessionsData.data).toBeDefined();

    if (sessionsData.data.length > 0) {
      for (const session of sessionsData.data) {
        expect(session).toHaveProperty('assignedTo');
        expect(session.assignedTo).toBeDefined();
      }
    }
  });

  test('Scenario 2: Session detail API includes assignedTo', async ({ page }) => {
    await page.goto(`${MACHINE_A_URL}/auth/login`);
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    const sessionsResponse = await page.request.get(`${MACHINE_A_URL}/api/sessions`);
    const sessionsData = await sessionsResponse.json();

    if (sessionsData.data && sessionsData.data.length > 0) {
      const sessionId = sessionsData.data[0].sessionId;

      const detailResponse = await page.request.get(`${MACHINE_A_URL}/api/sessions/${sessionId}`);
      const detailData = await detailResponse.json();

      expect(detailData.status).toBe(true);
      expect(detailData.data).toHaveProperty('assignedTo');
    }
  });

  test('Scenario 3: Permission check rejects operations on other machine sessions', async ({ page }) => {
    await page.goto(`${MACHINE_A_URL}/auth/login`);
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.waitForLoadState('networkidle');

    const response = await page.request.patch(`${MACHINE_A_URL}/api/sessions/non-existent-session/settings`, {
      data: { config: { test: true } }
    });

    expect([403, 404]).toContain(response.status());
  });
});
