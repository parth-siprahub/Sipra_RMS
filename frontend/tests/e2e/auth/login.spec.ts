import { test, expect } from '@playwright/test';

/**
 * Login page E2E tests — these run WITHOUT the pre-authenticated state
 * so we exclude the chromium project's storageState for this file by
 * overriding to an empty context.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
    });

    test('should render all login form elements', async ({ page }) => {
        await expect(page.locator('h2')).toContainText('Welcome back');
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        await expect(page.locator('#remember-me')).toBeVisible();
        await expect(page.locator('a[href="#"]').first()).toContainText('Forgot password?');
    });

    test('should toggle password visibility', async ({ page }) => {
        const passwordInput = page.locator('#password');
        const toggleBtn = page.locator('button[aria-label="Show password"]');

        // Default: password hidden
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle → visible
        await toggleBtn.click();
        await expect(passwordInput).toHaveAttribute('type', 'text');
        await expect(page.locator('button[aria-label="Hide password"]')).toBeVisible();

        // Click again → hidden
        await page.locator('button[aria-label="Hide password"]').click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should show inline error on empty submit', async ({ page }) => {
        await page.click('button[type="submit"]');
        // Browser native validation OR inline error box
        const errorBox = page.locator('[class*="bg-red"]');
        // Either native required validation fires OR our inline error shows
        const emailInvalid = await page.locator('#email:invalid').count();
        if (emailInvalid === 0) {
            await expect(errorBox).toBeVisible();
        }
    });

    test('should show error on invalid credentials', async ({ page }) => {
        await page.fill('#email', 'wrong@siprarms.com');
        await page.fill('#password', 'WrongPass123!');
        await page.click('button[type="submit"]');

        const errorBox = page.locator('[class*="bg-red"]');
        await expect(errorBox).toBeVisible({ timeout: 10000 });
        await expect(errorBox).toContainText(/invalid|password|email/i);
    });

    test('should successfully login with valid credentials', async ({ page }) => {
        await page.fill('#email', 'admin@siprarms.com');
        await page.fill('#password', 'Admin123!');
        await page.click('button[type="submit"]');

        // Should redirect away from /login
        await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
        expect(page.url()).not.toContain('/login');
    });
});
