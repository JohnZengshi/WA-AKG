import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('renders login form with all required elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByText('Sign in to your WA-AKG account')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Create an account')).toBeVisible();
  });

  test('shows validation error for empty email', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('shows validation error for empty password', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('navigates to register page', async ({ page }) => {
    await page.getByText('Create an account').click();
    await expect(page).toHaveURL('/auth/register');
  });

  test('displays error message for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('shows loading state during authentication', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Authenticating...')).toBeVisible();
  });
});
