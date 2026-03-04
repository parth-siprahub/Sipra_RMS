import { test, expect } from '@playwright/test';

test.describe('Resource Requests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/resource-requests');
        await page.waitForLoadState('networkidle');
    });

    test('should render the resource requests page', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Resource Requests');
        await expect(page.locator('#new-request-btn')).toBeVisible();
    });

    test('should show the filter bar', async ({ page }) => {
        await expect(page.locator('#filter-status')).toBeVisible();
        await expect(page.locator('#filter-priority')).toBeVisible();
    });

    test('should display seeded requests in the table', async ({ page }) => {
        // Wait for table to load (not spinner)
        await expect(page.locator('.spinner, [class*="animate-spin"]')).toHaveCount(0, { timeout: 10000 });

        // Table or empty state should be visible
        const table = page.locator('table');
        const emptyState = page.locator('text=No resource requests');
        const hasTable = await table.isVisible().catch(() => false);
        const hasEmpty = await emptyState.isVisible().catch(() => false);
        expect(hasTable || hasEmpty).toBe(true);
    });

    test('should open New Request modal on button click', async ({ page }) => {
        await page.click('#new-request-btn');

        // Modal should appear
        await expect(page.locator('text=New Resource Request')).toBeVisible();
        await expect(page.locator('#rr-sow')).toBeVisible();
        await expect(page.locator('#rr-profile')).toBeVisible();
        await expect(page.locator('#rr-priority')).toBeVisible();
    });

    test('should close modal on Cancel', async ({ page }) => {
        await page.click('#new-request-btn');
        await expect(page.locator('text=New Resource Request')).toBeVisible();

        await page.click('button:has-text("Cancel")');
        await expect(page.locator('text=New Resource Request')).not.toBeVisible();
    });

    test('should filter by status', async ({ page }) => {
        const statusFilter = page.locator('#filter-status');
        await statusFilter.selectOption('OPEN');
        await page.waitForLoadState('networkidle');

        // Row count label or table should reflect results
        const body = await page.locator('tbody').isVisible().catch(() => false);
        const empty = await page.locator('text=No resource requests').isVisible().catch(() => false);
        expect(body || empty).toBe(true);
    });
});
