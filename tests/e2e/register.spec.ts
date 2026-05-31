import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('renders registration form with all required elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByText('Join WA-AKG today')).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
    await expect(page.getByText('Sign in')).toBeVisible();
  });

  test('shows validation error for short name', async ({ page }) => {
    await page.getByLabel('Full Name').fill('A');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Name must be at least 2 characters')).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('123');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('shows validation error for mismatched passwords', async ({ page }) => {
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('different');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('navigates to login page', async ({ page }) => {
    await page.getByText('Sign in').click();
    await expect(page).toHaveURL('/auth/login');
  });

  test('shows loading state during registration', async ({ page }) => {
    await page.getByLabel('Full Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Creating Account...')).toBeVisible();
  });
});
