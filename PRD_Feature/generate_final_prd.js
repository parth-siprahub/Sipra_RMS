const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, TableOfContents, BorderStyle } = require('docx');
const fs = require('fs');

async function generateConsolidatedPRD() {
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        size: 26, // 13pt (26 half-points) - slightly larger
                        font: 'Calibri'
                    },
                    paragraph: {
                        spacing: {
                            line: 320,
                            before: 100,
                            after: 100
                        }
                    }
                },
                heading1: {
                    run: {
                        size: 36, // 18pt
                        bold: true,
                        color: '1F4788'
                    },
                    paragraph: {
                        spacing: { before: 400, after: 200 }
                    }
                },
                heading2: {
                    run: {
                        size: 30, // 15pt
                        bold: true,
                        color: '2E5C8A'
                    },
                    paragraph: {
                        spacing: { before: 300, after: 150 }
                    }
                },
                heading3: {
                    run: {
                        size: 28, // 14pt
                        bold: true,
                        color: '4682B4'
                    },
                    paragraph: {
                        spacing: { before: 200, after: 100 }
                    }
                }
            }
        },
        sections: [{
            children: [
                // Title Page
                new Paragraph({
                    text: 'Product Requirements Document',
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    text: 'Resource Management System (RMS)',
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    style: 'Heading1'
                }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'Document Version: ', bold: true }),
                        new TextRun('1.0')
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Date: ', bold: true }),
                        new TextRun('February 16, 2026')
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Project Timeline: ', bold: true }),
                        new TextRun('2 Weeks (Feb 16 - March 2, 2026)')
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Confidentiality: ', bold: true }),
                        new TextRun('Internal Use Only')
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 600 }
                }),

                // Page break before main content
                new Paragraph({ text: '', pageBreakBefore: true }),

                // 1. Executive Summary
                new Paragraph({
                    text: '1. Executive Summary',
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }),

                new Paragraph({ text: '1.1 Project Overview', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    text: 'The Resource Management System (RMS) is a comprehensive web-based platform designed to replace the current manual Excel-based workflow for managing staff augmentation operations. The system will centralize tracking of resource requests, candidate sourcing, onboarding, and lifecycle management from initial request through exit.',
                    spacing: { after: 200 }
                }),

                new Paragraph({ text: '1.2 Problem Statement', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    text: 'The organization currently manages approximately 300+ active resources using multiple Excel spreadsheets (Resource Data, SOW Tracker, Category Data, Recruiter Pipeline). This manual process results in:',
                    spacing: { after: 100 }
                }),
                new Paragraph({ text: '• Data inconsistencies due to manual entry (e.g., role name variations)', spacing: { after: 50 } }),
                new Paragraph({ text: '• No centralized profile storage - requires email searches to retrieve candidate documents', spacing: { after: 50 } }),
                new Paragraph({ text: '• Client visibility into high attrition rates when sharing Excel files', spacing: { after: 50 } }),
                new Paragraph({ text: '• Difficult billing reconciliation with client systems (Jira username mapping)', spacing: { after: 50 } }),
                new Paragraph({ text: '• No audit trail for request origins or client communications', spacing: { after: 50 } }),
                new Paragraph({ text: '• Inability to scale beyond 300-500 resources', spacing: { after: 200 } }),

                new Paragraph({ text: '1.3 Business Objectives', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Primary Goals:', bold: true, spacing: { after: 100 } }),
                new Paragraph({ text: '1. Eliminate Excel dependency by providing a centralized web-based RMS', spacing: { after: 50 } }),
                new Paragraph({ text: '2. Implement comprehensive recruiter pipeline tracking with 21 candidate data points', spacing: { after: 50 } }),
                new Paragraph({ text: '3. Automate status workflows (New → Back Office → Admin → Client → Onboarded → Exit)', spacing: { after: 50 } }),
                new Paragraph({ text: '4. Reduce data entry errors through dropdown-based Job Profile selection', spacing: { after: 50 } }),
                new Paragraph({ text: '5. Enable instant profile retrieval through integrated document storage', spacing: { after: 200 } }),

                new Paragraph({ text: '1.4 Success Metrics', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• 100% of resource requests created in RMS (zero Excel usage)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Dashboard load time under 2 seconds for 500+ resource records', spacing: { after: 50 } }),
                new Paragraph({ text: '• Profile retrieval reduced from ~5 minutes (email search) to <10 seconds', spacing: { after: 50 } }),
                new Paragraph({ text: '• Zero role naming inconsistencies through enforced dropdown selection', spacing: { after: 50 } }),
                new Paragraph({ text: '• Recruiter pipeline fully adopted by HR team within first week of deployment', spacing: { after: 300 } }),

                // 2. User Personas
                new Paragraph({ text: '2. User Personas', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '2.1 Recruiter (Back Office User)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Demographics:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Role: Talent Acquisition Specialist / Resource Manager', spacing: { after: 50 } }),
                new Paragraph({ text: '• Daily Tasks: Source candidates, coordinate with vendors, schedule interviews, track pipeline stages', spacing: { after: 50 } }),
                new Paragraph({ text: '• Pain Points: Managing multiple Excel sheets, manually updating candidate statuses, losing track of interview schedules', spacing: { after: 200 } }),

                new Paragraph({ text: 'Goals:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Quickly add and track candidates from multiple sources (vendors, job portals)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Update interview schedules and candidate statuses in one place', spacing: { after: 50 } }),
                new Paragraph({ text: '• Edit candidate details at any time (CTC, location, notice period, etc.)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Attach and retrieve candidate resumes instantly', spacing: { after: 200 } }),

                new Paragraph({ text: 'Frustrations:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Cannot find candidate data when HR manager asks for updates', spacing: { after: 50 } }),
                new Paragraph({ text: '• Accidentally overwriting data in shared Excel files', spacing: { after: 50 } }),
                new Paragraph({ text: '• No way to track which vendor provided which candidate', spacing: { after: 300 } }),

                new Paragraph({ text: '2.2 Admin User', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Demographics:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Role: Operations Admin / Client Relations Manager', spacing: { after: 50 } }),
                new Paragraph({ text: '• Daily Tasks: Validate candidate profiles, send submissions to client, track onboarding status, process exits', spacing: { after: 200 } }),

                new Paragraph({ text: 'Goals:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Perform final quality check on candidate profiles before client submission', spacing: { after: 50 } }),
                new Paragraph({ text: '• Log all communication with client (email timestamps, recipients)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Track onboarding progress and capture billing start dates', spacing: { after: 50 } }),
                new Paragraph({ text: '• Process exits and initiate backfills when needed', spacing: { after: 200 } }),

                new Paragraph({ text: 'Frustrations:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Searching emails manually to find sent candidate profiles', spacing: { after: 50 } }),
                new Paragraph({ text: '• Forgetting to log billing start dates for invoicing', spacing: { after: 50 } }),
                new Paragraph({ text: '• No visibility into which candidates are ready for client submission', spacing: { after: 300 } }),

                new Paragraph({ text: '2.3 Future: Client Portal User (Phase 2)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Demographics:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Role: Client HR / Project Manager', spacing: { after: 50 } }),
                new Paragraph({ text: '• Needs: Real-time visibility into active resources, pending submissions, project assignments', spacing: { after: 200 } }),

                new Paragraph({ text: 'Goals:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• View current active resources without requesting updates', spacing: { after: 50 } }),
                new Paragraph({ text: '• See pending candidate submissions awaiting review', spacing: { after: 50 } }),
                new Paragraph({ text: '• Track project-wise resource allocation', spacing: { after: 200 } }),

                new Paragraph({ text: 'Requirements:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Read-only access (cannot modify data)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Filter out sensitive internal data (exit history, vendor details)', spacing: { after: 300 } }),

                // 3. User Stories
                new Paragraph({ text: '3. User Stories & Acceptance Criteria', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '3.1 Resource Request Management', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-001: Create Resource Request', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As an Admin, I want to create a resource request with auto-generated Request ID so that I can formally track client requirements.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• System auto-generates sequential Request ID (format: R001, R002, etc.)', spacing: { after: 50 } }),
                new Paragraph({ text: '• User selects Job Profile from dropdown (prevents typing errors)', spacing: { after: 50 } }),
                new Paragraph({ text: '• User can specify number of positions (e.g., 5 positions creates 5 Request IDs)', spacing: { after: 50 } }),
                new Paragraph({ text: '• User captures request source (Email/Chat) with reference field', spacing: { after: 50 } }),
                new Paragraph({ text: '• Initial status automatically set to "New"', spacing: { after: 200 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-002: View Dashboard Metrics', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As a Recruiter or Admin, I want to see real-time dashboard metrics so that I can understand current resource status at a glance.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Display total resource requests count', spacing: { after: 50 } }),
                new Paragraph({ text: '• Show onboarded resources count (Status = "Onboarded")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Show awaiting onboarding count (Status = "With Client")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Show "To Be Shared" count (Status = "With Admin")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Display role-wise breakdown chart (e.g., Backend Developer: 15, QA: 8)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Dashboard loads in under 2 seconds for 500+ records', spacing: { after: 200 } }),

                new Paragraph({ text: '3.2 Recruiter Pipeline', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-003: Add Candidate to Request', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As a Recruiter, I want to add a candidate with comprehensive details so that I can track sourcing and interview progress.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• System provides 21-field form including:', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Owner (recruiter assignment)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Vendor (WRS, GFM, Internal, etc.)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Interview Date/Time', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Candidate Status (L1 Reject, L2 Scheduled, Selected, etc.)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Contact details (Name, Email, Phone)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Experience (Total, Relevant)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Compensation (Current CTC, Expected CTC)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Location (Current, Preferred Work Location)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Notice Period, Remarks', spacing: { after: 50 } }),
                new Paragraph({ text: '• User can upload candidate resume (PDF/DOCX)', spacing: { after: 50 } }),
                new Paragraph({ text: '• All fields remain editable at any time after creation', spacing: { after: 200 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-004: Update Candidate Status', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As a Recruiter, I want to update candidate status as they progress through interviews so that I can track pipeline movement.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Status dropdown includes: L1 Reject, L2 Reject, Screen Reject, L1 Scheduled, L2 Scheduled, Screen Select, Selected, Duplicate, Interview to be scheduled', spacing: { after: 50 } }),
                new Paragraph({ text: '• Status change updates candidate record immediately', spacing: { after: 50 } }),
                new Paragraph({ text: '• When status = "Selected", recruiter can prepare profile for admin review', spacing: { after: 200 } }),

                new Paragraph({ text: '3.3 Admin Review & Client Submission', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-005: Validate Candidate for Client Submission', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As an Admin, I want to validate candidate profiles before sending to client so that we ensure quality and completeness.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• System shows all requests with Status = "With Admin"', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin can view candidate details and download attached resume', spacing: { after: 50 } }),
                new Paragraph({ text: '• Validation checklist includes:', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Email address created and verified', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Profile format matches company template', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Experience requirements match Job Profile', spacing: { after: 50 } }),
                new Paragraph({ text: '• If validation fails, admin can reject back to "With Back Office" with reason', spacing: { after: 50 } }),
                new Paragraph({ text: '• If validation passes, admin can generate email template for client submission', spacing: { after: 200 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-006: Log Client Communication', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As an Admin, I want to log all communications sent to client so that there is an audit trail for future reference.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• System captures date/time of email sent', spacing: { after: 50 } }),
                new Paragraph({ text: '• System captures client recipient emails', spacing: { after: 50 } }),
                new Paragraph({ text: '• System captures email subject and body (summary)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Communication log viewable for each request', spacing: { after: 200 } }),

                new Paragraph({ text: '3.4 Onboarding & Exit Management', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-007: Mark Resource as Onboarded', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As an Admin, I want to capture onboarding details when client approves a candidate so that billing can begin.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin enters Billing Start Date (date candidate joins client workspace)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin captures Client Email ID (email candidate uses in client system)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin captures Client Jira Username (for billing reconciliation)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Status automatically updates to "Onboarded"', spacing: { after: 50 } }),
                new Paragraph({ text: '• Resource appears in "Active Resources" dashboard view', spacing: { after: 200 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-008: Process Resource Exit', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As an Admin, I want to process exits and trigger backfills when needed so that client positions remain filled.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin selects Exit Reason from dropdown (Customer Terminated, Resigned, No Show, Security Breach, Project Completion, Performance Issues)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin enters Last Working Day (billing end date)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin chooses Replacement Required (Yes/No)', spacing: { after: 50 } }),
                new Paragraph({ text: '• If Replacement Required = Yes, system auto-creates new Request ID with Type = "Backfill", same SOW, Status = "With Back Office"', spacing: { after: 50 } }),
                new Paragraph({ text: '• Original request status updates to "Exit"', spacing: { after: 200 } }),

                new Paragraph({ text: '3.5 Job Profile & SOW Management', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-009: Create Job Profile', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As an Admin, I want to create standardized job profiles so that recruiters select consistent role definitions when creating requests.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin enters Role/Designation (e.g., "Backend Node.js Developer")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin provides Job Description (text field or attached file)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin lists Primary Skills and Secondary Skills', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin sets Experience Level (Junior/Mid/Senior)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin defines Billing Rate (per hour/month)', spacing: { after: 50 } }),
                new Paragraph({ text: '• System prevents duplicate role names', spacing: { after: 200 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'US-010: Manual SOW Entry (Phase 1)', bold: true })
                    ],
                    spacing: { before: 100, after: 50 }
                }),
                new Paragraph({ text: 'As an Admin, I want to create SOW records linked to requests so that I can track contractual commitments.', spacing: { after: 100 } }),
                new Paragraph({ text: 'Acceptance Criteria:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin manually enters SOW ID, Role, SOW Date', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin links SOW to one or more Request IDs', spacing: { after: 50 } }),
                new Paragraph({ text: '• SOW list displays total Request IDs per SOW', spacing: { after: 50 } }),
                new Paragraph({ text: '• SOW can be shared with multiple requests (e.g., 1 SOW for 5 Oracle Developer positions)', spacing: { after: 300 } }),

                // 4. Feature Requirements
                new Paragraph({ text: '4. Functional Requirements', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '4.1 Authentication & Access Control', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• Users must authenticate with email and password', spacing: { after: 50 } }),
                new Paragraph({ text: '• Role-based access control (RBAC) with two primary roles:', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Back Office (Recruiter): Can create/edit candidates, update pipeline, view all requests', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Admin: Can review candidates, send to client, process onboarding/exits, manage job profiles', spacing: { after: 50 } }),
                new Paragraph({ text: '• Permission-based feature access (e.g., only admins can "Send to Client")', spacing: { after: 50 } }),
                new Paragraph({ text: '• User sessions secured with industry-standard authentication patterns', spacing: { after: 200 } }),

                new Paragraph({ text: '4.2 Dashboard & Reporting', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Key Metrics:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Total resource requests (count)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Onboarded resources (count and list)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Awaiting onboarding (Status = "With Client")', spacing: { after: 50 } }),
                new Paragraph({ text: '• To be shared with client (Status = "With Admin")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Active exits (resources that left this month)', spacing: { after: 200 } }),

                new Paragraph({ text: 'Visualizations:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Role-wise breakdown (bar/pie chart showing counts per role)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Technology distribution (chart showing primary skills)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Attrition rate trend (line graph over time)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Average time to onboard metric (days from request to onboarding)', spacing: { after: 200 } }),

                new Paragraph({ text: 'Filters:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Filter by status (All, New, With Back Office, With Admin, With Client, Onboarded, Exit)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Filter by date range', spacing: { after: 50 } }),
                new Paragraph({ text: '• Filter by role/technology', spacing: { after: 200 } }),

                new Paragraph({ text: '4.3 Resource Request Workflow', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Request Creation:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Auto-generate sequential Request ID (R001, R002, etc.)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Select job profile from dropdown (enforced - prevents typing)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Specify number of positions (creates multiple Request IDs if needed)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Capture request source (Email/Chat) with reference field (email ID/chat link)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Set priority: Urgent/High/Medium/Low', spacing: { after: 50 } }),
                new Paragraph({ text: '• Optional project field (some clients don\'t share project names)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Initial status: "New"', spacing: { after: 200 } }),

                new Paragraph({ text: 'Status Progression:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: 'New → With Back Office → With Admin → With Client → Onboarded → Exit', spacing: { after: 100 } }),
                new Paragraph({ text: '• Users can manually update status at appropriate workflow stages', spacing: { after: 50 } }),
                new Paragraph({ text: '• Status change timestamps logged for audit', spacing: { after: 200 } }),

                new Paragraph({ text: '4.4 Recruiter Pipeline (Candidate Tracking)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'CRITICAL REQUIREMENT: ', bold: true, color: 'FF0000' }),
                        new TextRun('This module captures all 21 fields required by the recruiting team to manage vendor sourcing, interviews, and candidate details.')
                    ],
                    spacing: { after: 200 }
                }),

                new Paragraph({ text: 'Candidate Form Fields (21 Total):', bold: true, spacing: { after: 50 } }),

                // Create compact table for candidate fields
                new Table({
                \r
                    width: { size: 100, type: WidthType.PERCENTAGE }, \r
                    rows: [\r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph({ text: '#', bold: true })], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph({ text: 'Field Name', bold: true })], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph({ text: 'Description', bold: true })], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('1')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Owner')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Recruiter assigned to this candidate')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('2')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Date')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Date candidate was added')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('3')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Vendor')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Sourcing vendor (e.g., WRS, GFM, Internal)')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('4')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Interview Date')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Scheduled interview date')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('5')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Time')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Interview time slot')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('6')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Candidate Status')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('L1/L2 Reject, Screen Reject, Selected, etc.')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('7')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Skill')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Primary skill (e.g., Node.js, DBA)')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('8')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Candidate Name')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Full name')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('9')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Contact Number')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Phone number')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('10')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Email ID')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Candidate email')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('11')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Total Exp')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Total years of experience')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('12')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Relevant Exp')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Years of relevant skill experience')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('13')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Current Company')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Current employer')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('14')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Current CTC')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Annual salary (current)')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('15')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Expected CTC')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Expected annual salary (Fixed + Variable)')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('16')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Current Location')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('City/State')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('17')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Work Location')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Preferred work location')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('18')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Notice Period')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Days (e.g., "30 days", "Immediate")')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('19')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Remarks')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Additional notes')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('20')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Invite States')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Interview invite status')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }), \r
                        new TableRow({
                \r
                            children: [\r
                                new TableCell({ children: [new Paragraph('21')], width: { size: 10, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Resume Upload')], width: { size: 25, type: WidthType.PERCENTAGE } }), \r
                                new TableCell({ children: [new Paragraph('Attached candidate resume (PDF/DOCX)')], width: { size: 65, type: WidthType.PERCENTAGE } }) \r
                    ]\r
                }) \r
                    ]\r
                }),

                new Paragraph({ text: '', spacing: { after: 200 } }),

                new Paragraph({ text: 'Key Requirements:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• All 21 fields must be editable at any time (recruiter requirement)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Recruiters can add multiple candidates to a single request', spacing: { after: 50 } }),
                new Paragraph({ text: '• Resume files stored securely and retrievable instantly', spacing: { after: 50 } }),
                new Paragraph({ text: '• Candidate status dropdown options: L1 Reject, L2 Reject, Screen Reject, L1 Scheduled, L2 Scheduled, Screen Select, Selected, Duplicate, Interview to be scheduled', spacing: { after: 200 } }),

                new Paragraph({ text: '4.5 Admin Operations', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),

                new Paragraph({ text: 'Profile Validation & Client Submission:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• View all requests with Status = "With Admin"', spacing: { after: 50 } }),
                new Paragraph({ text: '• Download candidate profiles for review', spacing: { after: 50 } }),
                new Paragraph({ text: '• Validation checklist (email created, profile format, experience match)', spacing: { after: 50 } }),
                new Paragraph({ text: '• If validation fails: reject back to "With Back Office" with reason', spacing: { after: 50 } }),
                new Paragraph({ text: '• If validation passes: generate email template for client (manual copy-paste in Phase 1)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Log communication details (date, recipients, subject, body)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Update status to "With Client" after submission', spacing: { after: 200 } }),

                new Paragraph({ text: 'Onboarding:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Capture Billing Start Date (critical for invoicing)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Capture Client Email ID (email candidate uses in client workspace)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Capture Client Jira Username (for billing reconciliation with client timesheets)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Update status to "Onboarded"', spacing: { after: 200 } }),

                new Paragraph({ text: 'Client Rejection Handling:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Capture rejection reason (dropdown + free text)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Ask: Replacement Required? (Yes/No)', spacing: { after: 50 } }),
                new Paragraph({ text: '• If Yes: Auto-create new Request ID (Type = "Backfill", same SOW, Status = "With Back Office")', spacing: { after: 50 } }),
                new Paragraph({ text: '• If No: Mark request as "Rejected by Client" (closed)', spacing: { after: 200 } }),

                new Paragraph({ text: 'Exit Processing:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Select exit reason: Customer Terminated, Resigned, No Show, Security Breach, Project Completion, Performance Issues', spacing: { after: 50 } }),
                new Paragraph({ text: '• Enter Last Working Day (billing end date)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Enter exit notes (multi-line text)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Ask: Replacement Required? (Yes/No)', spacing: { after: 50 } }),
                new Paragraph({ text: '• If Yes: Auto-create backfill request (Type = "Backfill", same SOW)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Update original request status to "Exit"', spacing: { after: 50 } }),
                new Paragraph({ text: '• Support 2-3 day overlap for knowledge transfer (new resource onboards before old exits)', spacing: { after: 200 } }),

                new Paragraph({ text: '4.6 Job Profile Management', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• Create job profiles with: Role name, Job Description, Primary/Secondary Skills, Experience Level, Billing Rate', spacing: { after: 50 } }),
                new Paragraph({ text: '• Edit existing job profiles', spacing: { after: 50 } }),
                new Paragraph({ text: '• Delete job profiles (with validation - cannot delete if in use)', spacing: { after: 50 } }),
                new Paragraph({ text: '• List all job profiles (sortable/filterable)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Prevent duplicate role names', spacing: { after: 50 } }),
                new Paragraph({ text: '• Job profiles used as dropdown selections when creating resource requests', spacing: { after: 200 } }),

                new Paragraph({ text: '4.7 SOW Tracker (Phase 1: Manual Entry)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• Manually create SOW records (SOW ID, Role, SOW Date)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Link SOW to one or more Request IDs', spacing: { after: 50 } }),
                new Paragraph({ text: '• View SOW list showing Request ID counts per SOW', spacing: { after: 50 } }),
                new Paragraph({ text: '• One SOW can map to multiple positions (e.g., 1 SOW for 5 Oracle Developer requests)', spacing: { after: 50 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Note: ', bold: true, italics: true }),
                        new TextRun({ text: 'Automated SOW PDF generation deferred to Phase 2.', italics: true })
                    ],
                    spacing: { after: 300 }
                }),

                // 5. Scope & Boundaries
                new Paragraph({ text: '5. Scope & Boundaries', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '5.1 Phase 1 Scope (2-Week Delivery)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'In Scope:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '✓ User authentication and role-based access (Recruiter, Admin)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Dashboard with metrics and visualizations', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Job Profile management (CRUD)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Resource Request creation with auto-generated IDs', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Full recruiter pipeline with 21-field candidate tracking', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Admin review and manual client submission workflow', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Onboarding management (capture billing start date, client identifiers)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Exit management with automated backfill creation', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ SOW tracker (manual entry)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ File upload for candidate resumes', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Communication logging (audit trail)', spacing: { after: 200 } }),

                new Paragraph({ text: '5.2 Phase 2 Scope (Post-MVP)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Future Enhancements:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Client Portal (read-only view, filtered to hide exits/internal data)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Multi-tenancy architecture (support multiple staffing companies)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Automated billing integration (JIRA timesheet imports)', spacing: { after: 50 } }),
                new Paragraph({ text: '• SOW PDF auto-generation with templates', spacing: { after: 50 } }),
                new Paragraph({ text: '• Email automation (auto-send profiles to client)', spacing: { after: 50 } }),
                new Paragraph({ text: '• AI-driven features:', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Resume parsing and standardization', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Candidate-to-JD matching scores', spacing: { after: 50 } }),
                new Paragraph({ text: '  - AI chatbot for initial candidate screening', spacing: { after: 50 } }),
                new Paragraph({ text: '• Job portal integrations (Naukri, LinkedIn)', spacing: { after: 300 } }),

                new Paragraph({ text: '5.3 Explicit Out of Scope', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• Payroll processing or salary disbursement', spacing: { after: 50 } }),
                new Paragraph({ text: '• Performance review or appraisal workflows', spacing: { after: 50 } }),
                new Paragraph({ text: '• Attendance tracking or leave management', spacing: { after: 50 } }),
                new Paragraph({ text: '• Client project management (beyond resource assignment)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Internal employee management (system is for client-facing resources only)', spacing: { after: 300 } }),

                // 6. Assumptions & Dependencies
                new Paragraph({ text: '6. Assumptions & Dependencies', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '6.1 Assumptions', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• All users have desktop/laptop access (mobile-responsive but desktop-first design)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Users have stable internet connection', spacing: { after: 50 } }),
                new Paragraph({ text: '• Single client in Phase 1 (multi-client architecture prepared for Phase 2)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Billing reconciliation done manually in Phase 1 (JIRA integration in Phase 2)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Email to clients sent via manual copy-paste in Phase 1 (automation in Phase 2)', spacing: { after: 50 } }),
                new Paragraph({ text: '• SOW documents created manually in Phase 1 (PDF generation in Phase 2)', spacing: { after: 200 } }),

                new Paragraph({ text: '6.2 Dependencies', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• Cloud database infrastructure setup (PostgreSQL)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Authentication service configuration', spacing: { after: 50 } }),
                new Paragraph({ text: '• File storage service for resume uploads', spacing: { after: 50 } }),
                new Paragraph({ text: '• HR team availability for user acceptance testing', spacing: { after: 50 } }),
                new Paragraph({ text: '• Existing job profile data migration from Excel', spacing: { after: 300 } }),

                // 7. Success Criteria
                new Paragraph({ text: '7. Success Criteria & Metrics', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '7.1 Acceptance Criteria', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Phase 1 is considered complete when:', bold: true, spacing: { after: 100 } }),
                new Paragraph({ text: '• All user stories (US-001 through US-010) are testable and pass acceptance criteria', spacing: { after: 50 } }),
                new Paragraph({ text: '• HR team successfully creates 10 test resource requests end-to-end (new → onboarded)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin successfully processes 5 test exits with backfill creation', spacing: { after: 50 } }),
                new Paragraph({ text: '• Dashboard loads in under 2 seconds with 100+ test records', spacing: { after: 50 } }),
                new Paragraph({ text: '• All 21 candidate fields are editable and data persists correctly', spacing: { after: 50 } }),
                new Paragraph({ text: '• File uploads (resumes) tested with PDF and DOCX formats', spacing: { after: 50 } }),
                new Paragraph({ text: '• System deployed to production environment and accessible to HR team', spacing: { after: 200 } }),

                new Paragraph({ text: '7.2 Business Metrics (Post-Launch)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Within 1 Month of Deployment:', bold: true, spacing: { after: 100 } }),
                new Paragraph({ text: '• 100% of new resource requests created in RMS (zero Excel usage)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Profile retrieval time reduced from ~5 minutes to <10 seconds (measured from admin user feedback)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Zero role naming inconsistencies (measured by absence of duplicate/variant role names)', spacing: { after: 50 } }),
                new Paragraph({ text: '• HR team satisfaction score ≥ 4.0/5.0 (measured via post-deployment survey)', spacing: { after: 200 } }),

                new Paragraph({ text: 'Within 3 Months of Deployment:', bold: true, spacing: { after: 100 } }),
                new Paragraph({ text: '• Average time to onboard reduced by 20% (measured from request creation to onboarding date)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Admin workload reduced by 30% (measured by hours spent on manual tasks)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Communication audit trail used successfully in 5+ client escalations', spacing: { after: 300 } }),

                // Final section
                new Paragraph({ text: '8. Document Approval & Sign-Off', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({
                    text: 'This PRD must be reviewed and approved by key stakeholders before proceeding to technical design and implementation.',
                    spacing: { after: 200 }
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: 'Role', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Approval Status', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Date', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Comments', bold: true })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Product Sponsor')] }),
                                new TableCell({ children: [new Paragraph('Pending')] }),
                                new TableCell({ children: [new Paragraph('')] }),
                                new TableCell({ children: [new Paragraph('')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Technical Manager')] }),
                                new TableCell({ children: [new Paragraph('Pending')] }),
                                new TableCell({ children: [new Paragraph('')] }),
                                new TableCell({ children: [new Paragraph('')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('HR & Talent Acquisition Lead')] }),
                                new TableCell({ children: [new Paragraph('Pending')] }),
                                new TableCell({ children: [new Paragraph('')] }),
                                new TableCell({ children: [new Paragraph('')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Development Team Lead')] }),
                                new TableCell({ children: [new Paragraph('Pending')] }),
                                new TableCell({ children: [new Paragraph('')] }),
                                new TableCell({ children: [new Paragraph('')] })
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: '', spacing: { after: 400 } }),

                new Paragraph({
                    text: '--- END OF DOCUMENT ---',
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 200 }
                }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'Next Steps: ', bold: true }),
                        new TextRun('Upon PRD approval, proceed to Technical Requirements Document (TRD) creation, followed by feature mapping and implementation planning.')
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200, before: 200 }
                })
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync('RMS_PRD_Final.docx', buffer);
    console.log('✅ Professional PRD generated: RMS_PRD_Final.docx');
}

generateConsolidatedPRD().catch(console.error);
