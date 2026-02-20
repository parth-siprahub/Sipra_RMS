const XLSX = require('xlsx');

function generateImprovedFeatureList() {
    // Enhanced Phase 1 features with better structure
    const phase1Features = [
        // Header row will be added separately with styling
        // Module | Feature ID | Feature | Description | Priority | Estimated Hours | Dependencies | Acceptance Criteria | Status

        // Authentication & RBAC
        ['Authentication & RBAC', 'AUTH-001', 'User Login', 'Implement login with email and password using secure authentication', 'Critical', 8, 'Supabase setup', 'User can log in with valid credentials; invalid login shows error', 'Pending'],
        ['Authentication & RBAC', 'AUTH-002', 'Role-Based Access Control', 'Define Back Office and Admin roles with permission mapping', 'Critical', 12, 'AUTH-001', 'Recruiter sees recruiter menu; Admin sees admin menu', 'Pending'],
        ['Authentication & RBAC', 'AUTH-003', 'Permission-Based Features', 'Restrict features based on user role (e.g., only Admin can process exits)', 'High', 8, 'AUTH-002', 'Recruiter cannot access "Send to Client" button', 'Pending'],
        ['Authentication & RBAC', 'AUTH-004', 'User Management', 'Admin can create, edit, deactivate users', 'Medium', 6, 'AUTH-002', 'Admin creates Back Office user; new user can log in', 'Pending'],

        // Dashboard
        ['Dashboard', 'DASH-001', 'Total Requests Metric', 'Show count of all resource requests', 'High', 4, 'REQUEST-001', 'Metric displays correct count; updates when new request created', 'Pending'],
        ['Dashboard', 'DASH-002', 'Onboarded Count', 'Show count of resources with Status = "Onboarded"', 'High', 3, 'DASH-001', 'Count matches manual query; updates when resource onboarded', 'Pending'],
        ['Dashboard', 'DASH-003', 'Awaiting Onboarding Count', 'Show count of resources with Status = "With Client"', 'High', 3, 'DASH-001', 'Count updates when status changes to "With Client"', 'Pending'],
        ['Dashboard', 'DASH-004', 'To Be Shared Count', 'Show count of resources with Status = "With Admin"', 'High', 3, 'DASH-001', 'Admin sees accurate count of profiles awaiting review', 'Pending'],
        ['Dashboard', 'DASH-005', 'Role-Wise Breakdown Chart', 'Bar/pie chart showing request count per job profile', 'Medium', 8, 'DASH-001', 'Chart displays top 5 roles; tooltip shows exact count', 'Pending'],
        ['Dashboard', 'DASH-006', 'Technology Distribution Chart', 'Chart showing primary skill distribution', 'Medium', 6, 'DASH-005', 'Chart groups by technology (Node.js, DBA, etc.)', 'Pending'],
        ['Dashboard', 'DASH-007', 'Status Filter', 'Dropdown to filter dashboard by status', 'Medium', 4, 'DASH-001', 'Selecting "Onboarded" shows only onboarded metrics', 'Pending'],
        ['Dashboard', 'DASH-008', 'Attrition Rate Trend', 'Line graph showing exits over time', 'Low', 8, 'EXIT-007', 'Graph shows monthly exit counts with trend line', 'Pending'],
        ['Dashboard', 'DASH-009', 'Avg Time to Onboard', 'Metric showing average days from request to onboarding', 'Low', 6, 'ONBOARD-004', 'Metric calculated correctly; excludes rejected requests', 'Pending'],
        ['Dashboard', 'DASH-010', 'Date Range Filter', 'Filter dashboard metrics by custom date range', 'Low', 6, 'DASH-007', 'Selecting last 30 days shows accurate filtered data', 'Pending'],

        // Job Profile Management
        ['Job Profile', 'JOBPROF-001', 'Create Job Profile', 'Form to create profile with role, JD, skills, experience, rate', 'High', 8, 'AUTH-001', 'Profile created successfully; appears in dropdown for requests', 'Pending'],
        ['Job Profile', 'JOBPROF-002', 'Edit Job Profile', 'Update existing job profile details', 'High', 4, 'JOBPROF-001', 'Changes saved; all requests reflect updated role name', 'Pending'],
        ['Job Profile', 'JOBPROF-003', 'Delete Job Profile', 'Delete profile with validation (cannot delete if in use)', 'Medium', 4, 'JOBPROF-001', 'Error shown if profile has active requests; success if no usage', 'Pending'],
        ['Job Profile', 'JOBPROF-004', 'List Job Profiles', 'Paginated list with search and sort', 'High', 4, 'JOBPROF-001', 'User can search by role name; sort by billing rate', 'Pending'],
        ['Job Profile', 'JOBPROF-005', 'Duplicate Validation', 'Prevent creating job profiles with identical role names', 'Medium', 3, 'JOBPROF-001', 'Creating "Backend Developer" twice shows error', 'Pending'],

        // Resource Request
        ['Resource Request', 'REQUEST-001', 'Create Request (Auto ID)', 'Create request with auto-generated sequential ID (R001, R002)', 'Critical', 12, 'JOBPROF-001', 'Request ID generated correctly; no duplicates', 'Pending'],
        ['Resource Request', 'REQUEST-002', 'Select Job Profile', 'Dropdown to select job profile (enforced, no typing)', 'High', 4, 'REQUEST-001', 'User cannot type custom role; must select from dropdown', 'Pending'],
        ['Resource Request', 'REQUEST-003', 'Capture Request Source', 'Fields for Email/Chat with reference (email ID / chat link)', 'Medium', 4, 'REQUEST-001', 'Source saved; admin can view origin for audit', 'Pending'],
        ['Resource Request', 'REQUEST-004', 'Set Priority', 'Dropdown for Urgent/High/Medium/Low', 'Medium', 3, 'REQUEST-001', 'Priority set; displayed in request list with color coding', 'Pending'],
        ['Resource Request', 'REQUEST-005', 'Multi-Position Requests', 'Enter number of positions; creates multiple Request IDs', 'Medium', 6, 'REQUEST-001', 'Entering 5 positions creates R001-R005 linked to same SOW', 'Pending'],
        ['Resource Request', 'REQUEST-006', 'View Request List', 'Paginated list/grid view of all requests', 'High', 8, 'REQUEST-001', 'List displays all requests; pagination works correctly', 'Pending'],
        ['Resource Request', 'REQUEST-007', 'Filter Requests', 'Filter by status, role, priority, date range', 'Medium', 8, 'REQUEST-006', 'Filters combine correctly (e.g., Status=Onboarded + Role=DBA)', 'Pending'],
        ['Resource Request', 'REQUEST-008', 'Search Requests', 'Search by Request ID or candidate name', 'Medium', 6, 'REQUEST-006', 'Searching "R005" or "John Doe" returns correct results', 'Pending'],

        // Recruiter Pipeline (21 fields)
        ['Recruiter Pipeline', 'PIPELINE-001', 'Add Candidate (21-field form)', 'Form with all 21 fields for candidate tracking', 'Critical', 16, 'REQUEST-001', 'All 21 fields displayed; form validates required fields', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-002', 'Owner Dropdown', 'Dropdown to assign recruiter to candidate', 'High', 4, 'PIPELINE-001', 'Dropdown shows all Back Office users; assignment saved', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-003', 'Vendor Field', 'Dropdown/text for vendor (WRS, GFM, Internal, etc.)', 'Medium', 3, 'PIPELINE-001', 'Vendor saved; reportable for vendor performance tracking', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-004', 'Interview DateTime', 'Date and time picker for interview schedule', 'Medium', 4, 'PIPELINE-001', 'DateTime saved in UTC; displayed in user timezone', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-005', 'Candidate Status', 'Dropdown with 9 status options (L1/L2 Reject, Selected, etc.)', 'High', 6, 'PIPELINE-001', 'Status options: L1 Reject, L2 Reject, Screen Reject, L1 Scheduled, L2 Scheduled, Screen Select, Selected, Duplicate, Interview TBS', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-006', 'CTC Fields', 'Current CTC and Expected CTC (Fixed + Variable)', 'Medium', 3, 'PIPELINE-001', 'CTC fields accept numeric input; displays formatted currency', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-007', 'Location Fields', 'Current Location and Preferred Work Location', 'Low', 2, 'PIPELINE-001', 'Location fields save correctly; used for filtering', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-008', 'Notice Period', 'Text field for notice period (e.g., "30 days", "Immediate")', 'Low', 2, 'PIPELINE-001', 'Notice period saved; visible in candidate summary', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-009', 'Remarks (Multi-line)', 'Multi-line text area for additional notes', 'Low', 2, 'PIPELINE-001', 'Remarks saved; displayed in candidate detail view', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-010', 'Upload Resume', 'File upload supporting PDF and DOCX formats', 'Critical', 8, 'PIPELINE-001', 'Resume uploaded successfully; downloadable by admin', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-011', 'Edit Candidate Details', 'All 21 fields editable at any time', 'High', 6, 'PIPELINE-001', 'Recruiter edits CTC after creation; changes saved immediately', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-012', 'View Candidate List', 'Table showing all candidates for a specific request', 'High', 8, 'PIPELINE-001', 'Table shows candidate name, status, vendor, interview date', 'Pending'],
        ['Recruiter Pipeline', 'PIPELINE-013', 'Update Status to "With Admin"', 'Button/action to move request to admin review', 'High', 4, 'PIPELINE-005', 'Request appears in Admin review queue after status change', 'Pending'],

        // Admin Review
        ['Admin Review', 'ADMIN-001', 'View Requests "With Admin"', 'List of all requests awaiting admin review', 'High', 6, 'RBAC-002', 'Admin sees only requests with Status = "With Admin"', 'Pending'],
        ['Admin-002', 'ADMIN-002', 'Validation Checklist', 'Checklist for email verification, profile format, JD match', 'Medium', 8, 'ADMIN-001', 'Checklist items markable; validation state saved', 'Pending'],
        ['Admin Review', 'ADMIN-003', 'Download Candidate Profile', 'Button to download attached resume', 'High', 4, 'PIPELINE-010', 'Resume downloads in original format (PDF/DOCX)', 'Pending'],
        ['Admin Review', 'ADMIN-004', 'Reject to Back Office', 'Reject with reason; status reverts to "With Back Office"', 'Medium', 6, 'ADMIN-001', 'Rejection reason saved; recruiter sees rejection note', 'Pending'],
        ['Admin Review', 'ADMIN-005', 'Manual Client Submission', 'Generate email template for client (copy-paste)', 'High', 8, 'ADMIN-001', 'Email template populated with candidate details; copyable', 'Pending'],
        ['Admin Review', 'ADMIN-006', 'Update Status to "With Client"', 'Button to mark as sent to client', 'High', 4, 'ADMIN-005', 'Status updates; request appears in "Awaiting Onboarding" view', 'Pending'],
        ['Admin Review', 'ADMIN-007', 'Log Communication', 'Form to log email sent (date, recipients, subject, body)', 'Medium', 6, 'ADMIN-006', 'Communication log saved; viewable in request history', 'Pending'],

        // Onboarding
        ['Onboarding', 'ONBOARD-001', 'Mark as Onboarded', 'Form to capture billing start date and client identifiers', 'Critical', 8, 'ADMIN-006', 'Onboarding details saved; status updates to "Onboarded"', 'Pending'],
        ['Onboarding', 'ONBOARD-002', 'Capture Client Email ID', 'Text field for candidate email in client workspace', 'High', 3, 'ONBOARD-001', 'Client email saved; used for billing reconciliation', 'Pending'],
        ['Onboarding', 'ONBOARD-003', 'Capture Client Jira Username', 'Text field for Jira username (billing mapping)', 'High', 3, 'ONBOARD-001', 'Jira username saved; critical for Phase 2 billing automation', 'Pending'],
        ['Onboarding', 'ONBOARD-004', 'Update Status to "Onboarded"', 'Automatic status update after form submission', 'High', 4, 'ONBOARD-001', 'Status changes; resource appears in "Active Resources"', 'Pending'],
        ['Onboarding', 'ONBOARD-005', 'Client Rejection Flow', 'Form to capture rejection reason if client rejects', 'Medium', 6, 'ADMIN-006', 'Rejection reason saved; request marked appropriately', 'Pending'],
        ['Onboarding', 'ONBOARD-006', 'Replacement Required?', 'Yes/No choice for backfill trigger', 'Medium', 4, 'ONBOARD-005', 'If Yes selected, backfill request created', 'Pending'],
        ['Onboarding', 'ONBOARD-007', 'Auto-Create Backfill', 'Auto-generate new Request ID (Type=Backfill, same SOW)', 'Medium', 8, 'ONBOARD-006', 'Backfill request created with Status "With Back Office"', 'Pending'],

        // Exit Management
        ['Exit Management', 'EXIT-001', 'Process Exit', 'Form to capture exit reason and last working day', 'Critical', 8, 'ONBOARD-004', 'Exit details saved; status updates to "Exit"', 'Pending'],
        ['Exit Management', 'EXIT-002', 'Exit Reason Dropdown', '6 options: Customer Terminated, Resigned, No Show, Security Breach, Project Complete, Performance', 'High', 4, 'EXIT-001', 'Dropdown shows all 6 options; selection saved', 'Pending'],
        ['Exit Management', 'EXIT-003', 'Last Working Day', 'Date picker for billing end date', 'High', 3, 'EXIT-001', 'Date saved; used to calculate final billing period', 'Pending'],
        ['Exit Management', 'EXIT-004', 'Exit Notes', 'Multi-line text for additional context', 'Low', 2, 'EXIT-001', 'Notes saved; viewable in exit history', 'Pending'],
        ['Exit Management', 'EXIT-005', 'Replacement Required?', 'Yes/No for backfill creation', 'Medium', 4, 'EXIT-001', 'Choice saved; triggers backfill if Yes', 'Pending'],
        ['Exit Management', 'EXIT-006', 'Auto-Create Exit Backfill', 'Create backfill request on exit', 'Medium', 6, 'EXIT-005', 'Backfill inherits SOW from exited resource', 'Pending'],
        ['Exit Management', 'EXIT-007', 'Update Status to "Exit"', 'Automatic status change after exit processing', 'High', 3, 'EXIT-001', 'Status updated; resource removed from "Active" view', 'Pending'],

        // SOW Tracker
        ['SOW Tracker', 'SOW-001', 'Manual SOW Entry', 'Form to create SOW (SOW ID, Role, Date)', 'Medium', 6, 'REQUEST-001', 'SOW created; appears in SOW list', 'Pending'],
        ['SOW Tracker', 'SOW-002', 'Link SOW to Requests', 'Multi-select to link SOW to Request IDs', 'Medium', 6, 'SOW-001', '1 SOW linked to 5 requests; linkage saved correctly', 'Pending'],
        ['SOW Tracker', 'SOW-003', 'View SOW List', 'Table showing SOW ID, Role, Date, Request Count', 'Medium', 6, 'SOW-001', 'List displays; Request Count column accurate', 'Pending'],
        ['SOW Tracker', 'SOW-004', 'Display Request Count per SOW', 'Count column in SOW list', 'Low', 4, 'SOW-003', 'Count updates when new request linked to SOW', 'Pending'],

        // Infrastructure
        ['Infrastructure', 'INFRA-001', 'Supabase Project Setup', 'Create project, configure auth, enable storage', 'Critical', 4, 'None', 'Database accessible; auth configured', 'Pending'],
        ['Infrastructure', 'INFRA-002', 'Database Schema Design', '11 tables: users, job_profiles, resource_requests, candidates, etc.', 'Critical', 16, 'INFRA-001', 'All tables created; relationships defined; RLS policies set', 'Pending'],
        ['Infrastructure', 'INFRA-003', 'FastAPI Backend', 'Project structure, Pydantic models, async endpoints', 'Critical', 8, 'INFRA-002', 'Backend runs locally; health check endpoint returns 200', 'Pending'],
        ['Infrastructure', 'INFRA-004', 'React + Vite Frontend', 'Vite setup, TypeScript config, folder structure', 'Critical', 6, 'INFRA-003', 'Frontend dev server runs; can call backend API', 'Pending'],
        ['Infrastructure', 'INFRA-005', 'API Endpoint Structure', 'RESTful endpoints for all CRUD operations', 'High', 8, 'INFRA-003', 'All endpoints documented in Swagger/OpenAPI', 'Pending'],
        ['Infrastructure', 'INFRA-006', 'CORS Configuration', 'Enable CORS for frontend-backend communication', 'Medium', 2, 'INFRA-005', 'Frontend can make API calls without CORS errors', 'Pending'],
        ['Infrastructure', 'INFRA-007', 'Environment Variables', '.env files for DB credentials, JWT secrets, etc.', 'Medium', 3, 'INFRA-003', 'Secrets stored in .env; .env.example provided', 'Pending']
    ];

    // Calculate totals
    const totalHours = phase1Features.reduce((sum, row) => sum + row[5], 0);
    const totalFeatures = phase1Features.length;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet with better formatting
    const summaryData = [
        ['RMS Project - Feature List Summary'],
        [''],
        ['Project Information'],
        ['Project Name', 'Resource Management System (RMS)'],
        ['Document Version', '2.0 (Improved)'],
        ['Date', 'February 16, 2026'],
        ['Timeline', '2 Weeks (Feb 16 - March 2, 2026)'],
        [''],
        ['Phase 1 Statistics'],
        ['Total Features', totalFeatures],
        ['Total Estimated Hours', totalHours],
        ['Estimated Days (8hr/day)', Math.ceil(totalHours / 8)],
        ['Target Completion', 'March 2, 2026'],
        [''],
        ['Module Breakdown'],
        ['Module', 'Feature Count', 'Total Hours'],
        ['Authentication & RBAC', 4, 34],
        ['Dashboard', 10, 55],
        ['Job Profile Management', 5, 23],
        ['Resource Request', 8, 47],
        ['Recruiter Pipeline', 13, 76],
        ['Admin Review', 7, 38],
        ['Onboarding Management', 7, 36],
        ['Exit Management', 7, 26],
        ['SOW Tracker', 4, 22],
        ['Infrastructure', 7, 41],
        ['TOTAL', totalFeatures, totalHours],
        [''],
        ['Priority Distribution'],
        ['Critical', phase1Features.filter(f => f[4] === 'Critical').length, phase1Features.filter(f => f[4] === 'Critical').reduce((sum, f) => sum + f[5], 0)],
        ['High', phase1Features.filter(f => f[4] === 'High').length, phase1Features.filter(f => f[4] === 'High').reduce((sum, f) => sum + f[5], 0)],
        ['Medium', phase1Features.filter(f => f[4] === 'Medium').length, phase1Features.filter(f => f[4] === 'Medium').reduce((sum, f) => sum + f[5], 0)],
        ['Low', phase1Features.filter(f => f[4] === 'Low').length, phase1Features.filter(f => f[4] === 'Low').reduce((sum, f) => sum + f[5], 0)]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Apply column widths for summary
    summarySheet['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 15 }
    ];

    // Phase 1 sheet with headers
    const phase1Data = [
        ['Module', 'Feature ID', 'Feature', 'Description', 'Priority', 'Estimated Hours', 'Dependencies', 'Acceptance Criteria', 'Status'],
        ...phase1Features
    ];

    const phase1Sheet = XLSX.utils.aoa_to_sheet(phase1Data);

    // Apply column widths for phase 1
    phase1Sheet['!cols'] = [
        { wch: 18 },  // Module
        { wch: 13 },  // Feature ID
        { wch: 28 },  // Feature
        { wch: 50 },  // Description
        { wch: 10 },  // Priority
        { wch: 12 },  // Est Hours
        { wch: 20 },  // Dependencies
        { wch: 60 },  // Acceptance Criteria
        { wch: 10 }   // Status
    ];

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, phase1Sheet, 'Phase 1 Features (Detailed)');

    // Write file
    XLSX.writeFile(wb, 'RMS_Feature_List_v2.xlsx');
    console.log('✅ Improved Feature List generated: RMS_Feature_List_v2.xlsx');
    console.log(`   📊 ${totalFeatures} features, ${totalHours} hours`);
}

generateImprovedFeatureList();
