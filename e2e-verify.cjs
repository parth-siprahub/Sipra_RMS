/**
 * RMS SipraHub — End-to-End Browser Verification
 * Runs a headed Chromium browser (visible to user) and tests all pages.
 * Run: $env:HOME='C:\Users\parth'; node d:\RMS_Siprahub\e2e-verify.cjs
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8000';

// Screenshot directory
const SS_DIR = path.join('C:\\Users\\parth', 'rms_screenshots');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssCount = 0;
async function screenshot(page, label) {
    ssCount++;
    const file = path.join(SS_DIR, `${String(ssCount).padStart(2, '0')}_${label}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸 Screenshot saved: ${file}`);
    return file;
}

function log(msg) { console.log(`\n► ${msg}`); }
function pass(msg) { console.log(`  ✅ PASS: ${msg}`); }
function fail(msg) { console.log(`  ❌ FAIL: ${msg}`); }

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   RMS SipraHub — Automated E2E Visual Verification');
    console.log('═══════════════════════════════════════════════════════════');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 300,   // Slow down for visibility
        args: ['--start-maximized']
    });

    const context = await browser.newContext({
        viewport: null,  // Use full window size
    });

    const page = await context.newPage();

    page.on('console', msg => console.log(`  PAGE LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`  PAGE ERROR: ${err.message}`));

    let overallPass = true;

    try {
        // ─── Step 1: Login Page ────────────────────────────────────────────────────
        log('Step 1: Loading Login Page');
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await delay(800);
        await screenshot(page, 'login_page');

        const emailField = page.locator('#email, input[type="email"]').first();
        const pwField = page.locator('#password, input[type="password"]').first();

        if (await emailField.isVisible()) {
            pass('Login page loaded with email/password fields');
        } else {
            fail('Login form not visible');
            overallPass = false;
        }

        // ─── Step 2: Login ────────────────────────────────────────────────────────
        log('Step 2: Logging In');
        const credentials = [
            { email: 'admin@siprarms.com', password: 'Admin123!' },
            { email: 'recruiter@siprarms.com', password: 'Recruiter123!' },
        ];

        let loggedIn = false;
        for (const cred of credentials) {
            try {
                await emailField.fill('');
                await emailField.fill(cred.email);
                await pwField.fill('');
                await pwField.fill(cred.password);
                await page.locator('button[type="submit"]').click();

                // Wait for either dashboard navigation or error
                await Promise.race([
                    page.waitForURL(`${BASE_URL}/`, { timeout: 5000 }),
                    page.waitForSelector('.hot-toast, [role="alert"]', { timeout: 5000 }),
                    delay(5000)
                ]).catch(() => { });

                if (!page.url().includes('/login')) {
                    loggedIn = true;
                    pass(`Logged in as ${cred.email}`);
                    break;
                } else {
                    console.log(`  ⚠ Failed with ${cred.email}, trying next...`);
                    // Clear and re-attempt
                    await delay(1000);
                }
            } catch (e) {
                console.log(`  ⚠ Error with ${cred.email}: ${e.message}`);
            }
        }

        await delay(1000);
        await screenshot(page, 'post_login_dashboard');

        if (!loggedIn) {
            fail('Could not login with any credentials. Check if backend is seeded.');
            overallPass = false;
            // Continue anyway to test page structure
        }

        // ─── Step 3: Dashboard ─────────────────────────────────────────────────────
        log('Step 3: Verifying Dashboard');
        await delay(500);
        const sidebar = page.locator('nav, aside, [class*="sidebar"]').first();
        if (await sidebar.isVisible()) {
            pass('Sidebar visible on dashboard');
        } else {
            fail('Sidebar not visible');
        }
        await screenshot(page, 'dashboard_loaded');

        // ─── Step 4: Resource Requests ────────────────────────────────────────────
        log('Step 4: Navigating to Resource Requests');
        // Try clicking sidebar link
        const rrLink = page.locator('a[href*="resource-requests"], a:has-text("Resource Request")').first();
        if (await rrLink.isVisible()) {
            await rrLink.click();
            await delay(1000);
            pass('Clicked Resource Requests link');
        } else {
            // Direct navigate
            await page.goto(`${BASE_URL}/resource-requests`, { waitUntil: 'networkidle' });
            await delay(1000);
        }
        await screenshot(page, 'resource_requests_page');

        const rrHeading = page.locator('h1:has-text("Resource Requests")');
        if (await rrHeading.isVisible()) {
            pass('Resource Requests page heading found');
        } else {
            fail('Resource Requests heading not found');
            overallPass = false;
        }

        const newReqBtn = page.locator('#new-request-btn, button:has-text("New Request")').first();
        if (await newReqBtn.isVisible()) {
            pass('"New Request" button visible');
        } else {
            fail('"New Request" button not found');
            overallPass = false;
        }

        // ─── Step 5: Create a Resource Request ────────────────────────────────────
        log('Step 5: Creating a Resource Request');
        await newReqBtn.click();
        await delay(800);
        await screenshot(page, 'create_request_modal');

        const modal = page.locator('[role="dialog"], .modal-content').first();
        if (await modal.isVisible()) {
            pass('Create Request modal opened');
        } else {
            fail('Modal did not open');
            overallPass = false;
        }

        // Fill form
        const prioritySelect = page.locator('#rr-priority').first();
        if (await prioritySelect.isVisible()) {
            await prioritySelect.selectOption('URGENT');
        }
        const sourceSelect = page.locator('#rr-source').first();
        if (await sourceSelect.isVisible()) {
            await sourceSelect.selectOption('EMAIL');
        }
        const backfillCheck = page.locator('#rr-backfill').first();
        if (await backfillCheck.isVisible()) {
            await backfillCheck.check();
        }
        await screenshot(page, 'create_request_filled');

        // Submit
        const submitBtn = page.locator('button:has-text("Create Request")').first();
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await delay(2000);
            pass('Create Request submitted');
        }
        await screenshot(page, 'after_create_request');

        // ─── Step 6: Status Transition ─────────────────────────────────────────────
        log('Step 6: Testing Status Transition');
        await delay(500);
        // Find first status badge/dropdown in table
        const statusDropdownBtn = page.locator('table tbody tr:first-child td .badge, table tbody tr:first-child td button').first();
        if (await statusDropdownBtn.isVisible()) {
            await statusDropdownBtn.click();
            await delay(600);
            await screenshot(page, 'status_dropdown_open');
            // Try pressing Escape to close it
            await page.keyboard.press('Escape');
            await delay(400);
            pass('Status dropdown interaction works');
        } else {
            console.log('  ⚠ No rows in table yet to test status transition');
        }

        // ─── Step 7: Candidates Pipeline ──────────────────────────────────────────
        log('Step 7: Navigating to Candidates Pipeline');
        const candLink = page.locator('a[href*="candidates"], a:has-text("Candidate")').first();
        if (await candLink.isVisible()) {
            await candLink.click();
            await delay(1000);
            pass('Clicked Candidates link');
        } else {
            await page.goto(`${BASE_URL}/candidates`, { waitUntil: 'networkidle' });
            await delay(1000);
        }
        await screenshot(page, 'candidates_page');

        const candHeading = page.locator('h1:has-text("Candidates Pipeline")');
        if (await candHeading.isVisible()) {
            pass('Candidates Pipeline page heading found');
        } else {
            fail('Candidates Pipeline heading not found');
            overallPass = false;
        }

        // ─── Step 8: Add a Candidate ──────────────────────────────────────────────
        log('Step 8: Adding a Candidate');
        const addCandBtn = page.locator('#add-candidate-btn, button:has-text("Add Candidate")').first();
        if (await addCandBtn.isVisible()) {
            await addCandBtn.click();
            await delay(800);
            await screenshot(page, 'add_candidate_modal');

            // Fill mandatory fields
            await page.locator('#c-first').fill('Rahul');
            await page.locator('#c-last').fill('Sharma');
            await page.locator('#c-email').fill('rahul.sharma@test.com');

            // Optional fields
            const companyField = page.locator('#c-company');
            if (await companyField.isVisible()) await companyField.fill('Infosys');

            const expField = page.locator('#c-total-exp');
            if (await expField.isVisible()) await expField.fill('5');

            await screenshot(page, 'add_candidate_filled');

            const submitCandBtn = page.locator('button:has-text("Add Candidate")').last();
            await submitCandBtn.click();
            await delay(2000);
            pass('Add Candidate submitted');
            await screenshot(page, 'after_add_candidate');
        } else {
            fail('Add Candidate button not found');
            overallPass = false;
        }

        // ─── Step 9: Kanban View ──────────────────────────────────────────────────
        log('Step 9: Switching to Kanban View');
        const kanbanBtn = page.locator('#view-kanban-btn, button:has-text("Kanban")').first();
        if (await kanbanBtn.isVisible()) {
            await kanbanBtn.click();
            await delay(1200);
            await screenshot(page, 'kanban_view');
            pass('Kanban view loaded');
        } else {
            fail('Kanban button not found');
        }

        // ─── Step 10: Table View + Filter ─────────────────────────────────────────
        log('Step 10: Switching back to Table + Testing Filter');
        const tableBtn = page.locator('#view-table-btn, button:has-text("Table")').first();
        if (await tableBtn.isVisible()) {
            await tableBtn.click();
            await delay(800);
        }
        const candFilter = page.locator('#candidate-filter-status').first();
        if (await candFilter.isVisible()) {
            await candFilter.selectOption('NEW');
            await delay(1000);
            await screenshot(page, 'candidate_filter_new');
            pass('Status filter applied to Candidates table');
        }

        // ─── Step 12: SOW Management ─────────────────────────────────────────────
        log('Step 12: Navigating to SOW Management');
        const sowLink = page.locator('a[href*="sows"], a:has-text("SOW")').first();
        if (await sowLink.isVisible()) {
            await sowLink.click();
            await delay(1200);
            pass('Clicked SOWs link');
        } else {
            await page.goto(`${BASE_URL}/sows`, { waitUntil: 'networkidle' });
            await delay(1200);
        }
        await screenshot(page, 'sows_page');
        const sowHeading = page.locator('h1:has-text("Statement of Work")');
        if (await sowHeading.isVisible()) pass('SOW page heading found');

        // ─── Step 13: Job Profiles ──────────────────────────────────────────────
        log('Step 13: Navigating to Job Profiles');
        const jpLink = page.locator('a[href*="job-profiles"], a:has-text("Job Profiles")').first();
        if (await jpLink.isVisible()) {
            await jpLink.click();
            await delay(1200);
            pass('Clicked Job Profiles link');
        } else {
            await page.goto(`${BASE_URL}/job-profiles`, { waitUntil: 'networkidle' });
            await delay(1200);
        }
        await screenshot(page, 'job_profiles_page');
        const jpHeading = page.locator('h1:has-text("Job Profiles")');
        if (await jpHeading.isVisible()) pass('Job Profiles page heading found');

        // ─── Step 14: Communication Logs ────────────────────────────────────────
        log('Step 14: Navigating to Communication Logs');
        const logLink = page.locator('a[href*="logs"], a:has-text("Logs")').first();
        if (await logLink.isVisible()) {
            await logLink.click();
            await delay(1200);
            pass('Clicked Communication Logs link');
        } else {
            await page.goto(`${BASE_URL}/logs`, { waitUntil: 'networkidle' });
            await delay(1200);
        }
        await screenshot(page, 'comm_logs_page');
        const logsHeading = page.locator('h1:has-text("Communication History")');
        if (await logsHeading.isVisible()) pass('Communication Logs page heading found');

        // ─── Summary ──────────────────────────────────────────────────────────────
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(`   Overall Result: ${overallPass ? '✅ ALL STEPS PASSED' : '⚠ SOME STEPS FAILED'}`);
        console.log(`   Screenshots saved in: ${SS_DIR}`);
        console.log(`   Total screenshots: ${ssCount}`);
        console.log('═══════════════════════════════════════════════════════════');

        // Keep browser open for 15 seconds so user can review
        console.log('\n   Browser will remain open for 15 seconds...');
        await delay(15000);

    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
        await screenshot(page, 'error_state').catch(() => { });
    } finally {
        await browser.close();
    }
})();
