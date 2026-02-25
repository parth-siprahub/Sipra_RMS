# 📋 RMS SipraHub: Core System Flow & Architecture Guide

This guide provides a comprehensive overview of the **Resource Management System (RMS) SipraHub** architecture, data flow, and standard operating procedures for development and presentation.

---

## 🏗️ 1. Technical Architecture
The system follows a modern decoupled architecture:

*   **Frontend**: React (v19) + TypeScript + Vite.
    *   **Styling**: Vanilla CSS with a centralized Design System (`design-tokens.css`).
    *   **State**: React Context (Auth) + Local Component State.
    *   **Icons**: Lucide-React.
    *   **Charts**: Recharts.
*   **Backend**: Python 3.11 + FastAPI.
    *   **Server**: Uvicorn.
    *   **Validation**: Pydantic v2.
    *   **ORM**: Supabase-py (PostgREST thin client).
*   **Database & Auth**: Supabase.
    *   **Storage**: Supabase Buckets (for Resumes).
    *   **Auth**: JWT-based authentication.

---

## 🔄 2. Core Functional Flow

### Phase A: Foundation (Setup)
Before managing candidates, the foundation data must exist:
1.  **SOW Management**: Define client contracts, resource limits, and date ranges.
2.  **Job Profiles**: Standardize roles (e.g., "React Developer") and required technologies.

### Phase B: Resource Request Generation
1.  A manager creates a **Resource Request**.
2.  The request links to a specific **SOW** (deducting capacity) and a **Job Profile**.
3.  The request is assigned a unique tracking ID: `REQ-YYYYMMDD-XXX`.

### Phase C: Candidate Intake & Pipeline
1.  Recruiters add **Candidates** to specific requests.
2.  **Resume Upload**: Files are stored securely in Supabase Storage; the URL is saved to the candidate record.
3.  **Kanban Flow**: Candidates transition through stages:
    *   `NEW` → `ADMIN REVIEW` → `CLIENT INTERVIEW` → `SELECTED` → `ONBOARDED`.

### Phase D: Communication & Audit
*   Every interaction (Email, Call, Meeting) is logged in the **Communication History**.
*   This provides a 360-degree audit trail for every candidate and request.

---

## 🔑 3. Authentication & Security
*   **Verification**: The backend uses an `OAuth2PasswordBearer` dependency.
*   **Authorization**: Roles (`ADMIN` vs `RECRUITER`) are stored in the `profiles` table.
*   **Admin Guards**: Critical operations like creating SOWs or Job Profiles require the `require_admin` dependency.

---

## 🛠️ 4. Debugging & Maintenance
*   **Backend Logs**: Watch the `uvicorn` terminal for SQL errors or 401/403 issues.
*   **Frontend Network**: Check the `Fetch` calls. Note: All collection endpoints end with a `/` to avoid FastAPI 307 redirects.
*   **Database**: Access the Supabase Dashboard to manually inspect the `profiles`, `candidates`, or `sows` tables.

---

## 🚀 5. Quick Start Commands
*   **Backend**: `.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000`
*   **Frontend**: `npm run dev` (Runs on port 5173)
*   **Database Sync/Seed**: `python scripts/seed.py`
