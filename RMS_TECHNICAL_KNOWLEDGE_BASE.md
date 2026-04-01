# Resource Management System (RMS) - Technical Knowledge Base

This document serves as the holistic architectural blueprint and knowledge transfer medium for the Resource Management System (RMS). This outlines the topological routing of the application, data integrity rules, backend logic engines, and operational best practices.

---

## 1. Architectural Blueprint & Data Flow

### Topological Mapping
The RMS application follows a classic client-server architecture with a React frontend and a FastAPI backend connecting to a Supabase (PostgreSQL) data tier.

1. **Client Request (React UI)**: Operations begin at the React layer, packaged with JWT tokens.
2. **FastAPI Middleware**:
   - **CORS & SecurityHeadersMiddleware**: All incoming requests pass through robust CORS handling (restricted to specific origins) and security headers (X-Frame-Options, CSP, strictly blocked content sniffing, and HSTS for production).
   - **Rate Limiting**: `SlowAPI` monitors endpoints to prevent abuse.
   - **Request ID Correlation**: Middleware instruments every request with an `X-Request-ID` and timing metrics, feeding directly into structural JSON logs.
3. **Application Routing**: The request routes to specific domains (`/candidates`, `/billing`, etc.).
4. **Supabase Admin Client**: RMS utilizes an asymmetric client-side design. Rather than relying heavily on Supabase Row-Level Security (RLS) rules directly from the frontend, the FastAPI backend uses a singleton _Service Role Client_ (`_supabase_async_admin_client`). This bypasses PostgREST restrictions safely while allowing the backend Python code to explicitly enforce complex logic isolation (e.g., verifying a Vendor's ID against the payload).

### State Management Strategy
- **Frontend Context State (AuthContext)**: The frontend relies on React Context API (`AuthContext.tsx`). It wraps the primary object containing the token, user profile, and expiration (`TOKEN_EXPIRY_MINUTES = 55` to prevent boundary synchronization errors with the 60-minute backend validation). It handles silent logout triggers upon expiration.
- **Backend Memory State (SimpleCache)**: The FastAPI layer leverages an in-memory Time-to-Live (TTL) dictionary (`api_cache`). Responses for read-heavy operations like `/candidates` or `/dashboard` are cached using compound keys (e.g., `candidates_list_{request_id}_{candidate_status}_{page}_{page_size}`). Upon any modification (POST, PATCH), the backend implements targeted cache invalidation (`api_cache.clear_prefix("candidates_")`). This prevents redundant database calls while guaranteeing eventual consistency.

---

## 2. Database Schema & Relational Integrity

The foundational element of the RMS architecture resides in Supabase PostgreSQL databases representing the lifecycle of an asset (person).

### The Candidate to Employee Lifecycle
1. **Vendors (External Entities)**: Represented in the system with discrete IDs. External recruiter users have the role `VENDOR`.
2. **Candidates (Transient Entities)**: Candidates are tracked utilizing the `candidates` table. All records contain an `owner_id` (the person who fed the record) and optionally a `vendor_id`. A foreign key links them to a specific `Resource Request` (`request_id`).
3. **Employees (Permanent Entities)**: The end of the onboarding lifecycle converts a candidate into an `Employee`. The `employees` table houses `candidate_id` as a reference logic, ensuring continuity and permitting "Rehire Warnings" via historical crosschecks.

### Timesheet Logs and Billing Records
Given the constraints of numerical computations and the requirement for non-lossy financial metrics, exact scalar tracking is strictly enforced:
- **`jira_timesheet_raw` & `aws_timesheet_logs_v2`**: Separated the data sources representing tracking metrics.
- **Data Types**: The billing components specifically utilize `float` and `decimal` logic to track hours (e.g., 8.0, 7.5). The standard representation of a day out of office (OOO) is parsed from "01" string to a value of `1.0`, effectively skipping calculations during billing steps entirely.

---

## 3. Backend Logic & Services (The 'How-To')

### The Conversion Engine (`candidates/router.py`)
Moving a candidate requires hitting the `PATCH /{candidate_id}/review` hook.
- **Pipeline Constraints**: The engine leverages an internal sequential pipeline dictionary (`ADMIN_REVIEW_TRANSITIONS`). It guarantees an impossible jump (e.g., `NEW` to `ONBOARDED`) yields an HTTP 400. 
- **Employee Spawning**: If the user pushes a candidate into the `ONBOARDED` status, the system runs an auto-creation protocol: it reads the candidate data, parses the email for `client_name`, binds the `candidate_id`, checks if one is already created, and `INSERT`s directly into the `employees` table natively flagged as `ACTIVE`.
- **Resource Closing**: In tandem with employee creation, the engine searches the relational link and converts the associated Resource Request's status to `CLOSED`.

### The Billing Engine (`billing/engine.py`)
Billing operates on granular threshold rules:
- **8h/day & 40h/week Cap**: A custom `cap_daily_and_weekly()` iteration takes active logs and groups them by an ISO week string format (`YYYY-WNN`). Day logs are hard-capped at 8 hours. As they iterate through the week, the system sums the total. The moment the accumulator passes 40.0, any successive days in that iteration are hard-clamped relative to `max(0.0, MAX_WEEKLY_HOURS - week_capped)`.
- **The 75% AWS Compliance Rule**: A simple arithmetic boundary validation `check_75_percent_rule()`. The AWS total must be `aws_hours >= (jira_hours * 0.75)`. If it falters—or returns None because of missing data—the invoice flag marks `is_billable = False`.
- **Exit Logic**: Employees possess an `exit_date`. If processed, the engine filters the array explicitly to only keep inputs where `date <= employee_exit_date`.

### Idempotent Imports (`timesheets/parser.py` & `router.py`)
Idempotency ensures safe file re-uploads.
- **Pandas Parser**: `parser.py` consumes raw bytes using `pd.read_excel()` wrapped in a fallback block that attempts processing using the `xlrd` engine (`.xls`) followed by `openpyxl` engine (`.xlsx`). It attempts to auto-detect both the `User` columns and format target months.
- **Delete-then-Insert**: Within `router.py`, upon mapping employee names, the import performs a massive `.delete()` constraint against `billing_month == import_month` for the identified employees. Once flushed, the backend utilizes batch insert chunk operations (50 to 100 rows per batch) into the DB. This prevents accidental duplications during manual re-uploads.

---

## 4. Frontend Component Mapping

### UI to API Routing
- **Candidates Page**: Consumes `GET /candidates` utilizing the unified cache logic. Interaction features interface with `PATCH /candidates/{id}/review` and `PATCH /candidates/{id}/exit`.
- **Resource Requests & SOW**: Mapped respectively to their relative `/resource_requests` and `/sows` endpoints relying on query limitations.
- **Billing Page**: Renders compiled responses from `/billing`. It pulls dynamic calculated rows computed via the Engine layer versus raw logs, displaying warnings dependent on the `is_billable` JSON boolean return.

### AuthContext Role Operations
The React `AuthContext` exports globally accessible variables alongside checking roles via `isAdminRole()`.
- **Role Scoping**: Depending on whether the profile maps to `SUPER_ADMIN`, `ADMIN`, `MANAGER`, or `VENDOR`, local UI rendering gates administrative tabs (e.g., the global timesheet imports upload view overrides completely if not mapped as `ADMIN`).
- **Vendor Restriction Enforcement**: Beyond simple CSS/UI blocking on the frontend side, the FastAPI implementation intercepts the generated JWT header, resolves `current_user["vendor_id"]`, and manually applies an `.eq("vendor_id", vendor_id)` SQL limiter enforcing true multi-tenant privacy.

---

## 5. Operational Excellence & CI/CD

### Testing & Verification Let-Downs
- **Primary Assertions**: The testing apparatus focuses directly on the business logic edge cases. The primary entry point for Pytest lies in `backend/tests/test_billing_engine.py`, which validates the week-capping algorithms, and `test_defaulter_detection.py` and `test_duplicate_hire.py` executing verification tests to ensure system stability.

### The Triad Mapping Automation
To streamline cross-platform unification, the internal system requires mapping three disjoint IDs to one centralized `employee_id`:
- **AWS Email, GitHub ID, Jira Username**.
- The `EmployeeMatcher` (in `matching.py`) attempts a linear mapping against `employee_system_mappings`. If Jira logic (for timesheets) or AWS logic (for active tracking) produces an isolated email/username that hasn't been mapped, it returns Unmatched. 
- The operator utilizes the "Upload UI" view to bulk link. Upon confirming the link, the DB natively writes a permanent link row (`is_primary = False, verified = True`). Consequent uploads now autonomously match, mapping their raw data specifically into the unified single `employee_id` to process billing perfectly. 

### Deployment Structure
The backend explicitly prepares server configuration deployment templates (`nixpacks.toml`, `railway.toml`). Railway executes CI by pulling these instructions during continuous deployment, automatically establishing an isolated container with proper Python runtime hooks linking directly to the exposed Supabase PostgreSQL connection strings securely managed by local ENV vaults.
