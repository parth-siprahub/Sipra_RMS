const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
    console.log('Starting E2E Verification...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        console.log('Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

        if (page.url().includes('/login')) {
            console.log('Landing on login page, performing login...');
            await page.fill('input[type="email"]', 'admin@siprahub.com');
            await page.fill('input[type="password"]', 'Admin123!');
            await page.click('button[type="submit"]');
            await page.waitForURL('**/', { timeout: 15000 });
            console.log('Login successful.');
        }

        // 1. Verify SOWs page
        console.log('Checking SOWs page...');
        await page.click('a[href="/sows"]');
        await page.waitForSelector('h1:has-text("Statements of Work")', { timeout: 10000 });

        // Wait for data load and rendering
        await page.waitForSelector('.spinner', { state: 'hidden', timeout: 10000 });
        console.log('SOWs page loaded.');

        const utilizationBar = await page.$('.bg-surface-hover');
        console.log('Utilization bar container present:', !!utilizationBar);

        const activeFilter = await page.$('button:has-text("ACTIVE")');
        console.log('ACTIVE filter button present:', !!activeFilter);

        // 2. Verify Candidates page
        console.log('Checking Candidates page...');
        await page.click('a[href="/candidates"]');
        await page.waitForSelector('h1:has-text("Candidates Pipeline")', { timeout: 10000 });

        const kanbanBtn = await page.waitForSelector('#view-kanban-btn', { timeout: 5000 });
        const isKanbanActive = await kanbanBtn.evaluate(el => el.classList.contains('bg-primary'));
        console.log('Kanban view is default:', isKanbanActive);

        await page.waitForSelector('.spinner', { state: 'hidden', timeout: 10000 });

        // 3. Verify Candidate Details Modal
        console.log('Opening Candidate Details...');
        const candidateCard = await page.waitForSelector('.card.cursor-grab', { timeout: 15000 });
        if (candidateCard) {
            await candidateCard.click();
            await page.waitForSelector('button:has-text("Interview Audit")', { timeout: 10000 });

            const interviewTab = await page.$('button:has-text("Interview Audit")');
            const transitionTab = await page.$('button:has-text("Transition")');
            console.log('Details Modal - Interview Audit tab present:', !!interviewTab);
            console.log('Details Modal - Transition tab present:', !!transitionTab);

            await page.click('button[aria-label="Close modal"]'); // Using aria-label for close button
            await page.waitForTimeout(1000);
        } else {
            console.log('No candidate cards found.');
        }

        // 4. Verify Resource Requests
        console.log('Checking Resource Requests page...');
        await page.click('a[href="/resource-requests"]');
        await page.waitForSelector('h1:has-text("Resource Requests")', { timeout: 10000 });
        await page.waitForSelector('.spinner', { state: 'hidden', timeout: 10000 });

        await page.click('#new-request-btn');

        await page.waitForSelector('select#rr-sow', { timeout: 10000 });
        const sowDropdown = await page.$('select#rr-sow');
        const profileDropdown = await page.$('select#rr-profile');
        console.log('Resource Request Modal - SOW dropdown present:', !!sowDropdown);
        console.log('Resource Request Modal - Profile dropdown present:', !!profileDropdown);

        console.log('Verification Complete successfully.');
        await page.screenshot({ path: path.join(process.cwd(), 'e2e-mvp-summary.png'), fullPage: true });

    } catch (err) {
        console.error('Error during verification:', err.name, err.message);
        try {
            await page.screenshot({ path: path.join(process.cwd(), 'e2e-mvp-error.png'), fullPage: true });
        } catch (e) { }
    } finally {
        await browser.close();
    }
}

run();
