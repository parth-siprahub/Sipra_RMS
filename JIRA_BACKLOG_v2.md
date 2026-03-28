# RMS Project Backlog: Roadmap & Feature Tracking (v2)

## 1. Completed Milestones (Production Ready)

| ID | Category | Requirement | Priority | Status |
|:---|:---|:---|:---|:---|
| AUTH-001 | Security | User Login via Supabase Auth | High | ✅ |
| AUTH-002 | Security | RBAC (Admin, Recruiter, Management) | High | ✅ |
| JOB-001 | Masters | Job Profile CRUD with Rich Text JD | Medium | ✅ |
| SOW-001 | Masters | SOW Entry with Job Profile Linking | High | ✅ |
| REQ-001 | Workflow | Request ID Generation (REQ-YYYYMMDD-XXX) | High | ✅ |
| PIP-001 | Pipeline | 21-field Candidate intake form | Medium | ✅ |
| PIP-002 | Pipeline | Kanban View with Drag-and-Drop | Medium | ✅ |
| EXT-001 | Lifecycle | Exit Process with Automated Backfill Logic | Medium | ✅ |

## 2. Phase 2: High Priority Backlog (Target: April Release)

| ID | Category | Requirement | Priority | Status |
|:---|:---|:---|:---|:---|
| **[NEW] EMP-001** | Lifecycle | **Onboarding to Employee Registry Transition** | Critical | 🕒 |
| **[NEW] MAP-001** | Integration | **Triad Mapping Table (RMS, Client, AWS, Git, Jira)** | Critical | 🕒 |
| **INTEG-001** | Integration | **Jira (Tempo) Excel Importer (Hour Units & OOO '01')** | Critical | 🕒 |
| **BILL-001** | Finance | **Billing Cap Engine (8h/40h rules + OOO Exclusion)** | Critical | 🕒 |
| **[NEW] UTIL-001** | Admin | **Generic Excel Processor (Parses Daily Date-wise Columns)** | High | 🕒 |
| **[NEW] DASH-011** | Analytics | **Attendance Compliance Dashboard (Identifying OOO Gaps)** | High | 🕒 |
| MAST-002 | Masters | Client Master Table (DCLI, Internal) | High | 🕒 |
| COMP-001 | Compliance | Mandatory De-duplication (Email/Phone) | High | 🕒 |
| COMP-002 | Compliance | Candidate History & Remarks Retrieval | High | 🕒 |
| BILL-002 | Finance | Margin Analysis based on Billable Units | Medium | 🕒 |
| **[NEW] ANALY-001** | Analytics | **The "Verification Triad" (Jira vs AWS vs Git) Analysis** | Medium | 🕒 |
| INTEG-003 | Integration | Automated Jira Onboarding Sync | Medium | 🕒 |
| UI-005 | UX | Dedicated Onboarding Milestone Tracker | Low | 🕒 |
| AI-001 | Innovation | AI Resume Parsing (Feasibility Study) | Low | 🕒 |

## 3. Future Enhancements

- **Real-time API Integration**: direct sync with Tempo and AWS CloudWatch.
- **Performance Scoring Engine**: Weighted scoring based on Triad data and Manager ratings.
- **Capacity Planning**: Predicting resource needs based on SOW trends.

*Note: The April release prioritizes the integrity of the Billing & Identifier Mapping triad.*
