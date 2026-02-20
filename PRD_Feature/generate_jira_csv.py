import csv
import os

# Define the Epics
epics = [
    ('RMS-E1', 'Authentication & RBAC', 'User login, RBAC, permissions'),
    ('RMS-E2', 'Dashboard & Metrics', 'Real-time metrics, charts, filters'),
    ('RMS-E3', 'Job Profile Management', 'CRUD operations for job profiles'),
    ('RMS-E4', 'Resource Request Workflow', 'Request creation, tracking, filters'),
    ('RMS-E5', 'Recruiter Pipeline', 'Candidate tracking with full pipeline'),
    ('RMS-E6', 'Admin Operations', 'Profile review, client submission, communication logging'),
    ('RMS-E7', 'Lifecycle Management', 'Onboarding and exit workflows'),
    ('RMS-E8', 'Infrastructure & Deployment', 'Database, backend, frontend, CI/CD'),
]

# Define all 72 Stories (mapped to Epics)
# Format: (Epic Key, Feature ID, Summary, Priority, Points, Dependencies, AC)
stories = [
    # E1: Authentication
    ('RMS-E1', 'AUTH-001', 'User Login Implementation', 'Critical', 8, 'None', 'User can log in with valid credentials; Invalid login shows error; Session persists'),
    ('RMS-E1', 'AUTH-002', 'Role-Based Access Control', 'Critical', 12, 'AUTH-001', 'Recruiter sees recruiter menu; Admin sees admin menu; Permissions enforced at API level'),
    ('RMS-E1', 'AUTH-003', 'Permission-Based Features', 'High', 8, 'AUTH-002', 'Recruiter cannot access Send to Client; Admin can process exits; Permissions tested'),
    ('RMS-E1', 'AUTH-004', 'User Management', 'Medium', 6, 'AUTH-002', 'Admin creates Back Office user; New user can log in; Admin can deactivate users'),

    # E2: Dashboard
    ('RMS-E2', 'DASH-001', 'Total Requests Metric', 'High', 4, 'REQUEST-001', 'Metric displays correct count; Updates when new request created'),
    ('RMS-E2', 'DASH-002', 'Onboarded Count', 'High', 3, 'ONBOARD-001', 'Count matches manual query; Updates when resource onboarded'),
    ('RMS-E2', 'DASH-003', 'Awaiting Onboarding Count', 'High', 3, 'ADMIN-006', 'Shows Status = With Client count; Updates in real-time'),
    ('RMS-E2', 'DASH-004', 'To Be Shared Count', 'High', 3, 'PIPELINE-013', 'Shows Status = With Admin count; Admin sees accurate count'),
    ('RMS-E2', 'DASH-005', 'Role-Wise Breakdown Chart', 'Medium', 8, 'JOBPROF-001', 'Bar/pie chart displays; Tooltip shows exact count; Interactive'),
    ('RMS-E2', 'DASH-006', 'Technology Distribution Chart', 'Medium', 6, 'JOBPROF-001', 'Chart groups by technology; Interactive and responsive'),
    ('RMS-E2', 'DASH-007', 'Status Filter Dropdown', 'Medium', 4, 'DASH-001', 'Selecting status filters dashboard; Metrics update correctly'),
    ('RMS-E2', 'DASH-008', 'Attrition Rate Trend Graph', 'Low', 8, 'EXIT-001', 'Line graph shows exits over time; Trend line calculated'),
    ('RMS-E2', 'DASH-009', 'Avg Time to Onboard Metric', 'Low', 6, 'ONBOARD-001', 'Metric calculated correctly; Excludes rejected requests'),
    ('RMS-E2', 'DASH-010', 'Date Range Filter', 'Low', 6, 'DASH-001', 'Custom date range selection; Accurate filtered data'),

    # E3: Job Profile
    ('RMS-E3', 'JOBPROF-001', 'Create Job Profile', 'High', 8, 'None', 'Job profile created; Saved to database; Visible in list'),
    ('RMS-E3', 'JOBPROF-002', 'Edit Job Profile', 'High', 4, 'JOBPROF-001', 'Job profile edited; Changes saved; Updated in list'),
    ('RMS-E3', 'JOBPROF-003', 'Delete Job Profile', 'Medium', 4, 'JOBPROF-001', 'Cannot delete if linked to requests; Confirmation shown'),
    ('RMS-E3', 'JOBPROF-004', 'List Job Profiles', 'High', 4, 'JOBPROF-001', 'Profiles listed; Pagination works; Search works'),
    ('RMS-E3', 'JOBPROF-005', 'Duplicate Validation', 'Medium', 3, 'JOBPROF-001', 'Same role name cannot be created twice; Error shown'),

    # E4: Requests
    ('RMS-E4', 'REQUEST-001', 'Create Request', 'Critical', 12, 'JOBPROF-001', 'Request ID auto-generated (REQ-YYYYMMDD-XXX); Job profile selected; Source captured'),
    ('RMS-E4', 'REQUEST-002', 'Job Profile Dropdown', 'High', 4, 'JOBPROF-001', 'Dropdown populated from job profiles; Selection saved'),
    ('RMS-E4', 'REQUEST-003', 'Capture Request Source', 'Medium', 4, 'REQUEST-001', 'Source dropdown works (Email/Chat); Saved correctly'),
    ('RMS-E4', 'REQUEST-004', 'Set Priority', 'Medium', 3, 'REQUEST-001', 'Priority dropdown works (Urgent/High/Medium/Low)'),
    ('RMS-E4', 'REQUEST-005', 'Multi-Position Request Support', 'Medium', 6, 'REQUEST-001', 'Position count field works; Multiple candidates linked'),
    ('RMS-E4', 'REQUEST-006', 'View Request List', 'High', 8, 'REQUEST-001', 'Requests listed; Pagination works; Sorting works'),
    ('RMS-E4', 'REQUEST-007', 'Filter Requests', 'Medium', 8, 'REQUEST-006', 'Filter by status, priority, job profile works'),
    ('RMS-E4', 'REQUEST-008', 'Search by Request ID', 'Medium', 6, 'REQUEST-006', 'Search by ID works; Search by candidate name works'),

    # E5: Pipeline
    ('RMS-E5', 'PIPELINE-001', 'Add Candidate (21 Fields)', 'Critical', 16, 'REQUEST-001', 'All 21 fields available; Validation works; Candidate saved'),
    ('RMS-E5', 'PIPELINE-002', 'Owner Assignment Dropdown', 'High', 4, 'AUTH-001', 'Owner dropdown populated with recruiters; Selection saved'),
    ('RMS-E5', 'PIPELINE-003', 'Vendor Field', 'Medium', 3, 'PIPELINE-001', 'Vendor dropdown (WRS/GFM/Internal) works'),
    ('RMS-E5', 'PIPELINE-004', 'Interview DateTime Picker', 'Medium', 4, 'PIPELINE-001', 'Date and time picker work; Saved correctly'),
    ('RMS-E5', 'PIPELINE-005', 'Candidate Status Dropdown', 'High', 6, 'PIPELINE-001', 'All 9 statuses available; Status updates correctly'),
    ('RMS-E5', 'PIPELINE-006', 'CTC Fields', 'Medium', 3, 'PIPELINE-001', 'Current and Expected CTC numeric fields work'),
    ('RMS-E5', 'PIPELINE-007', 'Location Fields', 'Low', 2, 'PIPELINE-001', 'Current and Work Location text fields work'),
    ('RMS-E5', 'PIPELINE-008', 'Notice Period Field', 'Low', 2, 'PIPELINE-001', 'Numeric notice period field works'),
    ('RMS-E5', 'PIPELINE-009', 'Remarks Multi-line', 'Low', 2, 'PIPELINE-001', 'Textarea works; Character limit enforced'),
    ('RMS-E5', 'PIPELINE-010', 'Upload Resume', 'Critical', 8, 'PIPELINE-001', 'File upload works; PDF/DOCX accepted; Max 5MB'),
    ('RMS-E5', 'PIPELINE-011', 'Edit Candidate Details', 'High', 6, 'PIPELINE-001', 'All 21 fields editable; Changes saved'),
    ('RMS-E5', 'PIPELINE-012', 'View Candidate List', 'High', 8, 'PIPELINE-001', 'Candidates listed; All fields visible; Sorting works'),
    ('RMS-E5', 'PIPELINE-013', 'Update Status to With Admin', 'High', 4, 'PIPELINE-001', 'Status updates; Request appears in Admin queue'),

    # E6: Admin
    ('RMS-E6', 'ADMIN-001', 'View Requests With Admin', 'High', 6, 'PIPELINE-013', 'List shows only With Admin requests; Pagination works'),
    ('RMS-E6', 'ADMIN-002', 'Validation Checklist', 'Medium', 8, 'ADMIN-001', 'Checklist displays; Items can be toggled; Saved'),
    ('RMS-E6', 'ADMIN-003', 'Download Candidate Profile', 'High', 4, 'ADMIN-001', 'PDF generated with candidate details and resume'),
    ('RMS-E6', 'ADMIN-004', 'Reject to Back Office', 'Medium', 6, 'ADMIN-001', 'Rejection reason captured; Status reverts; Recruiter notified'),
    ('RMS-E6', 'ADMIN-005', 'Generate Email Template', 'High', 8, 'ADMIN-001', 'Email template generated; Candidate details populated'),
    ('RMS-E6', 'ADMIN-006', 'Update Status to With Client', 'High', 4, 'ADMIN-005', 'Status updates; Request appears in client queue'),
    ('RMS-E6', 'ADMIN-007', 'Log Communication Details', 'Medium', 6, 'ADMIN-006', 'Date, contact, type logged; Audit trail maintained'),

    # E7: Lifecycle
    ('RMS-E7', 'ONBOARD-001', 'Mark as Onboarded', 'Critical', 8, 'ADMIN-006', 'Billing date captured; Status updates to Onboarded'),
    ('RMS-E7', 'ONBOARD-002', 'Capture Client Email', 'High', 3, 'ONBOARD-001', 'Email field works; Validation works'),
    ('RMS-E7', 'ONBOARD-003', 'Capture Client Jira Username', 'High', 3, 'ONBOARD-001', 'Text field works; Saved correctly'),
    ('RMS-E7', 'ONBOARD-004', 'Update Status to Onboarded', 'High', 4, 'ONBOARD-001', 'Status updates; Visible in onboarded list'),
    ('RMS-E7', 'ONBOARD-005', 'Client Rejection Flow', 'Medium', 6, 'ADMIN-006', 'Rejection reason captured; Status updates'),
    ('RMS-E7', 'ONBOARD-006', 'Replacement Required Choice', 'Medium', 4, 'ONBOARD-005', 'Checkbox works; Flag saved'),
    ('RMS-E7', 'ONBOARD-007', 'Auto-Create Backfill', 'Medium', 8, 'ONBOARD-006', 'Backfill request created; Links to original'),
    ('RMS-E7', 'EXIT-001', 'Process Exit', 'Critical', 8, 'ONBOARD-001', 'Exit form works; Reason/LWD captured'),
    ('RMS-E7', 'EXIT-002', 'Exit Reason Dropdown', 'High', 4, 'EXIT-001', 'All 6 reasons available'),
    ('RMS-E7', 'EXIT-003', 'Last Working Day Picker', 'High', 3, 'EXIT-001', 'Date picker works'),
    ('RMS-E7', 'EXIT-004', 'Exit Notes', 'Low', 2, 'EXIT-001', 'Textarea works'),
    ('RMS-E7', 'EXIT-005', 'Replacement Required (Exit)', 'Medium', 4, 'EXIT-001', 'Checkbox works'),
    ('RMS-E7', 'EXIT-006', 'Auto-Create Backfill (Exit)', 'Medium', 6, 'EXIT-005', 'Backfill created on exit'),
    ('RMS-E7', 'EXIT-007', 'Update Status to Exit', 'High', 3, 'EXIT-001', 'Status updates; Attrition metrics update'),

    # E8: Infrastructure
    ('RMS-E8', 'INFRA-001', 'Supabase Project Setup', 'Critical', 4, 'None', 'Project created; Database provisioned'),
    ('RMS-E8', 'INFRA-002', 'Database Schema Design', 'Critical', 16, 'INFRA-001', '11 tables created; Relations defined'),
    ('RMS-E8', 'INFRA-003', 'FastAPI Backend Scaffolding', 'Critical', 8, 'INFRA-002', 'FastAPI running; Async working'),
    ('RMS-E8', 'INFRA-004', 'React Frontend Setup', 'Critical', 6, 'None', 'React app running; Routing works'),
    ('RMS-E8', 'INFRA-005', 'API Endpoint Structure', 'High', 8, 'INFRA-003', 'Endpoints documented; CRUD operations work'),
    ('RMS-E8', 'INFRA-006', 'CORS Configuration', 'Medium', 2, 'INFRA-003', 'CORS allows frontend domain'),
    ('RMS-E8', 'INFRA-007', 'Environment Variables', 'Medium', 3, 'INFRA-003', 'Env vars loaded; Secrets secured'),
    
    # SOW
    ('RMS-E7', 'SOW-001', 'Manual SOW Entry Form', 'Medium', 6, 'None', 'SOW form works; Fields saved'),
    ('RMS-E7', 'SOW-002', 'Link SOW to Request IDs', 'Medium', 6, 'SOW-001', 'Multi-select works; Links saved'),
    ('RMS-E7', 'SOW-003', 'View SOW List', 'Medium', 6, 'SOW-001', 'SOWs listed in table'),
    ('RMS-E7', 'SOW-004', 'Request Count per SOW', 'Low', 4, 'SOW-002', 'Count displayed'),
]

# Write CSV file
output_path = r'C:/Users/parth/.gemini/antigravity/brain/39b25fbd-59cc-4ae8-8351-8dd232f82e33/RMS_Jira_Import.csv'
with open(output_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    # Jira CSV Header
    writer.writerow(['Summary', 'Issue Type', 'Epic Name', 'Epic Link', 'Priority', 'Story Points', 'Description', 'Acceptance Criteria', 'Labels'])
    
    # Write Epics first
    for epic_key, name, desc in epics:
        # Epic Name is required for creating Epics. Epic Link is empty for the Epic itself.
        writer.writerow([name, 'Epic', name, '', 'Medium', '', desc, '', 'RMS_Epic'])
        
    # Write Stories
    for epic_key, feat_id, summary, priority, points, deps, ac in stories:
        # Find Epic Name from Key
        epic_name = next(e[1] for e in epics if e[0] == epic_key)
        
        full_summary = f"[{feat_id}] {summary}"
        description = f"Implement feature {feat_id}.\nDependencies: {deps}"
        
        # Epic Link connects story to Epic (by Epic Name in CSV import typically)
        writer.writerow([full_summary, 'Story', '', epic_name, priority, points, description, ac, 'RMS_Phase1'])

print(f"Successfully created {output_path}")
