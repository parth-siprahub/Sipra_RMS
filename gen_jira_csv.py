"""Jira Import CSV — 8 Epics + 72 Stories"""
import csv

epics = [
    ('Authentication & RBAC', 'User login, RBAC, permissions'),
    ('Dashboard & Metrics', 'Real-time metrics, charts, filters'),
    ('Job Profile Management', 'CRUD operations for job profiles'),
    ('Resource Request Workflow', 'Request creation, tracking, filters'),
    ('Recruiter Pipeline', 'Candidate tracking with full pipeline'),
    ('Admin Operations', 'Profile review, client submission, communication logging'),
    ('Lifecycle Management', 'Onboarding, exit, SOW, backfill workflows'),
    ('Infrastructure & Deployment', 'Database, backend, frontend, CI/CD'),
]

stories = [
    ('Authentication & RBAC', 'AUTH-001', 'User Login Implementation', 'Critical', 8, 'None'),
    ('Authentication & RBAC', 'AUTH-002', 'Role-Based Access Control', 'Critical', 12, 'AUTH-001'),
    ('Authentication & RBAC', 'AUTH-003', 'Permission-Based Features', 'High', 8, 'AUTH-002'),
    ('Authentication & RBAC', 'AUTH-004', 'User Management', 'Medium', 6, 'AUTH-002'),
    ('Dashboard & Metrics', 'DASH-001', 'Total Requests Metric', 'High', 4, 'REQUEST-001'),
    ('Dashboard & Metrics', 'DASH-002', 'Onboarded Count', 'High', 3, 'ONBOARD-001'),
    ('Dashboard & Metrics', 'DASH-003', 'Awaiting Onboarding Count', 'High', 3, 'ADMIN-006'),
    ('Dashboard & Metrics', 'DASH-004', 'To Be Shared Count', 'High', 3, 'PIPELINE-013'),
    ('Dashboard & Metrics', 'DASH-005', 'Role-Wise Breakdown Chart', 'Medium', 8, 'JOBPROF-001'),
    ('Dashboard & Metrics', 'DASH-006', 'Technology Distribution Chart', 'Medium', 6, 'JOBPROF-001'),
    ('Dashboard & Metrics', 'DASH-007', 'Status Filter Dropdown', 'Medium', 4, 'DASH-001'),
    ('Dashboard & Metrics', 'DASH-008', 'Attrition Rate Trend Graph', 'Low', 8, 'EXIT-001'),
    ('Dashboard & Metrics', 'DASH-009', 'Avg Time to Onboard Metric', 'Low', 6, 'ONBOARD-001'),
    ('Dashboard & Metrics', 'DASH-010', 'Date Range Filter', 'Low', 6, 'DASH-001'),
    ('Job Profile Management', 'JOBPROF-001', 'Create Job Profile', 'High', 8, 'None'),
    ('Job Profile Management', 'JOBPROF-002', 'Edit Job Profile', 'High', 4, 'JOBPROF-001'),
    ('Job Profile Management', 'JOBPROF-003', 'Delete Job Profile', 'Medium', 4, 'JOBPROF-001'),
    ('Job Profile Management', 'JOBPROF-004', 'List Job Profiles', 'High', 4, 'JOBPROF-001'),
    ('Job Profile Management', 'JOBPROF-005', 'Duplicate Validation', 'Medium', 3, 'JOBPROF-001'),
    ('Resource Request Workflow', 'REQUEST-001', 'Create Resource Request', 'Critical', 12, 'JOBPROF-001'),
    ('Resource Request Workflow', 'REQUEST-002', 'Job Profile Dropdown', 'High', 4, 'JOBPROF-001'),
    ('Resource Request Workflow', 'REQUEST-003', 'Capture Request Source', 'Medium', 4, 'REQUEST-001'),
    ('Resource Request Workflow', 'REQUEST-004', 'Set Priority', 'Medium', 3, 'REQUEST-001'),
    ('Resource Request Workflow', 'REQUEST-005', 'Multi-Position Request', 'Medium', 6, 'REQUEST-001'),
    ('Resource Request Workflow', 'REQUEST-006', 'View Request List', 'High', 8, 'REQUEST-001'),
    ('Resource Request Workflow', 'REQUEST-007', 'Filter Requests', 'Medium', 8, 'REQUEST-006'),
    ('Resource Request Workflow', 'REQUEST-008', 'Search by Request ID', 'Medium', 6, 'REQUEST-006'),
    ('Recruiter Pipeline', 'PIPELINE-001', 'Add Candidate (21 Fields)', 'Critical', 16, 'REQUEST-001'),
    ('Recruiter Pipeline', 'PIPELINE-002', 'Owner Assignment Dropdown', 'High', 4, 'AUTH-001'),
    ('Recruiter Pipeline', 'PIPELINE-003', 'Vendor Field', 'Medium', 3, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-004', 'Interview DateTime Picker', 'Medium', 4, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-005', 'Candidate Status Dropdown', 'High', 6, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-006', 'CTC Fields', 'Medium', 3, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-007', 'Location Fields', 'Low', 2, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-008', 'Notice Period Field', 'Low', 2, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-009', 'Remarks Multi-line', 'Low', 2, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-010', 'Upload Resume', 'Critical', 8, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-011', 'Edit Candidate Details', 'High', 6, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-012', 'View Candidate List', 'High', 8, 'PIPELINE-001'),
    ('Recruiter Pipeline', 'PIPELINE-013', 'Update Status to With Admin', 'High', 4, 'PIPELINE-001'),
    ('Admin Operations', 'ADMIN-001', 'View Requests With Admin', 'High', 6, 'PIPELINE-013'),
    ('Admin Operations', 'ADMIN-002', 'Validation Checklist', 'Medium', 8, 'ADMIN-001'),
    ('Admin Operations', 'ADMIN-003', 'Download Candidate Profile', 'High', 4, 'ADMIN-001'),
    ('Admin Operations', 'ADMIN-004', 'Reject to Back Office', 'Medium', 6, 'ADMIN-001'),
    ('Admin Operations', 'ADMIN-005', 'Generate Email Template', 'High', 8, 'ADMIN-001'),
    ('Admin Operations', 'ADMIN-006', 'Update Status to With Client', 'High', 4, 'ADMIN-005'),
    ('Admin Operations', 'ADMIN-007', 'Log Communication Details', 'Medium', 6, 'ADMIN-006'),
    ('Lifecycle Management', 'ONBOARD-001', 'Mark as Onboarded', 'Critical', 8, 'ADMIN-006'),
    ('Lifecycle Management', 'ONBOARD-002', 'Capture Client Email', 'High', 3, 'ONBOARD-001'),
    ('Lifecycle Management', 'ONBOARD-003', 'Capture Client Jira Username', 'High', 3, 'ONBOARD-001'),
    ('Lifecycle Management', 'ONBOARD-004', 'Update Status to Onboarded', 'High', 4, 'ONBOARD-001'),
    ('Lifecycle Management', 'ONBOARD-005', 'Client Rejection Flow', 'Medium', 6, 'ADMIN-006'),
    ('Lifecycle Management', 'ONBOARD-006', 'Replacement Required Choice', 'Medium', 4, 'ONBOARD-005'),
    ('Lifecycle Management', 'ONBOARD-007', 'Auto-Create Backfill', 'Medium', 8, 'ONBOARD-006'),
    ('Lifecycle Management', 'EXIT-001', 'Process Exit', 'Critical', 8, 'ONBOARD-001'),
    ('Lifecycle Management', 'EXIT-002', 'Exit Reason Dropdown', 'High', 4, 'EXIT-001'),
    ('Lifecycle Management', 'EXIT-003', 'Last Working Day Picker', 'High', 3, 'EXIT-001'),
    ('Lifecycle Management', 'EXIT-004', 'Exit Notes', 'Low', 2, 'EXIT-001'),
    ('Lifecycle Management', 'EXIT-005', 'Replacement Required (Exit)', 'Medium', 4, 'EXIT-001'),
    ('Lifecycle Management', 'EXIT-006', 'Auto-Create Backfill (Exit)', 'Medium', 6, 'EXIT-005'),
    ('Lifecycle Management', 'EXIT-007', 'Update Status to Exit', 'High', 3, 'EXIT-001'),
    ('Lifecycle Management', 'SOW-001', 'Manual SOW Entry Form', 'Medium', 6, 'None'),
    ('Lifecycle Management', 'SOW-002', 'Link SOW to Request IDs', 'Medium', 6, 'SOW-001'),
    ('Lifecycle Management', 'SOW-003', 'View SOW List', 'Medium', 6, 'SOW-001'),
    ('Lifecycle Management', 'SOW-004', 'Request Count per SOW', 'Low', 4, 'SOW-002'),
    ('Infrastructure & Deployment', 'INFRA-001', 'Supabase Project Setup', 'Critical', 4, 'None'),
    ('Infrastructure & Deployment', 'INFRA-002', 'Database Schema Design', 'Critical', 16, 'INFRA-001'),
    ('Infrastructure & Deployment', 'INFRA-003', 'FastAPI Backend Scaffolding', 'Critical', 8, 'INFRA-002'),
    ('Infrastructure & Deployment', 'INFRA-004', 'React Frontend Setup', 'Critical', 6, 'None'),
    ('Infrastructure & Deployment', 'INFRA-005', 'API Endpoint Structure', 'High', 8, 'INFRA-003'),
    ('Infrastructure & Deployment', 'INFRA-006', 'CORS Configuration', 'Medium', 2, 'INFRA-003'),
    ('Infrastructure & Deployment', 'INFRA-007', 'Environment Variables', 'Medium', 3, 'INFRA-003'),
]

out = r'C:/Users/parth/.gemini/antigravity/brain/39b25fbd-59cc-4ae8-8351-8dd232f82e33/RMS_Jira_Import.csv'
with open(out, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['Summary', 'Issue Type', 'Epic Name', 'Epic Link', 'Priority', 'Story Points', 'Description', 'Labels'])
    for name, desc in epics:
        w.writerow([name, 'Epic', name, '', 'Medium', '', desc, 'RMS_Epic'])
    for epic, fid, summary, pri, pts, deps in stories:
        w.writerow([f'[{fid}] {summary}', 'Story', '', epic, pri, pts, f'Feature {fid}. Dependencies: {deps}', 'RMS_Phase1'])

epic_count = len(epics)
story_count = len(stories)
print(f'Jira CSV generated: {out}')
print(f'  {epic_count} Epics + {story_count} Stories = {epic_count + story_count} total rows')
