# MVP Final Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Complete all remaining MVP modules (SOW, Job Profiles, Communication Logs), integrate live dashboard analytics, and ensure 100% E2E verification by today.

**Architecture:** Frontend React components consuming established FastAPI routers. All state managed via standardized API client.
**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide, Recharts (for analytics).

---

### Phase 1: Core Module Completion (The Functional Gaps)

#### Task 1: SOW (Statement of Work) Module
- **Frontend API:** Create `frontend/src/api/sows.ts`.
- **Logic:** Build `SowTable` and `SowModal` in `frontend/src/pages/Sows.tsx`.
- **Integration:** Wire to `App.tsx`.

#### Task 2: Job Profiles Module
- **Frontend API:** Create `frontend/src/api/jobProfiles.ts`.
- **Logic:** Build `JobProfileTable` and `JobProfileModal` in `frontend/src/pages/JobProfiles.tsx`.
- **Integration:** Wire to `App.tsx`.

#### Task 3: Communication Logs Module
- **Frontend API:** Create `frontend/src/api/communicationLogs.ts`.
- **Logic:** Build `LogList` and `LogModal` in `frontend/src/pages/CommunicationLogs.tsx`.
- **Integration:** Wire to `App.tsx`.

---

### Phase 2: Intelligence & Visuals

#### Task 4: Resume Parsing UI
- **Logic:** Update `CandidateModal.tsx` to include a file upload field for Resumes.
- **Integration:** Connect to `/candidates/resume/upload` endpoint.

#### Task 5: Live Dashboard & Analytics
- **Logic:** Replace placeholders in `Dashboard.tsx` with `Recharts` (Bar/Pie) for Resource Request priority distribution and Candidate pipeline status.
- **Data:** Ensure `api.get('/dashboard/metrics')` is fully utilized.

---

### Phase 3: Verification & Polish

#### Task 6: Comprehensive E2E Run
- **Modify:** `e2e-verify.cjs` to include navigation and CRUD testing for ALL new modules.
- **Final Action:** Run verification, generate final screenshot pack, and cleanup log files.

---

**Execution Choice:** Subagent-Driven (this session) is RECOMMENDED to hit today's deadline.
