# SipraHub RMS — Resource Management System

> End-to-end recruitment pipeline tracker for internal staffing operations — from SOW creation through candidate onboarding, timesheet validation, and billing.

---

## What It Does

SipraHub RMS replaces spreadsheets and email threads with a single system of record for the entire staffing lifecycle:

| Flow | Description |
|---|---|
| **SOWs** | Create and track Statements of Work with client, billing, and resource caps |
| **Job Profiles** | Define roles, technologies, and JD attachments per SOW |
| **Resource Requests** | Raise hiring requests linked to job profiles with priority and backfill flags |
| **Candidates** | Full pipeline from sourcing → screening → interviews → onboarded |
| **Vendors** | Manage external vendor relationships and their candidate submissions |
| **Employees** | Track active headcount, exit dates, and billing assignments |
| **Timesheets** | Ingest Jira + AWS ActiveTrack data and compare billable hours |
| **Reports** | Monthly billing comparison dashboard with drill-down per employee |
| **Billing Config** | Set billable hours and working days per client per month |

---

## Architecture

```
┌─────────────────────────────────────┐
│           Azure VM (Ubuntu)          │
│                                     │
│  ┌──────────────┐  ┌─────────────┐  │
│  │   Nginx      │  │    PM2      │  │
│  │ (reverse     │  │  process    │  │
│  │  proxy)      │  │  manager    │  │
│  └──────┬───────┘  └──────┬──────┘  │
│         │                 │         │
│  ┌──────▼───────┐  ┌──────▼──────┐  │
│  │  React/Vite  │  │   FastAPI   │  │
│  │  dist/       │  │  :8000      │  │
│  │  (static)    │  │             │  │
│  └──────────────┘  └──────┬──────┘  │
└─────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │  (PostgreSQL)   │
                    │  + Auth (JWT)   │
                    └─────────────────┘
```

**Frontend:** React 18 + TypeScript + Vite + Recharts + Tailwind design tokens  
**Backend:** FastAPI + Python 3.11 + Supabase Python SDK  
**Database:** Supabase (PostgreSQL) with Row Level Security  
**Auth:** Supabase JWT — role-based (admin, hr, vendor)  
**Process Manager:** PM2 on Azure VM  
**Reverse Proxy:** Nginx

---

## Key Features

### Candidate Pipeline (Kanban + Table)
- Drag-and-drop kanban board with enforced sequential stage transitions
- Pipeline stages: New → Screening → L1 → L2 → Selected → Admin → Client → Submitted → Onboarded
- Exit workflow with confirmation modal, editable exit date, and LWD tracking
- Revert exit — restore a candidate back to any pipeline stage with confirmation
- Editable candidate info (name, phone, company, experience, skills) directly in details modal
- Duplicate candidate detection on creation
- Resume upload + L1/L2 feedback file attachments
- Communication log per candidate

### Timesheets & Billing
- Jira + AWS ActiveTrack data ingestion (Excel upload)
- Side-by-side comparison: Jira hours vs AWS hours vs billable hours
- Traffic-light flagging: green / yellow / red / no_aws per employee
- Monthly billing config (billable hours + working days) per client
- Drill-down modal per employee showing day-by-day breakdown
- CSV export of comparison reports

### Dashboard
- KPI cards: total candidates, active pipeline, onboarded, vendors
- Pipeline funnel chart (Recharts)
- Stage distribution breakdown
- Recent activity feed

### Security (Production-hardened)
- SecurityHeadersMiddleware — X-Frame-Options, CSP, X-Content-Type-Options
- SlowAPI rate limiting (global + per-route)
- CORS locked to explicit origins
- Supabase JWT verification on every request
- Role-based access: admin sees everything, vendors see their own candidates only
- Structured JSON logging with request correlation IDs

---

## Project Structure

```
RMS/
├── backend/
│   └── app/
│       ├── main.py               # FastAPI app, middleware, router registration
│       ├── config.py             # Settings (Supabase URL, keys, CORS origins)
│       ├── database.py           # Supabase client factory
│       ├── auth/                 # JWT verification, login endpoint
│       ├── candidates/           # Pipeline CRUD, exit, revert, resume upload
│       ├── sows/                 # Statement of Work management
│       ├── job_profiles/         # Role definitions + JD generation
│       ├── resource_requests/    # Hiring requests linked to job profiles
│       ├── vendors/              # Vendor management
│       ├── employees/            # Headcount, exit sync
│       ├── timesheets/           # Jira + AWS ingestion, comparison
│       ├── reports/              # Monthly billing comparison
│       ├── billing_config/       # Billable hours config per client/month
│       ├── billing/              # Billing calculations
│       ├── dashboard/            # Aggregated KPI and pipeline stats
│       ├── exports/              # CSV export endpoints
│       ├── audit/                # Audit trail
│       └── communication_logs/   # Candidate interaction logs
│
└── frontend/
    └── src/
        ├── api/                  # Typed API clients (one per domain)
        ├── pages/                # Route-level page components
        ├── components/
        │   ├── ui/               # Shared: Modal, StatusBadge, Skeleton, etc.
        │   ├── dashboard/        # KPICard, OverviewTab, charts
        │   ├── sows/             # SowModal
        │   └── timesheets/       # Drill-down modals, calendar
        ├── context/              # AuthContext (Supabase session)
        ├── lib/                  # Utilities: cn(), formatPersonName()
        └── index.css             # Design tokens (CSS variables)
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project (get URL + anon key + service role key + JWT secret)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET

# Run dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (must include /api — matches FastAPI API_PREFIX and Nginx)
echo "VITE_API_URL=http://localhost:8000/api" > .env

# Run dev server
npm run dev
# → http://localhost:5173
```

### Environment Variables

**Backend `.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend `.env`**
```env
VITE_API_URL=http://localhost:8000/api
```

Production (same origin behind Nginx):

```env
VITE_API_URL=https://rms.siprahub.com/api
```

---

## Deployment (Azure VM)

The app runs on an Azure Ubuntu VM behind Nginx.

### First-time setup

```bash
# Clone repo
git clone https://github.com/Siprahub-Org/RMS.git
cd RMS

# Backend — install deps and start with PM2
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pm2 start "venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000" --name rms-backend

# Frontend — build and serve
cd ../frontend
npm install
npm run build
# Nginx serves the dist/ folder — configure root to point here
```

### Updating (subsequent deploys)

```bash
cd ~/RMS
git pull origin master
cd frontend && npm run build && cd ..
pm2 restart rms-backend
pm2 status
```

### Nginx config

Use **`frontend/nginx.conf`**: a single **`location ^~ /api/`** proxies all methods (GET, PATCH, etc.) to FastAPI at `http://127.0.0.1:8000/api/`. The SPA uses **`location /`** + `try_files` only for non-API paths.

**405 on PATCH (fixed by this layout):** requests like `/sows/...` that never hit `/api/` used to fall through to the static/SPA handler, where only GET/HEAD are allowed. The frontend and backend now standardize on **`/api/...`**, so writes always hit the proxy.

**Health checks:** liveness is **`GET /api/health`** (through Nginx or directly on port 8000). Readiness: **`GET /api/ready`**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite 7 |
| Styling | CSS custom properties (design tokens) |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router v6 |
| Toasts | React Hot Toast |
| Excel parsing | xlsx (SheetJS) |
| Backend framework | FastAPI 0.128 |
| Python runtime | Python 3.11 |
| ORM / DB client | Supabase Python SDK + postgrest-py |
| Auth | Supabase GoTrue (JWT) |
| Rate limiting | SlowAPI |
| Data validation | Pydantic v2 |
| Excel processing | pandas + openpyxl |
| Process manager | PM2 |
| Database | Supabase (PostgreSQL) |
| File storage | Supabase Storage |
| Hosting | Azure VM (Ubuntu) + Nginx |

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full access — all pages, all data, billing config |
| `hr` | Candidates, pipeline, timesheets, reports |
| `vendor` | Own candidates only — submit and track status |

Billing config edits are additionally restricted to a named allowlist (finance leads).

---

## API Overview

All HTTP routes live under **`/api/`** (see `backend/app/main.py` `API_PREFIX`). Requests require a valid Supabase JWT in the `Authorization: Bearer` header unless noted.

```
GET/POST    /api/candidates/
PATCH       /api/candidates/{id}/review          # Status transition
PATCH       /api/candidates/{id}/exit            # Exit with LWD + reason
PATCH       /api/candidates/{id}/revert-exit     # Undo exit

GET/POST    /api/sows/
GET/POST    /api/requests/
GET/POST    /api/job-profiles/
GET/POST    /api/vendors/
GET/POST    /api/employees/

POST        /api/timesheets/...                # Jira/AWS ingest (see OpenAPI)
GET         /api/timesheets/...                # comparison, etc.

GET         /api/dashboard/...                 # KPIs + pipeline stats
GET         /api/reports/...
POST        /api/reports/...

GET/POST    /api/billing-config/
GET         /api/exports/...
```

Full interactive docs (non-production `ENVIRONMENT`): `http://localhost:8000/api/docs` (Swagger UI).

---

## Live

**Production:** [rms.siprahub.com](https://rms.siprahub.com)

---

*Built for SipraHub internal operations.*
