-- Migration 010: Add offboarding date columns to employees table
-- client_offboarding_date  = final billing date (last day billed to the client)
-- siprahub_offboarding_date = final salary date (last day on Siprahub payroll)

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS client_offboarding_date DATE,
    ADD COLUMN IF NOT EXISTS siprahub_offboarding_date DATE;

COMMENT ON COLUMN public.employees.client_offboarding_date  IS 'Final billing date — last day the employee is billed to the client';
COMMENT ON COLUMN public.employees.siprahub_offboarding_date IS 'Final salary date — last day the employee is on Siprahub payroll';
