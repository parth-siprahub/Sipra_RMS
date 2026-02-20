const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const fs = require('fs');

async function generateFunctionalReqs() {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: 'RMS - Functional Requirements', heading: HeadingLevel.TITLE, spacing: { after: 400 } }),

                // 3. Functional Requirements
                new Paragraph({ text: '3. Functional Requirements', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

                // 3.1 Dashboard
                new Paragraph({ text: '3.1 Dashboard', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: 'Landing page after login showing key metrics and visualizations.', spacing: { after: 100 } }),

                new Paragraph({ text: 'Requirements:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Display total resource requests (overall count)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Show onboarded resources count (Status = "Onboarded")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Show awaiting onboarding count (Status = "With Client")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Show "To Be Shared" count (Status = "With Admin")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Role-wise breakdown with counts (e.g., AWS Engineer: 2, Business Analyst: 21)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Technology-wise distribution (chart/graph)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Filter by status (All, Onboarded, Exit, etc.)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Utilization metrics graph', spacing: { after: 50 } }),
                new Paragraph({ text: '• Attrition rate trend', spacing: { after: 50 } }),
                new Paragraph({ text: '• Average time to onboard metric', spacing: { after: 300 } }),

                // 3.2 Job Profile Management
                new Paragraph({ text: '3.2 Job Profile Management', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    text: 'Pre-defined job profiles ensure consistent role naming and capture billing rates. Job profiles are client-specific (Phase 1: single client; Phase 2: multi-client).',
                    spacing: { after: 100 }
                }),

                new Paragraph({ text: 'Job Profile Fields:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Role/Designation (e.g., "Backend Node.js Developer")', spacing: { after: 50 } }),
                new Paragraph({ text: '• Job Description (JD) - text field or attached PDF', spacing: { after: 50 } }),
                new Paragraph({ text: '• Primary Skills (e.g., Node.js, Express.js)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Secondary Skills (e.g., Docker, AWS)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Experience Level: Junior/Mid/Senior', spacing: { after: 50 } }),
                new Paragraph({ text: '• Billing Rate (per hour/month)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Client (for multi-client Phase 2 - defaults to SipraHub client in Phase 1)', spacing: { after: 200 } }),

                new Paragraph({ text: 'User Stories:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• As an Admin, I can create/edit/delete job profiles', spacing: { after: 50 } }),
                new Paragraph({ text: '• As a Back Office user, I can view available job profiles when creating requests', spacing: { after: 50 } }),
                new Paragraph({ text: '• System prevents duplicate role names (validation on save)', spacing: { after: 300 } }),

                // 3.3 Resource Request Creation
                new Paragraph({ text: '3.3 Resource Request Creation', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    text: 'Creating a formal resource request initiates the entire lifecycle. Each request gets a unique ID and can have multiple positions (each with its own SOW).',
                    spacing: { after: 100 }
                }),

                new Paragraph({ text: 'Request Fields:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• Request ID (auto-generated, format: R001, R002, etc.)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Request Date (auto-captured)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Client (dropdown - Phase 1: defaults to current client)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Project (optional text field - some clients don\'t share project names)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Job Profile (dropdown selection - prevents typing errors)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Number of Positions (e.g., 5 Oracle Developers = 5 separate Request IDs/SOWs)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Priority Level: Urgent/High/Medium/Low', spacing: { after: 50 } }),
                new Paragraph({ text: '• Request Source: Email/Chat/Meeting (with reference field for email ID or chat link)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Status: Initially set to "New"', spacing: { after: 50 } }),
                new Paragraph({ text: '• Type: "New" or "Backfill" (auto-set based on context)', spacing: { after: 200 } }),

                new Paragraph({ text: 'Workflow:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '1. Back Office or Admin creates request', spacing: { after: 50 } }),
                new Paragraph({ text: '2. System generates unique Request ID(s) - one per position', spacing: { after: 50 } }),
                new Paragraph({ text: '3. SOW generation triggered (manual in Phase 1 - button to "Generate SOW", system creates SOW record linked to request)', spacing: { after: 50 } }),
                new Paragraph({ text: '4. Request appears in "New" status in dashboard', spacing: { after: 50 } }),
                new Paragraph({ text: '5. Recruiter can start sourcing candidates for this request', spacing: { after: 300 } }),

                // 3.4 Recruiter Pipeline Management (The Big One)
                new Paragraph({ text: '3.4 Recruiter Pipeline Management', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'CRITICAL: ', bold: true, color: 'FF0000' }),
                        new TextRun('This is the core workflow for "With Back Office" status. HR team must be able to track vendor sourcing, interviews, and candidate progression WITHOUT leaving the RMS.')
                    ],
                    spacing: { after: 200 }
                }),

                new Paragraph({ text: 'Candidate Record Fields (21 Total):', bold: true, spacing: { after: 50 } }),

                // Create detailed table for candidate fields
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: 'Field Name', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Type', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Required', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Notes', bold: true })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Owner')] }),
                                new TableCell({ children: [new Paragraph('Dropdown (Recruiter list)')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('Nilesh, Hareesh, Sridhar, etc.')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Date')] }),
                                new TableCell({ children: [new Paragraph('Date (auto-capture)')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('Date candidate added')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Vendor')] }),
                                new TableCell({ children: [new Paragraph('Text/Dropdown')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('WRS, GFM, Bytesfor Solutions, Palyon HR, Internal, etc.')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Interview Date')] }),
                                new TableCell({ children: [new Paragraph('Date')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Scheduled interview date')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Time')] }),
                                new TableCell({ children: [new Paragraph('Time')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Interview time')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Candidate Status')] }),
                                new TableCell({ children: [new Paragraph('Dropdown')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('L1 Reject, L2 Reject, Screen Reject, L1 Scheduled, L2 Scheduled, Screen Select, Selected, Duplicate, Interview to be scheduled')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Skill')] }),
                                new TableCell({ children: [new Paragraph('Text')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('Primary skill (e.g., Node.js, DBA, Frontend)')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Candidate Name')] }),
                                new TableCell({ children: [new Paragraph('Text')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('Full name')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Contact Number')] }),
                                new TableCell({ children: [new Paragraph('Text (phone)')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('10-digit mobile')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Email ID')] }),
                                new TableCell({ children: [new Paragraph('Email')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('Candidate email')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Total Exp')] }),
                                new TableCell({ children: [new Paragraph('Number (years)')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('Total years of experience')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Relevant Exp')] }),
                                new TableCell({ children: [new Paragraph('Number (years)')] }),
                                new TableCell({ children: [new Paragraph('Yes')] }),
                                new TableCell({ children: [new Paragraph('Experience in specific skill')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Current Company')] }),
                                new TableCell({ children: [new Paragraph('Text')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Current employer')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Current CTC')] }),
                                new TableCell({ children: [new Paragraph('Number (INR)')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Annual salary')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Expected CTC (Fixed + Variable)')] }),
                                new TableCell({ children: [new Paragraph('Number (INR)')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Expected annual salary')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Current Location')] }),
                                new TableCell({ children: [new Paragraph('Text')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('City/State')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Work Location')] }),
                                new TableCell({ children: [new Paragraph('Text')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Preferred work location')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Notice Period')] }),
                                new TableCell({ children: [new Paragraph('Text')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Days (e.g., "30 days", "Immediate")')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Remarks')] }),
                                new TableCell({ children: [new Paragraph('Text (multi-line)')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Any additional notes')] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Invite States')] }),
                                new TableCell({ children: [new Paragraph('Text')] }),
                                new TableCell({ children: [new Paragraph('No')] }),
                                new TableCell({ children: [new Paragraph('Interview invite status')] })
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: '', spacing: { after: 200 } }),

                new Paragraph({ text: 'Key Workflows:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '1. Recruiter selects a Request ID (Status = "New" or "With Back Office")', spacing: { after: 50 } }),
                new Paragraph({ text: '2. Click "Add Candidate" to create a candidate record linked to the request', spacing: { after: 50 } }),
                new Paragraph({ text: '3. Fill in candidate details (21 fields above)', spacing: { after: 50 } }),
                new Paragraph({ text: '4. Attach candidate resume (PDF/DOCX upload)', spacing: { after: 50 } }),
                new Paragraph({ text: '5. Update "Candidate Status" as interviews progress (L1 Scheduled → L1 Reject/Select → L2 Scheduled → Selected)', spacing: { after: 50 } }),
                new Paragraph({ text: '6. When candidate reaches "Selected" status, recruiter converts profile to SipraHub standard template (manual Word doc edit in Phase 1; LLM in Phase 2)', spacing: { after: 50 } }),
                new Paragraph({ text: '7. Update Request status to "With Admin" to signal admin review', spacing: { after: 200 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: 'MUST ALLOW EDITS: ', bold: true }),
                        new TextRun('HR team emphasized they must be able to edit all candidate field values at any time (e.g., update interview date, change vendor name, correct CTC).')
                    ],
                    spacing: { after: 300 }
                }),

                // 3.5 Admin Review & Client Submission
                new Paragraph({ text: '3.5 Admin Review & Client Submission', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    text: 'Admin performs final validation before sending profiles to the client. This is a quality gate to ensure email addresses work, profiles are properly formatted, and all requirements are met.',
                    spacing: { after: 100 }
                }),

                new Paragraph({ text: 'Admin Workflow:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '1. View all requests with Status = "With Admin"', spacing: { after: 50 } }),
                new Paragraph({ text: '2. Click on a request to view candidate details', spacing: { after: 50 } }),
                new Paragraph({ text: '3. Download attached candidate profile', spacing: { after: 50 } }),
                new Paragraph({ text: '4. Validation Checklist (system shows checkboxes):', spacing: { after: 50 } }),
                new Paragraph({ text: '   - SipraHub email created and verified', spacing: { after: 50 } }),
                new Paragraph({ text: '   - Profile format matches SipraHub template', spacing: { after: 50 } }),
                new Paragraph({ text: '   - Experience requirements met per Job Profile', spacing: { after: 50 } }),
                new Paragraph({ text: '   - All mandatory candidate fields filled', spacing: { after: 50 } }),
                new Paragraph({ text: '5. If validation fails, admin can reject back to "With Back Office" with reason', spacing: { after: 50 } }),
                new Paragraph({ text: '6. If validation passes, admin clicks "Send to Client"', spacing: { after: 200 } }),

                new Paragraph({ text: 'Client Submission Actions:', bold: true, spacing: { after: 50 } }),
                new Paragraph({ text: '• System generates email with:', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Request ID, Role, Candidate name in subject line', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Email body includes summary (request details, SOW reference)', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Candidate profile attached as PDF/DOCX', spacing: { after: 50 } }),
                new Paragraph({ text: '  - Recipients: Client POCs from Client Management (comma-separated email list)', spacing: { after: 50 } }),
                new Paragraph({ text: '• Email sent via configured SMTP (Phase 1: manual copy-paste; Phase 2: auto-send)', spacing: { after: 50 } })
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync('RMS_PRD_FunctionalReqs.docx', buffer);
    console.log('Functional Requirements generated: RMS_PRD_FunctionalReqs.docx');
}

generateFunctionalReqs().catch(console.error);
