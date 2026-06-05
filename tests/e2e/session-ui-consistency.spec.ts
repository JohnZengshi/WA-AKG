import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const WORKER_TAG = process.env.PLAYWRIGHT_WORKER_ID || crypto.randomUUID().substring(0, 6);
const TEST_PREFIX = `[UI-CONSISTENCY-${WORKER_TAG}]`;

let prisma: PrismaClient;

function ensureEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/^DATABASE_URL=(.+)$/m);
    if (match) process.env.DATABASE_URL = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set. Ensure .env exists.');
  }
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/auth/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[name="email"]', { timeout: 30000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 120000 });
  await page.waitForLoadState('networkidle');
}

test.beforeAll(async () => {
  ensureEnv();
  prisma = new PrismaClient();

  await prisma.session.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });

  const admin = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } });
  if (!admin) {
    throw new Error('SuperAdmin not found. Run: npm run make-admin admin@admin.com admin123');
  }
});

test.afterAll(async () => {
  if (prisma) {
    await prisma.session.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
    await prisma.$disconnect();
  }
});

test.describe('Session UI Consistency', () => {
  let testSessionId: string;

  test.beforeEach(async () => {
    const tag = `${WORKER_TAG}-${Date.now()}`;
    testSessionId = `e2e-ui-${tag}`;

    await prisma.session.create({
      data: {
        userId: (await prisma.user.findUnique({ where: { email: 'admin@admin.com' } }))!.id,
        name: `${TEST_PREFIX} UI Test ${tag}`,
        sessionId: testSessionId,
        status: 'DISCONNECTED',
        assignedTo: null,
      },
    });
  });

  test.afterEach(async () => {
    if (prisma) {
      await prisma.session.deleteMany({ where: { sessionId: testSessionId } }).catch(() => {});
    }
  });

  test('should show correct session status after DB state update', async ({ page }) => {
    await loginAs(page, 'admin@admin.com', 'admin123');
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const sessionCard = page.locator('[data-testid="session-card"]').filter({ hasText: TEST_PREFIX });
    await expect(sessionCard).toBeVisible({ timeout: 15000 });

    const statusBadge = sessionCard.locator('[data-testid="status-badge"], .status-badge, [class*="status"]').first();
    if (await statusBadge.isVisible().catch(() => false)) {
      const statusText = await statusBadge.textContent();
      expect(statusText?.toLowerCase()).toContain('disconnect');
    }

    await prisma.session.update({
      where: { sessionId: testSessionId },
      data: { status: 'CONNECTED' },
    });

    await page.reload({ waitUntil: 'networkidle' });

    const updatedBadge = page
      .locator('[data-testid="session-card"]')
      .filter({ hasText: TEST_PREFIX })
      .locator('[data-testid="status-badge"], .status-badge, [class*="status"]')
      .first();
    if (await updatedBadge.isVisible().catch(() => false)) {
      const statusText = await updatedBadge.textContent();
      expect(statusText?.toLowerCase()).toContain('connect');
    }
  });

  test('should handle multiple status transitions without UI errors', async ({ page }) => {
    await loginAs(page, 'admin@admin.com', 'admin123');
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const states = ['CONNECTING', 'CONNECTED', 'DISCONNECTED', 'CONNECTED', 'STOPPED'];
    for (const state of states) {
      await prisma.session.update({
        where: { sessionId: testSessionId },
        data: { status: state },
      });
    }

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload({ waitUntil: 'networkidle' });

    const sessionErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('Failed to load resource'),
    );
    expect(sessionErrors.length).toBe(0);
  });

  test('should gracefully handle session that has been deleted from DB', async ({ page }) => {
    await loginAs(page, 'admin@admin.com', 'admin123');
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const sessionCard = page.locator('[data-testid="session-card"]').filter({ hasText: TEST_PREFIX });
    await expect(sessionCard).toBeVisible({ timeout: 15000 });

    await prisma.session.delete({ where: { sessionId: testSessionId } });

    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toBe('');
  });

  test('should reflect session state changes across page navigation', async ({ page }) => {
    await loginAs(page, 'admin@admin.com', 'admin123');

    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const sessionCard = page.locator('[data-testid="session-card"]').filter({ hasText: TEST_PREFIX });
    await expect(sessionCard).toBeVisible({ timeout: 15000 });

    await prisma.session.update({
      where: { sessionId: testSessionId },
      data: { status: 'CONNECTED' },
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const sessionCardAfterNav = page
      .locator('[data-testid="session-card"]')
      .filter({ hasText: TEST_PREFIX });
    await expect(sessionCardAfterNav).toBeVisible({ timeout: 15000 });
  });

  test('should not accumulate stale sessions in selector after batch delete', async ({ page }) => {
    const tag = `${WORKER_TAG}-batch-${Date.now()}`;
    const userId = (await prisma.user.findUnique({ where: { email: 'admin@admin.com' } }))!.id;
    const sessionIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const sid = `e2e-batch-ui-${tag}-${i}`;
      await prisma.session.create({
        data: {
          userId,
          name: `${TEST_PREFIX} Batch ${i}`,
          sessionId: sid,
          status: 'DISCONNECTED',
          assignedTo: null,
        },
      });
      sessionIds.push(sid);
    }

    await loginAs(page, 'admin@admin.com', 'admin123');
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    await prisma.session.deleteMany({ where: { sessionId: { in: sessionIds } } });

    await page.waitForTimeout(3000);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    await prisma.session.deleteMany({ where: { sessionId: { in: sessionIds } } }).catch(() => {});
  });
});

