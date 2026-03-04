import { test as setup } from '@playwright/test';

const authFile = 'tests/e2e/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('#email', 'admin@siprarms.com');
    await page.fill('#password', 'Admin123!');
    await page.click('button[type="submit"]');

    // Wait for redirect away from /login
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Save the authenticated browser state (localStorage with JWT)
    await page.context().storageState({ path: authFile });
    console.log('✅ Auth state saved');
});
