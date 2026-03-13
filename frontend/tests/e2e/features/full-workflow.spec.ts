import { test, expect } from '@playwright/test';

/**
 * Full Workflow E2E Test
 * Tests: SOW → Job Profile → Resource Request → Candidate → Pipeline Transitions
 * Runs against a live backend at localhost:8000
 */

const API_BASE = 'http://localhost:8000';
const UNIQUE_SUFFIX = Date.now().toString().slice(-6);

let authToken: string;
let jobProfileId: number;
let sowId: number;
let requestId: number;
let candidateId: number;

test.describe.serial('Full Hiring Workflow', () => {
    test.beforeAll(async ({ request }) => {
        // Login to get auth token
        const loginRes = await request.post(`${API_BASE}/auth/login`, {
            data: { email: 'admin@siprarms.com', password: 'Admin123!' },
        });
        expect(loginRes.ok()).toBeTruthy();
        const loginData = await loginRes.json();
        authToken = loginData.access_token;
        expect(authToken).toBeTruthy();
    });

    test('Step 1: Create Job Profile', async ({ request }) => {
        const res = await request.post(`${API_BASE}/job-profiles/`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: {
                role_name: `PW Engineer ${UNIQUE_SUFFIX}`,
                technology: 'Playwright',
                experience_level: 'MID',
            },
        });
        expect(res.status()).toBe(201);
        const data = await res.json();
        jobProfileId = data.id;
        expect(data.role_name).toContain('PW Engineer');
    });

    test('Step 2: Create SOW', async ({ request }) => {
        const res = await request.post(`${API_BASE}/sows/`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: {
                sow_number: `SOW-PW-${UNIQUE_SUFFIX}`,
                client_name: 'Playwright Test Client',
                max_resources: 3,
                job_profile_id: jobProfileId,
            },
        });
        expect(res.status()).toBe(201);
        const data = await res.json();
        sowId = data.id;
        expect(data.sow_number).toContain('SOW-PW');
    });

    test('Step 3: Create Resource Request', async ({ request }) => {
        const res = await request.post(`${API_BASE}/requests/`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: {
                sow_id: sowId,
                job_profile_id: jobProfileId,
                priority: 'HIGH',
            },
        });
        expect(res.status()).toBe(201);
        const data = await res.json();
        requestId = data.id;
        expect(data.status).toBe('OPEN');
        expect(data.request_display_id).toBeTruthy();
    });

    test('Step 4: Create Candidate', async ({ request }) => {
        const res = await request.post(`${API_BASE}/candidates/`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: {
                first_name: 'Playwright',
                last_name: `Test${UNIQUE_SUFFIX}`,
                email: `pw-${UNIQUE_SUFFIX}@test.com`,
                phone: '+91-8888800000',
                request_id: requestId,
                current_company: 'TestCorp',
                total_experience: 4,
                skills: 'TypeScript, Playwright',
            },
        });
        expect(res.status()).toBe(201);
        const data = await res.json();
        candidateId = data.id;
        expect(data.status).toBe('NEW');
    });

    const transitions = [
        { from: 'NEW', to: 'SCREENING' },
        { from: 'SCREENING', to: 'SUBMITTED_TO_ADMIN' },
        { from: 'SUBMITTED_TO_ADMIN', to: 'WITH_ADMIN' },
        { from: 'WITH_ADMIN', to: 'WITH_CLIENT' },
        { from: 'WITH_CLIENT', to: 'L1_SCHEDULED' },
        { from: 'L1_SCHEDULED', to: 'L1_COMPLETED' },
        { from: 'L1_COMPLETED', to: 'L1_SHORTLIST' },
        { from: 'L1_SHORTLIST', to: 'INTERVIEW_SCHEDULED' },
        { from: 'INTERVIEW_SCHEDULED', to: 'SELECTED' },
        { from: 'SELECTED', to: 'ONBOARDED' },
    ];

    for (const { from, to } of transitions) {
        test(`Step 5: Pipeline ${from} → ${to}`, async ({ request }) => {
            const res = await request.patch(`${API_BASE}/candidates/${candidateId}/review`, {
                headers: { Authorization: `Bearer ${authToken}` },
                data: { status: to, remarks: `PW test: ${from} → ${to}` },
            });
            expect(res.ok()).toBeTruthy();
            const data = await res.json();
            expect(data.status).toBe(to);
        });
    }

    test('Step 6: Resource Request OPEN → HOLD', async ({ request }) => {
        const res = await request.patch(`${API_BASE}/requests/${requestId}/status`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: { status: 'HOLD' },
        });
        expect(res.ok()).toBeTruthy();
        expect((await res.json()).status).toBe('HOLD');
    });

    test('Step 7: Resource Request HOLD → OPEN', async ({ request }) => {
        const res = await request.patch(`${API_BASE}/requests/${requestId}/status`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: { status: 'OPEN' },
        });
        expect(res.ok()).toBeTruthy();
        expect((await res.json()).status).toBe('OPEN');
    });

    test('Step 8: Resource Request OPEN → CLOSED', async ({ request }) => {
        const res = await request.patch(`${API_BASE}/requests/${requestId}/status`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: { status: 'CLOSED' },
        });
        expect(res.ok()).toBeTruthy();
        expect((await res.json()).status).toBe('CLOSED');
    });

    test('Step 9: Verify Dashboard reflects new data', async ({ page }) => {
        // Login via UI
        await page.goto('http://localhost:5173/login');
        await page.fill('#email', 'admin@siprarms.com');
        await page.fill('#password', 'Admin123!');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/');

        // Check dashboard metrics exist
        await expect(page.locator('text=TOTAL CANDIDATES')).toBeVisible();
        await expect(page.locator('text=SELECTED / ONBOARDED')).toBeVisible();
        await expect(page.locator('text=ACTIVE REQUESTS')).toBeVisible();
    });
});
