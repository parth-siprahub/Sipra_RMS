-- Migration 011: Billing config freeze/unfreeze support
-- Adds freeze tracking columns, indexes, and RLS policies to billing_config
-- Columns may already exist from a direct DB patch — all statements are idempotent.

-- ─── 1. Freeze columns (idempotent ADD COLUMN IF NOT EXISTS) ─────────────────
ALTER TABLE public.billing_config
    ADD COLUMN IF NOT EXISTS is_frozen        BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS frozen_by        TEXT,
    ADD COLUMN IF NOT EXISTS frozen_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_unfrozen_by TEXT,
    ADD COLUMN IF NOT EXISTS last_unfrozen_at TIMESTAMPTZ;

COMMENT ON COLUMN public.billing_config.is_frozen        IS 'TRUE = month is locked; recalculation and edits are blocked';
COMMENT ON COLUMN public.billing_config.frozen_by        IS 'Email of the user who froze this month';
COMMENT ON COLUMN public.billing_config.frozen_at        IS 'Timestamp when this month was last frozen';
COMMENT ON COLUMN public.billing_config.last_unfrozen_by IS 'Email of the user who last unfroze this month';
COMMENT ON COLUMN public.billing_config.last_unfrozen_at IS 'Timestamp when this month was last unfrozen';


-- ─── 2. Performance indexes ───────────────────────────────────────────────────

-- Fast lookup by month (used on BillingConfig page filter and calculate guard)
CREATE INDEX IF NOT EXISTS idx_billing_config_month
    ON public.billing_config (billing_month);

-- Partial index: quickly find frozen months (small index, only frozen rows)
CREATE INDEX IF NOT EXISTS idx_billing_config_frozen
    ON public.billing_config (billing_month)
    WHERE is_frozen = true;


-- ─── 3. RLS policies for billing_config ──────────────────────────────────────
-- All writes go through the service-role (admin) client which bypasses RLS.
-- These policies add defence-in-depth for authenticated client access.

-- Allow admin/manager roles to INSERT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'billing_config'
          AND policyname = 'admins_insert_billing_config'
    ) THEN
        CREATE POLICY admins_insert_billing_config
            ON public.billing_config
            FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id   = auth.uid()
                      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
                )
            );
    END IF;
END $$;

-- Allow admin/manager roles to UPDATE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'billing_config'
          AND policyname = 'admins_update_billing_config'
    ) THEN
        CREATE POLICY admins_update_billing_config
            ON public.billing_config
            FOR UPDATE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id   = auth.uid()
                      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id   = auth.uid()
                      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
                )
            );
    END IF;
END $$;

-- Allow admin/manager roles to DELETE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'billing_config'
          AND policyname = 'admins_delete_billing_config'
    ) THEN
        CREATE POLICY admins_delete_billing_config
            ON public.billing_config
            FOR DELETE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id   = auth.uid()
                      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
                )
            );
    END IF;
END $$;
