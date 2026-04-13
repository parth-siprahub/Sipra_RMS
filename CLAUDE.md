# SipraHub RMS — Claude Code Project Brief

## Project Overview
SipraHub RMS is a Resource Management System (recruitment pipeline tracker) built for internal staffing operations. It tracks SOWs → Job Profiles → Resource Requests → Candidates → Vendors.

## Architecture
- **Frontend:** React + TypeScript, Vite, Recharts for charts, Tailwind-like design tokens in CSS
- **Backend:** FastAPI + Python, Supabase (PostgreSQL) as the database
- **Auth:** Supabase JWT auth, role-based (admin, hr, vendor)
- **Dev servers:** Frontend on `localhost:5173`, API on `localhost:8000/api` (FastAPI `API_PREFIX`; `VITE_API_URL` must include `/api`)

## Stack Specifics
- Frontend source: `D:\RMS_Siprahub\frontend\src\`
- Backend source: `D:\RMS_Siprahub\backend\app\`
- API client: `frontend/src/api/client.ts` — all API calls go through here
- Design tokens: `frontend/src/index.css` — CSS variables (--cta, --text, --surface, etc.)
- Charts: **Recharts** — already installed, use this for all new charts

## Key Pages & Files
| Page | File |
|---|---|
| Dashboard | `frontend/src/pages/Dashboard.tsx` |
| Candidates | `frontend/src/pages/Candidates.tsx` |
| Resource Requests | `frontend/src/pages/ResourceRequests.tsx` |
| SOWs | `frontend/src/pages/SOWs.tsx` |
| Dashboard API | `backend/app/dashboard/router.py` |
| Candidates API | `backend/app/candidates/` |

## Coding Standards
- Use `cmd /c` for all shell commands (Windows environment)
- All imports must use existing design tokens (`.card`, `.btn`, `.input-field`, `.input-label`)
- Never use hardcoded colors — use CSS variables (`var(--cta)`, `var(--text)`, etc.)
- TypeScript strict mode — no `any` types without justification
- Async/await for all API calls

## Skills & Rules
- Skills directory: `D:\RMS_Siprahub\.agent\skills\`
- Read `ui-ux-pro-max/SKILL.md` before any UI work
- Read `frontend-design/SKILL.md` for component patterns
- Read `systematic-debugging/SKILL.md` before any bug fix

## Current Implementation Plan
Location: `C:\Users\parth\.gemini\antigravity\brain\7c0511d8-475a-4022-a356-34b63a60d4db\implementation_plan.md`

**Always read the implementation plan before making changes.**

## Running the App
```bash
# Backend
cd D:\RMS_Siprahub\backend
cmd /c venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Frontend  
cd D:\RMS_Siprahub\frontend
cmd /c npm run dev
```

## Do NOT
- Touch any GitHub/git operations unless explicitly asked
- Modify Supabase schema without running SQL in Supabase dashboard first
- Use `npm install` for new libraries without confirming with user
- Hardcode any data — always connect to backend APIs
