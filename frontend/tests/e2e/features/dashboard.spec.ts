import { test, expect } from '@playwright/test';

// Uses pre-authenticated admin state from auth.setup.ts

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should redirect to dashboard after login', async ({ page }) => {
        // Pre-auth state means we land on / not /login
        expect(page.url()).not.toContain('/login');
    });

    test('should render metric cards', async ({ page }) => {
        // At least one metric card with a number should be visible
        const cards = page.locator('[class*="card"], [class*="stat"], [class*="metric"]');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });
    });

    test('should render navigation sidebar or navbar', async ({ page }) => {
        // Sidebar with main nav links
        const nav = page.locator('nav, aside, [role="navigation"]').first();
        await expect(nav).toBeVisible();
    });

    test('should display user info or logout option', async ({ page }) => {
        // Check for any indicator that the user is authenticated
        const adminText = page.locator('text=Admin').first();
        const logoutText = page.locator('text=Logout').first();
        const signOutText = page.locator('text=Sign out').first();

        const hasAdmin = await adminText.isVisible({ timeout: 5000 }).catch(() => false);
        const hasLogout = await logoutText.isVisible({ timeout: 1000 }).catch(() => false);
        const hasSignOut = await signOutText.isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasAdmin || hasLogout || hasSignOut).toBe(true);
    });
});
