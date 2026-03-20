-- Migration 005: Job Profile columns, Clients table, RBAC expansion
-- Run in Supabase SQL Editor

-- ─── 1. Job Profiles: Add missing columns ─────────────────────────────────────
ALTER TABLE public.job_profiles ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE public.job_profiles ADD COLUMN IF NOT EXISTS jd_file_url TEXT;

-- ─── 2. Clients Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
    id              SERIAL PRIMARY KEY,
    client_name     TEXT NOT NULL UNIQUE,
    client_website  TEXT,
    contact_email   TEXT,
    contact_phone   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(client_name);

DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 3. RBAC: Expand user_role enum ───────────────────────────────────────────
-- Add SUPER_ADMIN if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'SUPER_ADMIN'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'SUPER_ADMIN';
    END IF;
END
$$;

-- Add MANAGER if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'MANAGER'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'MANAGER';
    END IF;
END
$$;

-- ─── 4. Seed existing SOW client names into clients table ─────────────────────
-- This pulls unique client_name values from sows into the new clients table
INSERT INTO public.clients (client_name)
SELECT DISTINCT client_name FROM public.sows
WHERE client_name IS NOT NULL AND client_name != ''
ON CONFLICT (client_name) DO NOTHING;
