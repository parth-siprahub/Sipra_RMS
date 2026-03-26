-- Migration 006: Audit Logs table for tracking all data mutations
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL,           -- CREATE, UPDATE, DELETE, STATUS_CHANGE, IMPORT
    entity_type TEXT NOT NULL,      -- candidate, employee, sow, resource_request, timesheet
    entity_id TEXT,                 -- ID of the affected record
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
