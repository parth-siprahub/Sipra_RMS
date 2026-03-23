# RMS: Strategic Key Requirements (v2)

## 1. Governance & Contractual Foundation
### 1.1 Statement of Work (SOW) Management
- **Master Data Integrity**: Client names must be managed via a master lookup (e.g., DCLI, Internal) to ensure reporting consistency.
- **Structural Mapping**: Every SOW must link 1:1 with a specific Job Profile to enforce technical alignment.
- **Capacity Tracking**: System must track `max_resources` per SOW and prevent over-allocation.

### 1.2 Job Profile Standards
- **Technical Specifications**: Support for comprehensive Job Descriptions (JD) including rich text and multi-page document attachments.
- **Standardization**: Profiles auto-populate Resource Request requirements (Skills, Experience Level).

## 2. Operational Pipeline (Recruitment to Onboarding)
### 2.1 Candidate Lifecycle & De-duplication
- **Unique Identification**: Mandatory validation via Email and Phone to identify returning candidates.
- **Historical Context**: Automatic retrieval of previous remarks/status for returning candidates.
- **Pipeline Realism**: Kanban stages (Recruiter → Admin → Client → Selected → Onboarded).
- **Onboarding Milestone**: "Onboarded" status triggers the formal transition to the Employee Journey.

### 2.2 Resource Request Management
- **Granular ID Generation**: Auto-generation of unique IDs (e.g., REQ-YYYYMMDD-XXX).
- **Backfill Management**: Automated linking of replacements to exited/terminated candidates.

## 3. Employee Lifecycle & Financial Controls (Phase 2)
### 3.1 The Multi-Source Mapping Triad
- **Identifier Synchronization**: To enable cross-verification, every employee must have a comprehensive mapping profile:
  - **RMS Record**: Primary Name and Internal ID.
  - **Client Identity**: Client-specific Name (e.g., "Aamir Bashir").
  - **AWS Identity**: Workspace Email/ID for activity tracking.
  - **Engagement IDs**: GitHub Username and Client Jira Username.

### 3.2 Automated Billing & Timesheet Compliance
- **Jira/Tempo Integration**: System must ingest the Monthly Time Sheet Report (`.xls`) with the following logic:
  - **Unit Processing**: Daily cell values are interpreted as **Hours** (Standard = 8.0).
  - **OOO Intelligence**: A value of **"01" (or 1.0)** specifically denotes **Out of Office** (OOO) and must be flagged as non-billable.
  - **Idempotent Imports**: Support for multiple uploads of the same month; latest file overrides previous data for that period.
- **Compliance Rules**:
  - **Capping**: Automatic capping at 8h/day and 40h/week for billing.
  - **The 75% Rule**: Minimum of 30 hours active AWS occupancy for every 40 hours logged in Jira.
- **Exit Logic**: Immediate termination of billing upon marking an `Exit` or `Termination` in the Employee registry.

### 3.3 Analytics & Performance Verification
- **Triad Comparison**: Automated reconciliation of **Jira Logged** vs. **AWS Active** vs. **GitHub Check-ins**.
- **Performance Correlation**: Integration of qualitative manager feedback with quantitative system metrics.

## 4. User Experience & Reporting
- **Feature Gating**: Role-Based Access Control (RBAC) across all modules.
- **Executive Dashboards**: Real-time visualization of hiring velocity, compliance thresholds (the Triad), and SOW burn rates.
