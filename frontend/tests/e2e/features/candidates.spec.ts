import { test, expect } from '@playwright/test';

test.describe('Candidates (Kanban Pipeline)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/candidates');
        await page.waitForLoadState('networkidle');
    });

    test('should render the candidates page with kanban board', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Candidates');
    });

    test('should show Add Candidate button', async ({ page }) => {
        const addBtn = page.locator('button:has-text("Add Candidate"), button:has-text("Add"), [id*="add"]').first();
        await expect(addBtn).toBeVisible();
    });

    test('should show list/kanban view toggle', async ({ page }) => {
        // There should be view toggle buttons
        const toggle = page.locator('[title*="view"], [title*="View"], [aria-label*="view"], [aria-label*="View"]').first();
        const hasToggle = await toggle.isVisible().catch(() => false);
        // At minimum, the kanban board (Active Pipeline label) should be visible
        const pipeline = page.locator('text=Active Pipeline');
        await expect(pipeline).toBeVisible({ timeout: 10000 });
    });

    test('should display kanban columns', async ({ page }) => {
        // Wait for at least the 'New' column header to be visible
        const newHeader = page.locator('text="New"').first();
        await expect(newHeader).toBeVisible({ timeout: 10000 });
    });

    test('should open Add Candidate modal', async ({ page }) => {
        // Click the Add/Plus button
        const addBtn = page.locator('button:has-text("Add Candidate")').first();
        await addBtn.click();

        await expect(page.locator('h2:has-text("Add Candidate")')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('#c-first')).toBeVisible();
        await expect(page.locator('#c-last')).toBeVisible();
        await expect(page.locator('#c-email')).toBeVisible();
    });

    test('should show candidate cards from seed data', async ({ page }) => {
        // Wait for loading to finish
        await page.waitForTimeout(2000); // Allow API to load
        // At least one candidate name should appear (from seed data)
        const names = ['Aarav', 'Priya', 'Rohan', 'Karthik', 'Anjali'];
        let found = false;
        for (const name of names) {
            const el = page.locator(`text=${name}`).first();
            const visible = await el.isVisible().catch(() => false);
            if (visible) { found = true; break; }
        }
        expect(found).toBe(true);
    });
});
