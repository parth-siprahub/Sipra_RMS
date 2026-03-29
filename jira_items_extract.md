# Jira Items: RMS Project

This document contains a comprehensive list of all Jira items (Epics and Stories) for the Resource Management System (RMS) project, as of March 16, 2026.

## Summary
- **Total Epics**: 8
- **Total Phase 1 Stories**: 80 (Delivered ✅)
- **Total Phase 2 Stories**: 20 (Planned 🕒)
- **Total Items**: 108

---

## Epics
1. **Authentication & RBAC**: User login, RBAC, permissions.
2. **Dashboard & Metrics**: Real-time metrics, charts, filters.
3. **Job Profile Management**: CRUD operations for job profiles.
4. **Resource Request Workflow**: Request creation, tracking, filters.
5. **Recruiter Pipeline**: Candidate tracking with full pipeline.
6. **Admin Operations**: Profile review, client submission, communication logging.
7. **Lifecycle Management**: Onboarding, exit, SOW, backfill workflows.
8. **Infrastructure & Deployment**: Database, backend, frontend, CI/CD.

---

## Phase 1 Stories (80 Items)

| ID | Module | Feature Name | Description | Priority | Points |
|:---|:---|:---|:---|:---|:---|
| **AUTH-001** | Authentication & RBAC | User Login | Secure login with email and password via Supabase Auth | Critical | 8 |
| **AUTH-002** | Authentication & RBAC | Role-Based Access Control | Three roles: ADMIN, RECRUITER, MANAGEMENT with permission mapping | Critical | 12 |
| **AUTH-003** | Authentication & RBAC | Permission-Based Features | Restrict features based on user role | High | 8 |
| **AUTH-004** | Authentication & RBAC | User Management | Admin CRUD for user accounts | Medium | 6 |
| **DASH-001** | Dashboard & Metrics | Total Requests Metric | Display total number of resource requests | High | 4 |
| **DASH-002** | Dashboard & Metrics | Onboarded Count | Display count of onboarded resources | High | 3 |
| **DASH-003** | Dashboard & Metrics | Awaiting Onboarding Count | Display count of candidates With Client (awaiting onboarding) | High | 3 |
| **DASH-004** | Dashboard & Metrics | To Be Shared Count | Display count of profiles With Admin (to be shared with client) | High | 3 |
| **DASH-005** | Dashboard & Metrics | Role-Wise Breakdown Chart | Bar/Pie chart showing distribution by role | Medium | 8 |
| **DASH-006** | Dashboard & Metrics | Technology Distribution Chart | Chart showing distribution by technology | Medium | 6 |
| **DASH-007** | Dashboard & Metrics | Status Filter Dropdown | Filter dashboard by status | Medium | 4 |
| **DASH-008** | Dashboard & Metrics | Attrition Rate Trend | Line graph showing exits over time | Low | 8 |
| **DASH-009** | Dashboard & Metrics | Avg Time to Onboard | Metric showing average days from request to onboarding | Low | 6 |
| **DASH-010** | Dashboard & Metrics | Date Range Filter | Custom date range selection for dashboard | Low | 6 |
| **JOBPROF-001** | Job Profile | Create Job Profile | Create job profile with role, technology, experience | High | 8 |
| **JOBPROF-002** | Job Profile | Edit Job Profile | Edit existing job profile | High | 4 |
| **JOBPROF-003** | Job Profile | Delete Job Profile | Delete job profile with validation | Medium | 4 |
| **JOBPROF-004** | Job Profile | List Job Profiles | Paginated list of job profiles | High | 4 |
| **JOBPROF-005** | Job Profile | Duplicate Validation | Prevent duplicate role names | Medium | 3 |
| **REQUEST-001** | Resource Request | Create Request | Create resource request with auto-generated ID | Critical | 12 |
| **REQUEST-002** | Resource Request | Job Profile Dropdown | Select job profile from dropdown | High | 4 |
| **REQUEST-003** | Resource Request | Request Source | Capture request source (Email/Chat) | Medium | 4 |
| **REQUEST-004** | Resource Request | Priority Field | Set priority (Urgent/High/Medium/Low) | Medium | 3 |
| **REQUEST-005** | Resource Request | Multi-Position Support | Support requests for multiple positions | Medium | 6 |
| **REQUEST-006** | Resource Request | View Request List | Paginated list of all requests | High | 8 |
| **REQUEST-007** | Resource Request | Filter Requests | Multi-criteria filtering | Medium | 8 |
| **REQUEST-008** | Resource Request | Search Requests | Search by request ID or candidate name | Medium | 6 |
| **PIPELINE-001** | Recruiter Pipeline | Add Candidate | Add candidate with complete 21-field form | Critical | 16 |
| **PIPELINE-002** | Recruiter Pipeline | Owner Assignment | Assign recruiter owner from dropdown | High | 4 |
| **PIPELINE-003** | Recruiter Pipeline | Vendor Field | Capture sourcing vendor from vendor master | Medium | 3 |
| **PIPELINE-004** | Recruiter Pipeline | Interview DateTime | Date and time picker for interview | Medium | 4 |
| **PIPELINE-005** | Recruiter Pipeline | Candidate Status | HR-approved status dropdown: NEW, SCREENING_DONE, etc. | High | 6 |
| **PIPELINE-006** | Recruiter Pipeline | CTC Fields | Current and Expected CTC fields | Medium | 3 |
| **PIPELINE-007** | Recruiter Pipeline | Location Fields | Current and Work Location fields | Low | 2 |
| **PIPELINE-008** | Recruiter Pipeline | Notice Period | Notice period in days (0–90) | Low | 2 |
| **PIPELINE-009** | Recruiter Pipeline | Remarks Field | Multi-line text for notes (max 1000 chars) | Low | 2 |
| **PIPELINE-010** | Recruiter Pipeline | Resume Upload | Upload resume to Supabase Storage (max 5MB) | Critical | 8 |
| **PIPELINE-011** | Recruiter Pipeline | Edit Candidate | Edit all 21 fields of existing candidate | High | 6 |
| **PIPELINE-012** | Recruiter Pipeline | View Candidate List | View all candidates for a request | High | 8 |
| **PIPELINE-013** | Recruiter Pipeline | Mark With Admin | Update request status to With Admin | High | 4 |
| **ADMIN-001** | Admin Operations | View With Admin | View all requests marked With Admin | High | 6 |
| **ADMIN-002** | Admin Operations | Validation Checklist | Checklist for email, format, JD alignment | Medium | 8 |
| **ADMIN-003** | Admin Operations | Download Profile | Download candidate profile as PDF | High | 4 |
| **ADMIN-004** | Admin Operations | Reject to Recruiter | Reject profile back to recruiter with reason | Medium | 6 |
| **ADMIN-005** | Admin Operations | Generate Email Template | Auto-generate email for client submission | High | 8 |
| **ADMIN-006** | Admin Operations | Mark With Client | Update status to With Client after submission | High | 4 |
| **ADMIN-007** | Admin Operations | Log Communication | Log communication date, client contact, type | Medium | 6 |
| **ONBOARD-001** | Onboarding | Mark Onboarded | Mark candidate as onboarded with billing start date | Critical | 8 |
| **ONBOARD-002** | Onboarding | Client Email | Capture client email ID on onboarding | High | 3 |
| **ONBOARD-003** | Onboarding | Client Jira Username | Capture client Jira username on onboarding | High | 3 |
| **ONBOARD-004** | Onboarding | Update to Onboarded | Update candidate status to ONBOARDED | High | 4 |
| **ONBOARD-005** | Onboarding | Client Rejection | Handle client rejection with reason | Medium | 6 |
| **ONBOARD-006** | Onboarding | Replacement Required | Flag if replacement needed on client rejection | Medium | 4 |
| **ONBOARD-007** | Onboarding | Auto-Create Backfill | Auto-create backfill request on client rejection | Medium | 8 |
| **EXIT-001** | Exit Management | Process Exit | Capture exit reason and last working day | Critical | 8 |
| **EXIT-002** | Exit Management | Exit Reason Dropdown | 6 exit reason options: Better Offer, Personal, etc. | High | 4 |
| **EXIT-003** | Exit Management | Last Working Day | Date picker for last working day | High | 3 |
| **EXIT-004** | Exit Management | Exit Notes | Multi-line text for exit notes | Low | 2 |
| **EXIT-005** | Exit Management | Replacement Required | Flag if replacement needed on exit | Medium | 4 |
| **EXIT-006** | Exit Management | Auto-Create Backfill | Auto-create backfill on exit; same SOW carries forward | Medium | 6 |
| **EXIT-007** | Exit Management | Update to Exit | Update candidate status to EXIT | High | 3 |
| **SOW-001** | SOW Tracker | Manual SOW Entry | Form to manually enter SOW details (Admin only) | Medium | 6 |
| **SOW-002** | SOW Tracker | Link SOW to Requests | SOW is mandatory-linked to each resource request | Medium | 6 |
| **SOW-003** | SOW Tracker | View SOW List | Table view of all SOWs — Active by default | Medium | 6 |
| **SOW-004** | SOW Tracker | Request Count | Display count of requests and onboarded resources per SOW | Low | 4 |
| **INFRA-001** | Infrastructure | Supabase Setup | Configure Supabase (PostgreSQL + Auth + Storage) | Critical | 4 |
| **INFRA-002** | Infrastructure | Database Schema | Design and create 6 core tables | Critical | 16 |
| **INFRA-003** | Infrastructure | FastAPI Backend | Scaffold FastAPI backend with async architecture | Critical | 8 |
| **INFRA-004** | Infrastructure | React Frontend | Setup React 18 + TypeScript + Vite frontend | Critical | 6 |
| **INFRA-005** | Infrastructure | API Endpoints | Define and implement 23 functional REST endpoints | High | 8 |
| **INFRA-006** | Infrastructure | CORS Configuration | Configure CORS for frontend-backend communication | Medium | 2 |
| **INFRA-007** | Infrastructure | Environment Variables | Setup .env for secrets management | Medium | 3 |
| **F-073** | Vendor Management | Vendor Master | CRUD module for vendor management (GFM, WRS, etc.) | High | 8 |
| **F-074** | Recruiter Pipeline | Kanban View | Visual pipeline stage board with drag-and-drop | High | 10 |
| **F-075** | Recruiter Pipeline | Feedback Capture | Specialized L1/L2 feedback and outcome recording | High | 6 |
| **F-076** | SOW Tracker | SOW Enhancements | Target date, submitted date, and JobProfile linking | High | 5 |
| **F-077** | Job Profile | Profile Enhancements | Rich text JD and jd_file_url upload | High | 5 |
| **F-078** | Dashboard | Dashboard Overhaul | KPI cards, hiring funnel, and vendor charts | High | 8 |
| **F-079** | Recruiter Pipeline | Pipeline Updates | INTERVIEW_BACK_OUT/OFFER_BACK_OUT and Source field | High | 8 |
| **F-080** | Vendor Management | Vendor RLS | Row Level Security for vendor-specific access | High | 8 |

---

## Phase 2 Stories (20 Items)

| ID | Module | Feature Name | Description | Priority |
|:---|:---|:---|:---|:---|
| **PORTAL-001** | Client Portal | Client Login | Direct login for clients to view profiles | High |
| **PORTAL-002** | Client Portal | View & Feedback | Client can provide feedback on profiles | High |
| **ANALYTICS-001** | Advanced Analytics | Predictive Attrition | ML-based model to predict attrition risk | Medium |
| **ANALYTICS-002** | Advanced Analytics | Report Builder | Drag-and-drop custom report builder | Low |
| **INTEG-001** | Integrations | Email Integration | Gmail/Outlook sync for request creation | Medium |
| **INTEG-002** | Integrations | Calendar Integration | Sync interview schedules to calendars | Medium |
| **INTEG-003** | Integrations | Jira API Integration | Sync onboarded resources to client Jira | High |
| **MOBILE-001** | Mobile App | iOS App | Native iOS app for recruiters/admins | Low |
| **MOBILE-002** | Mobile App | Android App | Native Android app for recruiters/admins | Low |
| **ADV-001** | Advanced Features | Bulk Upload | Excel import for candidate batch onboarding | Medium |
| **ADV-002** | Advanced Features | Version Control | Version history for resume uploads | Low |
| **ADV-003** | Advanced Features | Multi-Language | UI in multiple languages (English, Hindi) | Low |
| **F-P2-013** | Payroll | Jira Dump Import | Import Jira CSV and calculate payroll | High |
| **F-P2-014** | Exit Management | Dedicated Exit Page | Dedicated page with full exit workflow | High |
| **F-P2-015** | Onboarding | Onboarding Page | Dedicated onboarding checklist and tracking | High |
| **F-P2-016** | Infrastructure | Prod Deployment | Deploy full stack to Railway/Fly.io | Critical |
| **F-P2-017** | Infrastructure | PR Workflow | Configure branch protection and PR reviews | High |
| **F-P2-018** | Training | Training Materials | SOPs, video walkthroughs, and FAQ | High |
| **F-P2-019** | AI Features | Resume Parsing | AI-powered candidate extraction from resume | Medium |
| **F-P2-020** | Integrations | LinkedIn Integration | Direct LinkedIn candidate sourcing | Medium |
