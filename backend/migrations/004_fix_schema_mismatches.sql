-- Migration 004: Fix Schema Mismatches
-- Run in Supabase SQL Editor
-- Fixes: SOW target_date, submitted_date type, candidate file URLs, profiles VENDOR role

-- ─── 1. SOWs: Rename end_date → target_date ──────────────────────────────────
ALTER TABLE public.sows RENAME COLUMN end_date TO target_date;

-- ─── 2. SOWs: Fix submitted_date — drop erroneous FK to job_profiles, then change type to date
-- submitted_date was accidentally created as integer with FK to job_profiles.id
-- The SOW table already has a proper job_profile_id column for that relationship
ALTER TABLE public.sows DROP CONSTRAINT IF EXISTS sows_submitted_date_fkey;
ALTER TABLE public.sows ALTER COLUMN submitted_date TYPE date USING NULL;

-- ─── 3. Candidates: Add feedback file URL columns ───────────────────────────
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS l1_feedback_file_url TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS l2_feedback_file_url TEXT;

-- ─── 4. Profiles: Add VENDOR to user_role enum ──────────────────────────────
-- Check if VENDOR already exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'VENDOR'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'VENDOR';
    END IF;
END
$$;

-- ─── 5. Profiles: Add MANAGEMENT role (referenced in frontend) ──────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'MANAGEMENT'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'MANAGEMENT';
    END IF;
END
$$;
