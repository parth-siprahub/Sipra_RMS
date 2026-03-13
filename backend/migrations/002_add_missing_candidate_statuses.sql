-- Migration: Ensure ALL candidate_status enum values exist
-- Date: 2026-03-12
-- Context: Phase A+B added SCREENING, INTERVIEW_BACK_OUT, OFFER_BACK_OUT
--          to Python/frontend code but the DB enum was never updated.
--          This migration adds EVERY expected value idempotently.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ─── Ensure all 19 candidate_status enum values exist ─────────────────────────
-- Using IF NOT EXISTS so this is safe to run multiple times.
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'SCREENING';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'SUBMITTED_TO_ADMIN';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'WITH_ADMIN';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'REJECTED_BY_ADMIN';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'WITH_CLIENT';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'L1_SCHEDULED';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'L1_COMPLETED';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'L1_SHORTLIST';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'L1_REJECT';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'INTERVIEW_SCHEDULED';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'SELECTED';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'ONBOARDED';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'REJECTED_BY_CLIENT';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'ON_HOLD';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'SCREEN_REJECT';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'INTERVIEW_BACK_OUT';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'OFFER_BACK_OUT';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'EXIT';

-- ─── Add source column if not already present ─────────────────────────────────
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source TEXT;

-- ─── Verify: list all enum values ─────────────────────────────────────────────
SELECT enumlabel FROM pg_enum
  JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
 WHERE pg_type.typname = 'candidate_status'
 ORDER BY pg_enum.enumsortorder;
