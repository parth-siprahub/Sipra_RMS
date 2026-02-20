const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = require('docx');
const fs = require('fs');

async function generateRemainingPRD() {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: 'RMS - Workflows & Technical Architecture', heading: HeadingLevel.TITLE, spacing: { after: 400 } }),

                // Continue from 3.6
                new Paragraph({ text: '3.6 Onboarding Management', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    text: 'Once the client approves a candidate, they send an onboarding invite. The system must capture the billing start date and update the request status.',
                    spacing: { after: 100 }
                }),

                new Paragraph({ text: 'Onboarding Fields:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Billing Start Date (captured from client onboarding email/link)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Client Email ID (the email candidate will use in client workspace)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Client Username/Jira Name (CRITICAL for billing - client-side identifier for timesheet mapping)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Status: Update to "Onboarded"', spacing: { after: 200 } }),

                new Paragraph({ text: 'Workflow:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '1. Admin receives client approval (email/notification)', spacing: { after: 50 } }),
                new Paragraph({ text: '2. Admin opens the request and clicks "Mark as Onboarded"', spacing: { after: 50 } }),
                new Paragraph({ text: '3. System prompts for: Billing Start Date, Client Email, Client Jira Name', spacing: { after: 50 } }),
                new Paragraph({ text: '4. Status changes to "Onboarded"', spacing: { after: 50 } }),
                new Paragraph({ text: '5. Resource appears in active resources dashboard', spacing: { after: 300 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'Client Rejection Handling:', bold: true })
                    ],
                    spacing: { before: 200, after: 50 }
                }),
                new Paragraph({ text: '• If client rejects (rare - 1-2 out of 300), admin captures:', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Rejection Reason (dropdown + free text)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Replacement Required? (Yes/No)', spacing: { after: 50 } }),
                new Paragraph({ text: '• If "Yes": System creates new Request ID (Type = "Backfill", Same SOW, Status = "With Back Office")', spacing: { after: 50 } }),
                new Paragraph({ text: '• If "No": Request closed (Status = "Rejected by Client")', spacing: { after: 300 } }),

                // 3.7 Exit Management
                new Paragraph({ text: '3.7 Exit Management', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    text: 'Captures when a resource\'s engagement ends, whether client-initiated or employee-initiated. Exit tracking is critical for backfill decisions and attrition analysis.',
                    spacing: { after: 100 }
                }),

                new Paragraph({ text: 'Exit Fields:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Exit Reason (dropdown):', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Customer Terminated', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Resigned', spacing: { after: 50 } }),
                new Paragraph({ text: '  - No Show', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Security Breach (zero tolerance)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Project Completion', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Performance Issues', spacing: { after: 50 } }),
                new Paragraph({ text: '• Last Working Day (date)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Replacement Required? (Yes/No)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Exit Notes (multi-line text)', spacing: { after: 200 } }),

                new Paragraph({ text: 'Workflow:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '1. Admin receives exit notification from client/employee', spacing: { after: 50 } }),
                new Paragraph({ text: '2. Admin opens the onboarded request and clicks "Process Exit"', spacing: { after: 50 } }),
                new Paragraph({ text: '3. Fill exit fields (reason, last working day, replacement decision)', spacing: { after: 50 } }),
                new Paragraph({ text: '4. Status changes to "Exit"', spacing: { after: 50 } }),
                new Paragraph({ text: '5. If replacement needed:', spacing: { after: 50 } }),
                new Paragraph({ text: '   - System creates new Request ID', spacing: { after: 50 } }),
                new Paragraph({ text: '   - Type = "Backfill", SOW = Same as exited resource', spacing: { after: 50 } }),
                new Paragraph({ text: '   - Status = "With Back Office" (sourcing starts)', spacing: { after: 50 } }),
                new Paragraph({ text: '6. Possible overlap: New resource onboarded 2-3 days before old resource exits (for knowledge transfer)', spacing: { after: 50 } }),
                new Paragraph({ text: '7. Billing end date = Last Working Day', spacing: { after: 300 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'CLIENT PORTAL CONSIDERATION: ', bold: true }),
                        new TextRun('When building the client portal (Phase 2), exit records should be HIDDEN from client view to avoid negative impression. HR mentioned high attrition is visible in current Excel shares.')
                    ],
                    spacing: { after: 400 }
                }),

                // Technical Architecture
                new Paragraph({ text: '4. Technical Architecture', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '4.1 Technology Stack', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: 'Component', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Technology', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Justification', bold: true })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Backend API')] }),
                                new TableCell({ children: [new Paragraph('Python 3.10+ with FastAPI')] }),
                                new TableCell({ children: [new Paragraph('High-performance async framework, automatic OpenAPI docs, strong typing with Pydantic')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Database')] }),
                                new TableCell({ children: [new Paragraph('PostgreSQL (via Supabase)')] }),
                                new TableCell({ children: [new Paragraph('Enterprise-grade RDBMS, Supabase provides auth, real-time, and managed hosting')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Frontend')] }),
                                new TableCell({ children: [new Paragraph('React 18+ with TypeScript, Vite')] }),
                                new TableCell({ children: [new Paragraph('Modern, fast dev server, strong typing for error prevention')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Authentication')] }),
                                new TableCell({ children: [new Paragraph('Supabase Auth + JWT')] }),
                                new TableCell({ children: [new Paragraph('Built-in auth with Supabase, row-level security')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Deployment')] }),
                                new TableCell({ children: [new Paragraph('TBD (likely Vercel for frontend, Railway/Render for backend)')] }),
                                new TableCell({ children: [new Paragraph('Fast deployment, CI/CD integration')] })
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: '', spacing: { after: 300 } }),

                new Paragraph({ text: '4.2 Database Schema Overview', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Core Tables:', bold: true, spacing: { after: 50 } }),

                new Paragraph({ text: '• users - System users (recruiters, admins, clients)', spacing: { after: 50 } }),
                new Paragraph({ text: '• roles - Role definitions for RBAC', spacing: { after: 50 } }),
                new Paragraph({ text: '• clients - Client organizations (Phase 1: single client; Phase 2: multi-client)', spacing: { after: 50 } }),
                new Paragraph({ text: '• job_profiles - Job roles with JD, skills, billing rates', spacing: { after: 50 } }),
                new Paragraph({ text: '• resource_requests - Main request table (Request ID, Client, Job Profile, Status, Type)', spacing: { after: 50 } }),
                new Paragraph({ text: '• candidates - Recruiter pipeline data (21 fields from section 3.4)', spacing: { after: 50 } }),
                new Paragraph({ text: '• onboarding_details - Billing start date, client email, Jira mapping', spacing: { after: 50 } }),
                new Paragraph({ text: '• exit_records - Exit reason, last working day, replacement flag', spacing: { after: 50 } }),
                new Paragraph({ text: '• sow_tracker - SOW records linked to requests', spacing: { after: 50 } }),
                new Paragraph({ text: '• communication_log - Audit trail for emails sent to client', spacing: { after: 50 } }),
                new Paragraph({ text: '• file_attachments - Candidate resumes, profiles, SOW PDFs', spacing: { after: 300 } }),

                new Paragraph({ text: '4.3 Security & RBAC', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• Supabase Row Level Security (RLS) policies for data isolation', spacing: { after: 50 } }),
                new Paragraph({ text: '• JWT-based authentication with role claims', spacing: { after: 50 } }),
                new Paragraph({ text: '• Permission-based access control (e.g., "can_edit_candidates", "can_send_to_client")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Audit logging for all status changes and client communications', spacing: { after: 300 } }),

                // Phase Planning
                new Paragraph({ text: '5. Phase Planning & Timeline', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '5.1 Phase 1: Core RMS (2 Weeks - Feb 16 to March 2, 2026)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Scope:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Authentication & RBAC (Back Office, Admin roles)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Dashboard with metrics', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Job Profile Management (CRUD)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Resource Request Creation', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Recruiter Pipeline (full 21-field candidate tracking)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Admin Review & Manual Client Submission (copy-paste email)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Onboarding Management', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ Exit Management with Backfill creation', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ SOW Tracker (manual entry, linked to requests)', spacing: { after: 50 } }),
                new Paragraph({ text: '✓ File upload for candidate resumes', spacing: { after: 200 } }),

                new Paragraph({ text: 'Out of Scope for Phase 1:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '✗ Client Portal (read-only view)', spacing: { after: 50 } }),
                new Paragraph({ text: '✗ Multi-tenancy (architecture prep only, single client in Phase 1)', spacing: { after: 50 } }),
                new Paragraph({ text: '✗ Automated billing (JIRA integration)', spacing: { after: 50 } }),
                new Paragraph({ text: '✗ Automated SOW generation (PDF templates)', spacing: { after: 50 } }),
                new Paragraph({ text: '✗ AI features (profile matching, chatbot screening)', spacing: { after: 50 } }),
                new Paragraph({ text: '✗ Email automation (auto-send to client)', spacing: { after: 300 } }),

                new Paragraph({ text: '5.2 Phase 2: Advanced Features (Post-MVP)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• Client Portal with filtered view (hide exits/internal data)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Multi-client architecture (tenant isolation)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Automated billing with JIRA timesheet integration', spacing: { after: 50 } }),
                new Paragraph({ text: '• SOW PDF auto-generation with templates', spacing: { after: 50 } }),
                new Paragraph({ text: '• Email automation (auto-send profiles to client)', spacing: { after: 50 } }),
                new Paragraph({ text: '• AI-driven profile matching (keyword extraction, scoring)', spacing: { after: 50 } }),
                new Paragraph({ text: '• AI chatbot screening (automated initial interviews)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Resume parsing and standardization (LLM-based)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Integration with job portals (Naukri, LinkedIn)', spacing: { after: 300 } }),

                // Non-Functional Requirements
                new Paragraph({ text: '6. Non-Functional Requirements', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '• Performance: Dashboard load time <2 seconds for 500+ records', spacing: { after: 50 } }),
                new Paragraph({ text: '• Scalability: Support up to 1000 active resource records', spacing: { after: 50 } }),
                new Paragraph({ text: '• Usability: Responsive UI (desktop focus, mobile-friendly forms)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Reliability: 99% uptime during business hours', spacing: { after: 50 } }),
                new Paragraph({ text: '• Security: Data encryption at rest and in transit, secure file uploads', spacing: { after: 50 } }),
                new Paragraph({ text: '• Maintainability: Code comments, README, API documentation (auto-generated by FastAPI)', spacing: { after: 300 } }),

                // Error Prevention
                new Paragraph({ text: '7. Error Prevention Strategy', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Based on feedback from managers (Senthil, Jaicind): ', bold: true }),
                        new TextRun('"Explicitly avoid errors encountered in previous projects."')
                    ],
                    spacing: { after: 200 }
                }),

                new Paragraph({ text: 'Git Workflow:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Use feature branches (feature/module-name)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Commit frequently with clear messages', spacing: { after: 50 } }),
                new Paragraph({ text: '• Test locally before merging to main', spacing: { after: 50 } }),
                new Paragraph({ text: '• Handle merge conflicts carefully', spacing: { after: 200 } }),

                new Paragraph({ text: 'Technical Best Practices:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Type safety: Use TypeScript (frontend) and Pydantic (backend)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Error handling: Try-catch blocks, meaningful error messages', spacing: { after: 50 } }),
                new Paragraph({ text: '• Database migrations: Use Supabase migrations, never manual schema edits', spacing: { after: 50 } }),
                new Paragraph({ text: '• Environment variables: Use .env files, never hardcode secrets', spacing: { after: 50 } }),
                new Paragraph({ text: '• Testing: Manual testing of critical flows before deployment', spacing: { after: 300 } }),

                // Appendix
                new Paragraph({ text: '8. Appendix', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                new Paragraph({ text: '8.1 Status Workflow Diagram', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'New → With Back Office → With Admin → With Client → Onboarded → Exit', spacing: { after: 50 } }),
                new Paragraph({ text: '↓                                                    ↓', spacing: { after: 50 } }),
                new Paragraph({ text: 'Rejected by Client ←-- (Replacement Required = Yes) --↻ Backfill (New Request)', spacing: { after: 300 } }),

                new Paragraph({ text: '8.2 Key Definitions', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: '• Request ID: Unique identifier for each resource position request', spacing: { after: 50 } }),
                new Paragraph({ text: '• SOW: Statement of Work - contractual document for specific role', spacing: { after: 50 } }),
                new Paragraph({ text: '• Backfill: Replacement request when an active resource exits', spacing: { after: 50 } }),
                new Paragraph({ text: '• L1/L2: Interview levels (L1 = Initial Technical, L2 = Managerial)', spacing: { after: 50 } }),
                new Paragraph({ text: '• RBAC: Role-Based Access Control', spacing: { after: 300 } }),

                new Paragraph({
                    text: '--- END OF DOCUMENT ---',
                    alignment: 1,
                    spacing: { before: 400 }
                })
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync('RMS_PRD_Part2_Architecture_Phases.docx', buffer);
    console.log('PRD Part 2 generated: RMS_PRD_Part2_Architecture_Phases.docx');
}

generateRemainingPRD().catch(console.error);
