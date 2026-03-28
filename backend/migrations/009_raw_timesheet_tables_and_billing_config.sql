-- Migration 009: Raw timesheet tables, billing config, computed reports
-- March 27, 2026 meeting requirements
-- Creates new tables that mirror Excel/CSV source files exactly

-- ─── 1A. AWS timesheet (monthly per-employee, mirrors CSV) ────────────────────
CREATE TABLE IF NOT EXISTS aws_timesheet_logs_v2 (
    id BIGSERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    aws_email TEXT NOT NULL,
    billing_month TEXT NOT NULL,
    client_name TEXT DEFAULT 'DCLI',
    -- h:mm:ss format columns (display as-is from CSV)
    work_time_hms TEXT,
    productive_hms TEXT,
    unproductive_hms TEXT,
    undefined_hms TEXT,
    active_hms TEXT,
    passive_hms TEXT,
    screen_time_hms TEXT,
    offline_meetings_hms TEXT,
    -- Seconds columns (for computation)
    work_time_secs BIGINT DEFAULT 0,
    productive_secs BIGINT DEFAULT 0,
    unproductive_secs BIGINT DEFAULT 0,
    undefined_secs BIGINT DEFAULT 0,
    active_secs BIGINT DEFAULT 0,
    passive_secs BIGINT DEFAULT 0,
    screen_time_secs BIGINT DEFAULT 0,
    offline_meetings_secs BIGINT DEFAULT 0,
    -- Sub-category h:mm:ss
    prod_active_hms TEXT,
    prod_passive_hms TEXT,
    unprod_active_hms TEXT,
    unprod_passive_hms TEXT,
    undefined_active_hms TEXT,
    undefined_passive_hms TEXT,
    -- Sub-category secs
    prod_active_secs BIGINT DEFAULT 0,
    prod_passive_secs BIGINT DEFAULT 0,
    unprod_active_secs BIGINT DEFAULT 0,
    unprod_passive_secs BIGINT DEFAULT 0,
    undefined_active_secs BIGINT DEFAULT 0,
    undefined_passive_secs BIGINT DEFAULT 0,
    -- Metadata
    import_header_id INTEGER REFERENCES import_headers(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(aws_email, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_aws_v2_month ON aws_timesheet_logs_v2(billing_month);
CREATE INDEX IF NOT EXISTS idx_aws_v2_employee ON aws_timesheet_logs_v2(employee_id);


-- ─── 1B. Jira timesheet raw (per-issue per-day, mirrors XLS) ─────────────────
CREATE TABLE IF NOT EXISTS jira_timesheet_raw (
    id BIGSERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    billing_month TEXT NOT NULL,
    team TEXT,
    jira_user TEXT NOT NULL,
    issue TEXT,
    jira_key TEXT,
    logged NUMERIC(8,2) DEFAULT 0,
    -- Per-day columns (day_01 through day_31)
    day_01 NUMERIC(6,2), day_02 NUMERIC(6,2), day_03 NUMERIC(6,2),
    day_04 NUMERIC(6,2), day_05 NUMERIC(6,2), day_06 NUMERIC(6,2),
    day_07 NUMERIC(6,2), day_08 NUMERIC(6,2), day_09 NUMERIC(6,2),
    day_10 NUMERIC(6,2), day_11 NUMERIC(6,2), day_12 NUMERIC(6,2),
    day_13 NUMERIC(6,2), day_14 NUMERIC(6,2), day_15 NUMERIC(6,2),
    day_16 NUMERIC(6,2), day_17 NUMERIC(6,2), day_18 NUMERIC(6,2),
    day_19 NUMERIC(6,2), day_20 NUMERIC(6,2), day_21 NUMERIC(6,2),
    day_22 NUMERIC(6,2), day_23 NUMERIC(6,2), day_24 NUMERIC(6,2),
    day_25 NUMERIC(6,2), day_26 NUMERIC(6,2), day_27 NUMERIC(6,2),
    day_28 NUMERIC(6,2), day_29 NUMERIC(6,2), day_30 NUMERIC(6,2),
    day_31 NUMERIC(6,2),
    is_summary_row BOOLEAN DEFAULT FALSE,
    is_ooo BOOLEAN DEFAULT FALSE,
    import_header_id INTEGER REFERENCES import_headers(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jira_raw_month ON jira_timesheet_raw(billing_month);
CREATE INDEX IF NOT EXISTS idx_jira_raw_employee ON jira_timesheet_raw(employee_id);
CREATE INDEX IF NOT EXISTS idx_jira_raw_user ON jira_timesheet_raw(jira_user);


-- ─── 1C. Billing configuration table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_config (
    id BIGSERIAL PRIMARY KEY,
    client_name TEXT NOT NULL DEFAULT 'DCLI',
    billing_month TEXT NOT NULL,
    billable_hours NUMERIC(6,2) NOT NULL DEFAULT 176,
    working_days INTEGER NOT NULL DEFAULT 22,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_name, billing_month)
);


-- ─── 1D. Computed reports table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS computed_reports (
    id BIGSERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    billing_month TEXT NOT NULL,
    jira_hours NUMERIC(8,2) DEFAULT 0,
    ooo_days INTEGER DEFAULT 0,
    aws_hours NUMERIC(8,2),
    billable_hours NUMERIC(8,2),
    difference NUMERIC(8,2),
    difference_pct NUMERIC(6,2),
    flag TEXT NOT NULL DEFAULT 'no_aws',
    computed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_computed_reports_month ON computed_reports(billing_month);
