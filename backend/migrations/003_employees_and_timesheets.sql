-- Migration 003: Employee Registry, Timesheet Logs, and Billing Records
-- Run in Supabase SQL Editor

-- ─── Employee Registry ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
    id              SERIAL PRIMARY KEY,
    candidate_id    INTEGER UNIQUE REFERENCES public.candidates(id),
    rms_name        TEXT NOT NULL,
    client_name     TEXT,
    aws_email       TEXT,
    github_id       TEXT,
    jira_username   TEXT,
    start_date      DATE,
    exit_date       DATE,
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXITED', 'TERMINATED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_candidate_id ON public.employees(candidate_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_jira_username ON public.employees(jira_username);

-- ─── Timesheet Logs (Jira/Tempo Import) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.timesheet_logs (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER NOT NULL REFERENCES public.employees(id),
    log_date        DATE NOT NULL,
    hours_logged    NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_ooo          BOOLEAN NOT NULL DEFAULT FALSE,
    import_month    TEXT NOT NULL,  -- "YYYY-MM" for idempotent upsert
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_timesheet_employee_month ON public.timesheet_logs(employee_id, import_month);

-- ─── Billing Records ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_records (
    id                  SERIAL PRIMARY KEY,
    employee_id         INTEGER NOT NULL REFERENCES public.employees(id),
    billing_month       TEXT NOT NULL,  -- "YYYY-MM"
    total_logged_hours  NUMERIC(7,2) NOT NULL DEFAULT 0,
    capped_hours        NUMERIC(7,2) NOT NULL DEFAULT 0,
    ooo_days            INTEGER NOT NULL DEFAULT 0,
    aws_active_hours    NUMERIC(7,2),
    compliance_75_pct   BOOLEAN,        -- TRUE = passes 75% rule
    is_billable         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_billing_employee_month ON public.billing_records(employee_id, billing_month);

-- ─── Auto-update timestamps ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS employees_updated_at ON public.employees;
CREATE TRIGGER employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS billing_records_updated_at ON public.billing_records;
CREATE TRIGGER billing_records_updated_at
    BEFORE UPDATE ON public.billing_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
