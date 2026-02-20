const XLSX = require('xlsx');

function generateFeatureList() {
    // Create Phase 1 features
    const phase1Features = [
        // Module: Authentication & RBAC
        ['Authentication & RBAC', 'User login with Supabase Auth', 'High', 'Phase 1', 8, '', 'Pending'],
        ['Authentication & RBAC', 'Role-based access control (Back Office, Admin)', 'High', 'Phase 1', 12, 'User login', 'Pending'],
        ['Authentication & RBAC', 'Permission-based feature access', 'High', 'Phase 1', 8, 'RBAC', 'Pending'],
        ['Authentication & RBAC', 'User management (CRUD)', 'Medium', 'Phase 1', 6, 'RBAC', 'Pending'],

        // Module: Dashboard
        ['Dashboard', 'Total requests metric', 'High', 'Phase 1', 4, 'Auth', 'Pending'],
        ['Dashboard', 'Onboarded resources count', 'High', 'Phase 1', 3, 'Dashboard metrics', 'Pending'],
        ['Dashboard', 'Awaiting onboarding count', 'High', 'Phase 1', 3, 'Dashboard metrics', 'Pending'],
        ['Dashboard', 'To be shared count (With Admin)', 'High', 'Phase 1', 3, 'Dashboard metrics', 'Pending'],
        ['Dashboard', 'Role-wise breakdown chart', 'Medium', 'Phase 1', 8, 'Dashboard metrics', 'Pending'],
        ['Dashboard', 'Technology distribution chart', 'Medium', 'Phase 1', 6, 'Dashboard metrics', 'Pending'],
        ['Dashboard', 'Status filter dropdown', 'Medium', 'Phase 1', 4, 'Dashboard', 'Pending'],
        ['Dashboard', 'Attrition rate trend graph', 'Low', 'Phase 1', 8, 'Exit management', 'Pending'],
        ['Dashboard', 'Avg time to onboard metric', 'Low', 'Phase 1', 6, 'Onboarding', 'Pending'],

        // Module: Job Profile Management
        ['Job Profile Management', 'Create job profile (role, JD, skills, rate)', 'High', 'Phase 1', 8, 'Auth', 'Pending'],
        ['Job Profile Management', 'Edit job profile', 'High', 'Phase 1', 4, 'Create job profile', 'Pending'],
        ['Job Profile Management', 'Delete job profile (with validation)', 'Medium', 'Phase 1', 4, 'Create job profile', 'Pending'],
        ['Job Profile Management', 'List all job profiles', 'High', 'Phase 1', 4, 'Create job profile', 'Pending'],
        ['Job Profile Management', 'Duplicate role validation', 'Medium', 'Phase 1', 3, 'Create job profile', 'Pending'],

        // Module: Resource Request Management
        ['Resource Request', 'Create resource request (auto-generate Request ID)', 'High', 'Phase 1', 12, 'Job profiles', 'Pending'],
        ['Resource Request', 'Select job profile (dropdown)', 'High', 'Phase 1', 4, 'Create request', 'Pending'],
        ['Resource Request', 'Capture request source (email/chat with ref)', 'Medium', 'Phase 1', 4, 'Create request', 'Pending'],
        ['Resource Request', 'Set priority (Urgent/High/Medium/Low)', 'Medium', 'Phase 1', 3, 'Create request', 'Pending'],
        ['Resource Request', 'Generate multiple Request IDs for multi-position', 'Medium', 'Phase 1', 6, 'Create request', 'Pending'],
        ['Resource Request', 'View all requests (list/grid)', 'High', 'Phase 1', 8, 'Create request', 'Pending'],
        ['Resource Request', 'Filter by status/role/date', 'Medium', 'Phase 1', 8, 'View requests', 'Pending'],
        ['Resource Request', 'Search by Request ID or candidate name', 'Medium', 'Phase 1', 6, 'View requests', 'Pending'],

        // Module: Recruiter Pipeline (21 fields)
        ['Recruiter Pipeline', 'Add candidate to request (21-field form)', 'High', 'Phase 1', 16, 'Resource requests', 'Pending'],
        ['Recruiter Pipeline', 'Owner dropdown (recruiter assignment)', 'High', 'Phase 1', 4, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Vendor field (WRS, GFM, etc.)', 'Medium', 'Phase 1', 3, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Interview date/time picker', 'Medium', 'Phase 1', 4, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Candidate status dropdown (L1/L2 Reject, etc.)', 'High', 'Phase 1', 6, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'CTC fields (current, expected)', 'Medium', 'Phase 1', 3, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Location fields (current, work)', 'Low', 'Phase 1', 2, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Notice period field', 'Low', 'Phase 1', 2, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Remarks multi-line text', 'Low', 'Phase 1', 2, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Upload candidate resume (PDF/DOCX)', 'High', 'Phase 1', 8, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Edit candidate details (all fields editable)', 'High', 'Phase 1', 6, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'View candidate list for a request', 'High', 'Phase 1', 8, 'Add candidate', 'Pending'],
        ['Recruiter Pipeline', 'Update request status to "With Admin"', 'High', 'Phase 1', 4, 'Candidate tracking', 'Pending'],

        // Module: Admin Review
        ['Admin Review', 'View requests "With Admin" status', 'High', 'Phase 1', 6, 'RBAC', 'Pending'],
        ['Admin Review', 'Validation checklist (email, format, JD match)', 'Medium', 'Phase 1', 8, 'View admin requests', 'Pending'],
        ['Admin Review', 'Download candidate profile', 'High', 'Phase 1', 4, 'File uploads', 'Pending'],
        ['Admin Review', 'Reject back to "With Back Office" with reason', 'Medium', 'Phase 1', 6, 'View admin requests', 'Pending'],
        ['Admin Review', 'Manual client submission (copy email template)', 'High', 'Phase 1', 8, 'View admin requests', 'Pending'],
        ['Admin Review', 'Update status to "With Client"', 'High', 'Phase 1', 4, 'Client submission', 'Pending'],
        ['Admin Review', 'Log communication details (email sent to client)', 'Medium', 'Phase 1', 6, 'Client submission', 'Pending'],

        // Module: Onboarding Management
        ['Onboarding', 'Mark as onboarded (capture billing start date)', 'High', 'Phase 1', 8, 'Admin review', 'Pending'],
        ['Onboarding', 'Capture client email ID', 'High', 'Phase 1', 3, 'Mark onboarded', 'Pending'],
        ['Onboarding', 'Capture client Jira username (billing mapping)', 'High', 'Phase 1', 3, 'Mark onboarded', 'Pending'],
        ['Onboarding', 'Update status to "Onboarded"', 'High', 'Phase 1', 4, 'Mark onboarded', 'Pending'],
        ['Onboarding', 'Client rejection flow (capture reason)', 'Medium', 'Phase 1', 6, 'Admin review', 'Pending'],
        ['Onboarding', 'Replacement required? (Yes/No)', 'Medium', 'Phase 1', 4, 'Client rejection', 'Pending'],
        ['Onboarding', 'Auto-create backfill request if replacement needed', 'Medium', 'Phase 1', 8, 'Replacement decision', 'Pending'],

        // Module: Exit Management
        ['Exit Management', 'Process exit (capture exit reason)', 'High', 'Phase 1', 8, 'Onboarding', 'Pending'],
        ['Exit Management', 'Exit reason dropdown (6 options)', 'High', 'Phase 1', 4, 'Process exit', 'Pending'],
        ['Exit Management', 'Last working day date picker', 'High', 'Phase 1', 3, 'Process exit', 'Pending'],
        ['Exit Management', 'Exit notes (multi-line text)', 'Low', 'Phase 1', 2, 'Process exit', 'Pending'],
        ['Exit Management', 'Replacement required? (Yes/No)', 'Medium', 'Phase 1', 4, 'Process exit', 'Pending'],
        ['Exit Management', 'Auto-create backfill request on exit', 'Medium', 'Phase 1', 6, 'Replacement decision', 'Pending'],
        ['Exit Management', 'Update status to "Exit"', 'High', 'Phase 1', 3, 'Process exit', 'Pending'],

        // Module: SOW Tracker
        ['SOW Tracker', 'Manual SOW entry (SOW ID, role, date)', 'Medium', 'Phase 1', 6, 'Resource requests', 'Pending'],
        ['SOW Tracker', 'Link SOW to Request IDs', 'Medium', 'Phase 1', 6, 'Manual SOW entry', 'Pending'],
        ['SOW Tracker', 'View SOW list (grouped by role)', 'Medium', 'Phase 1', 6, 'Manual SOW entry', 'Pending'],
        ['SOW Tracker', 'Display Request ID count per SOW', 'Low', 'Phase 1', 4, 'SOW list', 'Pending'],

        // Module: Infrastructure
        ['Infrastructure', 'Supabase project setup', 'High', 'Phase 1', 4, '', 'Pending'],
        ['Infrastructure', 'Database schema design (11 tables)', 'High', 'Phase 1', 16, 'Supabase setup', 'Pending'],
        ['Infrastructure', 'FastAPI backend scaffolding', 'High', 'Phase 1', 8, 'DB schema', 'Pending'],
        ['Infrastructure', 'React + Vite frontend setup', 'High', 'Phase 1', 6, 'Backend scaffolding', 'Pending'],
        ['Infrastructure', 'API endpoint structure (RESTful)', 'High', 'Phase 1', 8, 'Backend scaffolding', 'Pending'],
        ['Infrastructure', 'CORS configuration', 'Medium', 'Phase 1', 2, 'API endpoints', 'Pending'],
        ['Infrastructure', 'Environment variable setup', 'Medium', 'Phase 1', 3, 'Backend scaffolding', 'Pending']
    ];

    // Create Phase 2 features
    const phase2Features = [
        ['Client Portal', 'Read-only client view (filtered data)', 'High', 'Phase 2', 16, 'Phase 1 complete', 'Pending'],
        ['Client Portal', 'Hide exit records from client', 'High', 'Phase 2', 4, 'Client view', 'Pending'],
        ['Client Portal', 'Show only active/pending resources', 'High', 'Phase 2', 6, 'Client view', 'Pending'],

        ['Multi-Tenancy', 'Client table with tenant ID', 'High', 'Phase 2', 12, 'Phase 1 complete', 'Pending'],
        ['Multi-Tenancy', 'Tenant-aware database queries', 'High', 'Phase 2', 16, 'Client table', 'Pending'],
        ['Multi-Tenancy', 'Row-level security policies per tenant', 'High', 'Phase 2', 12, 'Tenant queries', 'Pending'],

        ['Billing Automation', 'JIRA integration (import timesheets)', 'High', 'Phase 2', 24, 'Phase 1 complete', 'Pending'],
        ['Billing Automation', 'Map Jira username to candidate', 'High', 'Phase 2', 8, 'JIRA integration', 'Pending'],
        ['Billing Automation', 'Calculate billing days worked', 'High', 'Phase 2', 12, 'Jira mapping', 'Pending'],
        ['Billing Automation', 'Generate monthly invoice reports', 'Medium', 'Phase 2', 16, 'Billing calc', 'Pending'],

        ['SOW Automation', 'SOW PDF template design', 'Medium', 'Phase 2', 8, 'Phase 1 complete', 'Pending'],
        ['SOW Automation', 'Auto-generate SOW from job profile', 'Medium', 'Phase 2', 12, 'PDF template', 'Pending'],
        ['SOW Automation', 'Download SOW as PDF button', 'Medium', 'Phase 2', 6, 'Auto-generate', 'Pending'],

        ['Email Automation', 'SMTP configuration', 'Medium', 'Phase 2', 4, 'Phase 1 complete', 'Pending'],
        ['Email Automation', 'Auto-send profile to client (button click)', 'High', 'Phase 2', 12, 'SMTP config', 'Pending'],
        ['Email Automation', 'Email template system', 'Medium', 'Phase 2', 8, 'Auto-send', 'Pending'],

        ['AI Features', 'Resume parsing (LLM integration)', 'Low', 'Phase 2', 24, 'Phase 1 complete', 'Pending'],
        ['AI Features', 'Profile standardization (convert to template)', 'Low', 'Phase 2', 16, 'Resume parsing', 'Pending'],
        ['AI Features', 'Candidate matching (JD vs resume scoring)', 'Low', 'Phase 2', 32, 'Resume parsing', 'Pending'],
        ['AI Features', 'AI chatbot screening (interview simulation)', 'Low', 'Phase 2', 40, 'Candidate matching', 'Pending'],

        ['Portal Integration', 'Naukri API integration', 'Low', 'Phase 2', 24, 'Phase 1 complete', 'Pending'],
        ['Portal Integration', 'LinkedIn job posting', 'Low', 'Phase 2', 16, 'Phase 1 complete', 'Pending']
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Phase 1 sheet
    const phase1Sheet = XLSX.utils.aoa_to_sheet([
        ['Module', 'Feature', 'Priority', 'Phase', 'Estimated Hours', 'Dependencies', 'Status'],
        ...phase1Features
    ]);

    // Add total hours calculation
    const totalHours = phase1Features.reduce((sum, row) => sum + row[4], 0);
    XLSX.utils.sheet_add_aoa(phase1Sheet, [
        ['', '', '', '', `TOTAL: ${totalHours} hours (~${Math.ceil(totalHours / 8)} days)`, '', '']
    ], { origin: -1 });

    // Phase 2 sheet
    const phase2Sheet = XLSX.utils.aoa_to_sheet([
        ['Module', 'Feature', 'Priority', 'Phase', 'Estimated Hours', 'Dependencies', 'Status'],
        ...phase2Features
    ]);

    const phase2TotalHours = phase2Features.reduce((sum, row) => sum + row[4], 0);
    XLSX.utils.sheet_add_aoa(phase2Sheet, [
        ['', '', '', '', `TOTAL: ${phase2TotalHours} hours (~${Math.ceil(phase2TotalHours / 8)} days)`, '', '']
    ], { origin: -1 });

    // Summary sheet
    const summarySheet = XLSX.utils.aoa_to_sheet([
        ['RMS Feature Summary'],
        [''],
        ['Phase', 'Feature Count', 'Total Hours', 'Total Days (8hr/day)', 'Status'],
        ['Phase 1 - Core RMS', phase1Features.length, totalHours, Math.ceil(totalHours / 8), 'In Progress'],
        ['Phase 2 - Advanced Features', phase2Features.length, phase2TotalHours, Math.ceil(phase2TotalHours / 8), 'Planned'],
        [''],
        ['Key Modules (Phase 1):'],
        ['- Authentication & RBAC'],
        ['- Dashboard (13 features)'],
        ['- Job Profile Management (5 features)'],
        ['- Resource Request (8 features)'],
        ['- Recruiter Pipeline (12 features - 21 candidate fields)'],
        ['- Admin Review (7 features)'],
        ['- Onboarding Management (7 features)'],
        ['- Exit Management (7 features)'],
        ['- SOW Tracker (4 features)'],
        ['- Infrastructure (7 features)'],
        [''],
        ['Phase 1 Timeline:', 'Feb 16 - March 2, 2026 (2 weeks)'],
        ['Tech Stack:', 'Python FastAPI + PostgreSQL (Supabase) + React + TypeScript']
    ]);

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, phase1Sheet, 'Phase 1 Features');
    XLSX.utils.book_append_sheet(wb, phase2Sheet, 'Phase 2 Features');

    // Write file
    XLSX.writeFile(wb, 'RMS_Feature_List.xlsx');
    console.log('Feature List generated: RMS_Feature_List.xlsx');
    console.log(`Phase 1: ${phase1Features.length} features, ${totalHours} hours`);
    console.log(`Phase 2: ${phase2Features.length} features, ${phase2TotalHours} hours`);
}

generateFeatureList();
