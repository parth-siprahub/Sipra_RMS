const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } = require('docx');
const fs = require('fs');

async function generatePRD() {
  const doc = new Document({
    sections: [{
      children: [
        // Title Page
        new Paragraph({
          text: 'Resource Management System',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: 'Product Requirements Document (PRD)',
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Version: ', bold: true }),
            new TextRun('1.0')
          ],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Date: ', bold: true }),
            new TextRun('February 16, 2026')
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Project Duration: ', bold: true }),
            new TextRun('2 Weeks (Feb 16 - March 2, 2026)')
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        }),

        // Executive Summary
        new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({
          text: 'This document outlines the requirements for building a Resource Management System (RMS) for SipraHub, a staff augmentation/body shopping organization. The system will replace the current manual Excel-based process with an automated, web-based solution to track resource requests, candidate sourcing, onboarding, and lifecycle management.',
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Key Objectives:', bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: '• Centralize resource tracking (currently 300+ resources)', spacing: { after: 50 } }),
        new Paragraph({ text: '• Streamline recruiter workflow with full pipeline visibility', spacing: { after: 50 } }),
        new Paragraph({ text: '• Eliminate data inconsistencies from manual Excel entry', spacing: { after: 50 } }),
        new Paragraph({ text: '• Enable role-based access for Back Office, Admin, and future Client portal', spacing: { after: 50 } }),
        new Paragraph({ text: '• Prepare architecture for multi-tenancy (Phase 2)', spacing: { after: 300 } }),

        // Project Overview
        new Paragraph({ text: '1. Project Overview', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        
        new Paragraph({ text: '1.1 Background', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({
          text: 'SipraHub supplies technical resources to clients (primarily AWS-related projects). The organization currently manages the entire lifecycle—from resource requests to onboarding, billing, and exits—using Excel spreadsheets across multiple tabs:',
          spacing: { after: 100 }
        }),
        new Paragraph({ text: '• Resource Data: Main tracking sheet (Request ID, Role, Status, Dates, Exit info)', spacing: { after: 50 } }),
        new Paragraph({ text: '• SOW Tracker: Links requests to Statements of Work', spacing: { after: 50 } }),
        new Paragraph({ text: '• Category Data: Master lists for roles, statuses, exit types', spacing: { after: 50 } }),
        new Paragraph({ text: '• Recruiter Pipeline: Vendor tracking, interview scheduling, candidate details (21 fields)', spacing: { after: 200 } }),

        new Paragraph({
          children: [
            new TextRun({ text: 'Pain Points:', bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: '• Role name inconsistencies (e.g., "Node JS" vs "Node.js Developer")', spacing: { after: 50 } }),
        new Paragraph({ text: '• No profile attachments - admin searches emails manually', spacing: { after: 50 } }),
        new Paragraph({ text: '• Client sees exit history in shared Excel - negative impression', spacing: { after: 50 } }),
        new Paragraph({ text: '• Manual Jira billing mapping (candidate names differ in client systems)', spacing: { after: 50 } }),
        new Paragraph({ text: '• No audit trail for who requested resources or email communications', spacing: { after: 300 } }),

        new Paragraph({ text: '1.2 Problem Statement', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({
          text: 'The manual Excel-based process is error-prone, time-consuming, and does not scale beyond 300-500 resources. HR team members must maintain separate sheets for recruiting pipelines, admins search emails for profiles, and there is no centralized system for request approval workflows or audit logs.',
          spacing: { after: 300 }
        }),

        new Paragraph({ text: '1.3 Goals & Success Metrics', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({ text: 'Primary Goals:', bold: true, spacing: { after: 100 } }),
        new Paragraph({ text: '1. Replace Excel with web-based RMS accessible to Back Office, Admin, and future Client roles', spacing: { after: 50 } }),
        new Paragraph({ text: '2. Implement full recruiter pipeline tracking with 21 candidate fields', spacing: { after: 50 } }),
        new Paragraph({ text: '3. Automate status workflows (New → Back Office → Admin → Client → Onboarded → Exit)', spacing: { after: 50 } }),
        new Paragraph({ text: '4. Enable dropdown-based Job Profile selection to prevent naming errors', spacing: { after: 50 } }),
        new Paragraph({ text: '5. Attach candidate profiles within the system for instant access', spacing: { after: 200 } }),

        new Paragraph({ text: 'Success Metrics:', bold: true, spacing: { before: 200, after: 100 } }),
        new Paragraph({ text: '• 100% of resource requests created in RMS (zero Excel dependency)', spacing: { after: 50 } }),
        new Paragraph({ text: '• <2 seconds dashboard load time for 500+ resource records', spacing: { after: 50 } }),
        new Paragraph({ text: '• Profile retrieval time reduced from ~5 minutes (email search) to <10 seconds', spacing: { after: 50 } }),
        new Paragraph({ text: '• Zero role naming inconsistencies through enforced dropdowns', spacing: { after: 300 } }),

        // Stakeholders & Roles
        new Paragraph({ text: '2. Stakeholders & Roles', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: '2.1 Project Stakeholders', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({ text: '• Senthil Natarajan - AI Operations Head, Product Sponsor', spacing: { after: 50 } }),
        new Paragraph({ text: '• Jaicind Santhibhavan - Technical Manager, Requirements Owner', spacing: { after: 50 } }),
        new Paragraph({ text: '• Sreenath Reddy - HR & Talent Acquisition Head, Primary User', spacing: { after: 50 } }),
        new Paragraph({ text: '• Parth - Developer (with Antigravity AI agents)', spacing: { after: 50 } }),
        new Paragraph({ text: '• HR Team (Nilesh, Hareesh, Sridhar) - Recruiter users', spacing: { after: 300 } }),

        new Paragraph({ text: '2.2 System User Roles', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        
        // Create table for user roles
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: 'Role', bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: 'Responsibilities', bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: 'Key Permissions', bold: true })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('Back Office (Recruiter)')] }),
                new TableCell({ children: [new Paragraph('Manage resource sourcing, vendor coordination, interview scheduling, candidate pipeline tracking')] }),
                new TableCell({ children: [new Paragraph('Create/Edit candidates, Update pipeline status, Assign owners, Schedule interviews')] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('Admin')] }),
                new TableCell({ children: [new Paragraph('Final profile validation, client submission, email creation, communication tracking')] }),
                new TableCell({ children: [new Paragraph('Review candidates, Send to client, Attach profiles, Update onboarding status')] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('Client (Phase 2)')] }),
                new TableCell({ children: [new Paragraph('View active resources, pending profiles, project assignments (read-only, hide exits/internal data)')] }),
                new TableCell({ children: [new Paragraph('Read-only access to filtered resource data')] })
              ]
            })
          ]
        }),
        
        new Paragraph({ text: '', spacing: { after: 200 } }), // Spacer
        
        new Paragraph({
          children: [
            new TextRun({ text: 'Note: ', bold: true, italics: true }),
            new TextRun({ text: 'RBAC (Role-Based Access Control) will be implemented with granular permissions. Within Back Office, there may be sub-roles (e.g., Shortlister vs Approver).', italics: true })
          ],
          spacing: { after: 300 }
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('RMS_PRD_Part1.docx', buffer);
  console.log('PRD Part 1 generated: RMS_PRD_Part1.docx');
}

generatePRD().catch(console.error);
