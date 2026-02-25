# Implementation Plan - MVP Hardening & Feature Completion

Based on the latest stakeholder call transcripts, this plan addresses the critical gaps in SOW-Resource linkage, interview feedback auditing, and transition (overlap) management.

## 1. Backend: Data Model Enhancements
### 1.1 SQL Migration (Manual Action)
*   Add L1/L2 feedback and scoring to `candidates` table.
*   Add `overlap_until` to `candidates` table.
*   Add `onboarded_count` tracking logic (optional or derived).

### 1.2 Pydantic Schema Updates
*   **Target**: `backend/app/candidates/schemas.py`
    *   Add `l1_feedback`, `l1_score`, `l2_feedback`, `l2_score`, `overlap_until` to `CandidateCreate`, `CandidateUpdate`, and `CandidateResponse`.
*   **Target**: `backend/app/resource_requests/schemas.py`
    *   Ensure `job_profile_id` and `sow_id` are strictly typed and required where applicable.

## 2. Frontend: Governance & UI Polish
### 2.1 Resource Request Governance
*   **File**: `frontend/src/pages/ResourceRequests.tsx`
    *   Update `CreateRequestModal` to fetch and display **Job Profiles** and **Active SOWs**.
    *   Validate that an SOW and Job Profile are selected before submission.
    *   Display the linked Job Profile name in the table list.

### 2.2 Interview Feedback & Audit Trail
*   **File**: `frontend/src/pages/Candidates.tsx`
    *   Implement an "Interview Details" section in the Candidate modal/board.
    *   Allow recruiters/admins to input L1/L2 feedback and numeric scores (0-10).
    *   Display feedback summary in the candidate card or a "Quick View" panel.

### 2.3 SOW Utilization & Lifecycle
*   **File**: `frontend/src/pages/Sows.tsx`
    *   Add a visual "Capacity Meter" (e.g., Progress bar) showing `current_resources / max_resources`.
    *   Implement the "Active/Inactive" filter as requested by Jaicind.
    *   Ensure SOW numbers are formatted consistently.

### 2.4 Overlap & Transition Management
*   **File**: `frontend/src/pages/Candidates.tsx`
    *   Add "Overlap Until" date selection for backfill scenarios.
    *   Highlight resources currently in the "Exit Overlap" phase.

## 3. Verification & Demo Readiness
### 3.1 E2E Test Updates
*   **File**: `e2e-verify.cjs`
    *   Add a test step to create a Resource Request with a linked SOW.
    *   Add a test step to log L1 feedback for a candidate.
### 3.2 Deployment Check
*   Verify that API calls to `/logs/`, `/sows/`, etc., are working without redirects.

---
## Approval Required
Please approve this plan to begin the backend schema and frontend governance updates.
