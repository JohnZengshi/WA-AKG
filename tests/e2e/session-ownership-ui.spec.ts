import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const OTHER_MACHINE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

// Per-worker unique prefix so parallel workers don't interfere
const WORKER_TAG = process.env.PLAYWRIGHT_WORKER_ID || crypto.randomUUID().substring(0, 6);
const TEST_PREFIX = `[E2E-${WORKER_TAG}]`;

let prisma: PrismaClient;
let testData: {
  otherSession: { sessionId: string; name: string };
  ownedSession: { sessionId: string; name: string };
};
let ownerTestData: {
  otherSession: { sessionId: string; name: string };
  ownedSession: { sessionId: string; name: string };
};

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

  // Clean leftover data from THIS worker only
  await prisma.session.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });

  const superAdmin = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } });
  if (!superAdmin) {
    throw new Error('SuperAdmin not found. Run: npm run make-admin admin@admin.com admin123');
  }

  // Create a regular STAFF user for restriction tests
  const testStaffEmail = `test-staff-${WORKER_TAG}@e2e.test`;
  let testStaff = await prisma.user.findUnique({ where: { email: testStaffEmail } });
  if (!testStaff) {
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.hash('teststaff123', 10);
    testStaff = await prisma.user.create({
      data: {
        email: testStaffEmail,
        name: `E2E Staff ${WORKER_TAG}`,
        password: hashed,
        role: 'STAFF',
      },
    });
  }

  const tag = `${WORKER_TAG}-${Date.now()}`;

  // Sessions owned by the STAFF user so they can access them
  const ownedSession = await prisma.session.create({
    data: {
      userId: testStaff.id,
      name: `${TEST_PREFIX} Owned`,
      sessionId: `e2e-owned-${tag}`,
      status: 'DISCONNECTED',
      assignedTo: null,
    },
  });

  const otherSession = await prisma.session.create({
    data: {
      userId: testStaff.id,
      name: `${TEST_PREFIX} Other`,
      sessionId: `e2e-other-${tag}`,
      status: 'DISCONNECTED',
      assignedTo: OTHER_MACHINE_ID,
    },
  });

  testData = {
    otherSession: { sessionId: otherSession.sessionId, name: otherSession.name },
    ownedSession: { sessionId: ownedSession.sessionId, name: ownedSession.name },
  };

  // Create an OWNER user for admin bypass tests
  const testOwnerEmail = `test-owner-${WORKER_TAG}@e2e.test`;
  let testOwner = await prisma.user.findUnique({ where: { email: testOwnerEmail } });
  if (!testOwner) {
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.hash('testowner123', 10);
    testOwner = await prisma.user.create({
      data: {
        email: testOwnerEmail,
        name: `E2E Owner ${WORKER_TAG}`,
        password: hashed,
        role: 'OWNER',
      },
    });
  }

  const ownerTag = `${WORKER_TAG}-owner-${Date.now()}`;

  const ownerOwnedSession = await prisma.session.create({
    data: {
      userId: testOwner.id,
      name: `${TEST_PREFIX} Owner-Owned`,
      sessionId: `e2e-owner-owned-${ownerTag}`,
      status: 'DISCONNECTED',
      assignedTo: null,
    },
  });

  const ownerOtherSession = await prisma.session.create({
    data: {
      userId: testOwner.id,
      name: `${TEST_PREFIX} Owner-Other`,
      sessionId: `e2e-owner-other-${ownerTag}`,
      status: 'DISCONNECTED',
      assignedTo: OTHER_MACHINE_ID,
    },
  });

  ownerTestData = {
    otherSession: { sessionId: ownerOtherSession.sessionId, name: ownerOtherSession.name },
    ownedSession: { sessionId: ownerOwnedSession.sessionId, name: ownerOwnedSession.name },
  };
});

test.afterAll(async () => {
  if (prisma) {
    await prisma.session.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `test-staff-${WORKER_TAG}` } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `test-owner-${WORKER_TAG}` } } });
    await prisma.$disconnect();
  }
});

// =============================================
// Restrictions as a STAFF user
// =============================================
test.describe('Session Ownership Restrictions (STAFF user)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, `test-staff-${WORKER_TAG}@e2e.test`, 'teststaff123');
  });

  test('should grey out and disable non-owned session card', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const otherCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Other' });
    await expect(otherCard).toBeVisible({ timeout: 15000 });

    await expect(otherCard).toHaveClass(/opacity-50/);
    await expect(otherCard).toHaveClass(/cursor-not-allowed/);

    const manageBtn = otherCard.locator('button:has-text("Manage")');
    await expect(manageBtn).toBeDisabled();
  });

  test('should not allow clicking a non-owned card to navigate to detail page', async ({ page }) => {
    page.on('dialog', () => {}); // suppress dialogs
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const otherCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Other' });
    await expect(otherCard).toBeVisible({ timeout: 15000 });

    // Click the card body (should just toggle selection, not navigate)
    const cardBody = otherCard.locator('[data-testid="session-card-body"]');
    if (await cardBody.isVisible()) {
      await cardBody.click({ force: true });
      // URL unchanged
      expect(page.url()).toContain('/dashboard/sessions');
    }
  });

  test('should not select non-owned session via Select All', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAllBtn = page.locator('button:has-text("Select All")');
    await expect(selectAllBtn).toBeVisible({ timeout: 15000 });
    await selectAllBtn.click();

    // Non-owned card should not show checked state
    const otherCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Other' });
    // It should have Square (unchecked), not CheckSquare (checked)
    const isSelected = await otherCard.locator('svg.lucide-check-square').isVisible().catch(() => false);
    expect(isSelected).toBeFalsy();
  });

  test('should disable non-owned Manage button', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const otherCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Other' });
    await expect(otherCard).toBeVisible({ timeout: 15000 });

    const manageBtn = otherCard.locator('button:has-text("Manage")');
    await expect(manageBtn).toBeDisabled();
  });

  test('should disable non-owned option in session selector', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const selector = page.locator('[data-testid="session-selector"]');
    await expect(selector).toBeVisible({ timeout: 15000 });
    await selector.click();

    const option = page.locator('[data-testid="session-selector-option"]').filter({ hasText: 'Other' });
    await expect(option).toBeVisible();
    await expect(option).toHaveClass(/opacity-40/);
    await expect(option).toHaveClass(/cursor-not-allowed/);
    await expect(option).toContainText('Not owned by this machine');

    await page.keyboard.press('Escape');
  });

  test('should not select non-owned session when clicking disabled dropdown option', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Get the current session value before clicking
    const selector = page.locator('[data-testid="session-selector"]');
    await expect(selector).toBeVisible({ timeout: 15000 });

    // Read currently selected session text
    const triggerText = await selector.locator('span.truncate.font-medium').textContent();

    // Open the dropdown
    await selector.click();

    // Try clicking a disabled (non-owned) option
    const disabledOption = page.locator('[data-testid="session-selector-option"]').filter({ hasText: 'Not owned by this machine' });
    if (await disabledOption.isVisible()) {
      await disabledOption.click({ force: true });

      // Verify the session value hasn't changed — the Radix Select should prevent selection
      const newTriggerText = await selector.locator('span.truncate.font-medium').textContent();
      expect(newTriggerText).toBe(triggerText);
    }

    await page.keyboard.press('Escape');
  });

  test('should redirect non-owned session detail page', async ({ page }) => {
    await page.goto(`/dashboard/sessions/${testData.otherSession.sessionId}`);
    await page.waitForURL(
      (url) => !url.pathname.includes(testData.otherSession.sessionId),
      { timeout: 15000 }
    );
    expect(
      page.url().includes('/dashboard/sessions') || page.url().includes('/dashboard')
    ).toBeTruthy();
  });
});

// =============================================
// OWNER admin bypass — admins can manage all sessions
// =============================================
test.describe('Session Ownership - OWNER admin bypass', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, `test-owner-${WORKER_TAG}@e2e.test`, 'testowner123');
  });

  test('should allow selecting non-owned session card for batch delete', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    // Find the other-machine card
    const otherCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Owner-Other' });
    await expect(otherCard).toBeVisible({ timeout: 15000 });

    // Card should NOT have cursor-not-allowed (admin bypass)
    await expect(otherCard).not.toHaveClass(/cursor-not-allowed/);

    // Click the card to select it
    const cardBody = otherCard.locator('[data-testid="session-card-body"]');
    if (await cardBody.isVisible()) {
      await cardBody.click({ force: true });
    } else {
      await otherCard.click({ force: true });
    }

    // Delete button should appear (batch delete panel)
    const deleteBtn = page.locator('button:has-text("Delete")');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  });

  test('should allow Select All to select all sessions including non-owned', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const selectAllBtn = page.locator('button:has-text("Select All")');
    await expect(selectAllBtn).toBeVisible({ timeout: 15000 });
    await selectAllBtn.click();

    // Both owned and non-owned cards should show CheckSquare icon to confirm selected
    const otherCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Owner-Other' });
    const ownedCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Owner-Owned' });
    await expect(ownedCard.locator('.lucide-square-check-big')).toBeVisible({ timeout: 5000 });
    await expect(otherCard.locator('.lucide-square-check-big')).toBeVisible({ timeout: 5000 });
  });

  test('should not allow selecting non-owned session from dropdown', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const selector = page.locator('[data-testid="session-selector"]');
    await expect(selector).toBeVisible({ timeout: 15000 });
    await selector.click();

    // Other-machine option SHOULD have cursor-not-allowed (no admin bypass for dropdown)
    const option = page.locator('[data-testid="session-selector-option"]').filter({ hasText: 'Owner-Other' });
    await expect(option).toBeVisible();
    await expect(option).toHaveClass(/cursor-not-allowed/);
    await expect(option).toContainText('Not owned by this machine');

    await page.keyboard.press('Escape');
  });

  test('should redirect non-owned session detail page for admin', async ({ page }) => {
    await page.goto(`/dashboard/sessions/${ownerTestData.otherSession.sessionId}`);
    await page.waitForURL(
      (url) => !url.pathname.includes(ownerTestData.otherSession.sessionId),
      { timeout: 15000 }
    );
    expect(
      page.url().includes('/dashboard/sessions') || page.url().includes('/dashboard')
    ).toBeTruthy();
  });

  test('should disable Manage button on non-owned card even for admin', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const otherCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Owner-Other' });
    await expect(otherCard).toBeVisible({ timeout: 15000 });

    // Manage button should be disabled since session is not owned by this machine
    const manageBtn = otherCard.locator('button:has-text("Manage")');
    await expect(manageBtn).toBeDisabled();

    // Share button should also be disabled
    const shareBtn = otherCard.locator('button:has-text("Share")');
    await expect(shareBtn).toBeDisabled();
  });

  test('should show admin bypass badge on non-owned card', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const otherCard = page.locator('[data-testid="session-card"]').filter({ hasText: 'Owner-Other' });
    await expect(otherCard).toBeVisible({ timeout: 15000 });

    // Should show the admin bypass badge
    await expect(otherCard).toContainText('admin bypass');
  });
});

// =============================================
// Owned session behavior (superadmin)
// =============================================
test.describe('Session Ownership - Owned Session (superadmin)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@admin.com', 'admin123');
  });

  test('should show owned session normally in dashboard list', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const items = page.locator('[data-testid="session-item"]');
    const count = await items.count();
    let found = false;

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const text = await item.textContent();
      if (text?.includes(TEST_PREFIX) && !text?.includes('Other')) {
        found = true;
        const restricted = await item.evaluate(
          (el) => el.className.includes('opacity-50') || el.className.includes('cursor-not-allowed')
        );
        expect(restricted).toBeFalsy();
        break;
      }
    }
    expect(found).toBeTruthy();
  });

  test('should allow full interaction with owned session', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="session-card"]');
    const count = await cards.count();
    let found = false;

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const text = await card.textContent();
      if (text?.includes(TEST_PREFIX) && !text?.includes('Other')) {
        found = true;
        await expect(card).not.toHaveClass(/cursor-not-allowed/);
        await expect(card).not.toHaveClass(/opacity-50/);

        const manageBtn = card.locator('button:has-text("Manage")');
        if (await manageBtn.isVisible()) {
          await expect(manageBtn).not.toBeDisabled();
        }
        break;
      }
    }
    expect(found).toBeTruthy();
  });
});

// =============================================
// Dropdown positioning tests
// =============================================
test.describe('Session Selector Dropdown Positioning', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@admin.com', 'admin123');
  });

  test('should position dropdown aligned to trigger right edge', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for session selector to be ready
    const selector = page.locator('[data-testid="session-selector"]');
    await expect(selector).toBeVisible();

    // Get the trigger element (the button that opens the dropdown)
    const trigger = selector.locator('[data-slot="select-trigger"]');
    await expect(trigger).toBeVisible();

    // Open the dropdown by clicking the trigger
    await trigger.click();
    await page.waitForTimeout(300); // wait for animation

    // Get the dropdown content
    const dropdown = page.locator('[data-slot="select-content"]');
    await expect(dropdown).toBeVisible();

    // Get bounding boxes
    const triggerBox = await trigger.boundingBox();
    const dropdownBox = await dropdown.boundingBox();
    expect(triggerBox).toBeTruthy();
    expect(dropdownBox).toBeTruthy();

    // The dropdown should be below the trigger (popper positioning)
    expect(dropdownBox!.y).toBeGreaterThanOrEqual(triggerBox!.y);
    expect(dropdownBox!.x + dropdownBox!.width).toBeLessThanOrEqual(triggerBox!.x + triggerBox!.width + 50);
    // Should not overflow off-screen
    expect(dropdownBox!.x).toBeGreaterThanOrEqual(0);
    expect(dropdownBox!.x + dropdownBox!.width).toBeLessThanOrEqual(1920); // viewport width
  });

  test('should not overflow viewport in any direction', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const trigger = page.locator('[data-testid="session-selector"] [data-slot="select-trigger"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await page.waitForTimeout(300);

    const dropdown = page.locator('[data-slot="select-content"]');
    await expect(dropdown).toBeVisible();

    const box = await dropdown.boundingBox();
    expect(box).toBeTruthy();

    // Check no overflow
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1280);
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
  });

  test('should position dropdown correctly on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 600 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const trigger = page.locator('[data-testid="session-selector"] [data-slot="select-trigger"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await page.waitForTimeout(300);

    const dropdown = page.locator('[data-slot="select-content"]');
    await expect(dropdown).toBeVisible();

    const box = await dropdown.boundingBox();
    expect(box).toBeTruthy();

    // Should still be within viewport
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(768);
    // Should be below the trigger, not floating somewhere random
    expect(box!.y).toBeGreaterThanOrEqual(0);
  });
});
