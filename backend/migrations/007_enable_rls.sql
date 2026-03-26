-- Enable Row Level Security on all application tables
-- Backend uses service_role key which bypasses RLS
-- This protects against direct Supabase client access

-- Enable RLS on each table
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sows ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users: read access
CREATE POLICY "Authenticated users can read candidates" ON candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read resource_requests" ON resource_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read sows" ON sows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read job_profiles" ON job_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read employees" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read timesheet_logs" ON timesheet_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read billing_records" ON billing_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read vendors" ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read communication_logs" ON communication_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Policies for write access: admin roles only (checked via profiles table)
-- Note: The backend uses service_role key which bypasses RLS entirely
-- These policies protect against any direct client-side Supabase calls

CREATE POLICY "Admins can insert candidates" ON candidates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));
CREATE POLICY "Admins can update candidates" ON candidates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Admins can insert resource_requests" ON resource_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));
CREATE POLICY "Admins can update resource_requests" ON resource_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Admins can insert sows" ON sows FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));
CREATE POLICY "Admins can update sows" ON sows FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Admins can manage job_profiles" ON job_profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Admins can manage employees" ON employees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Admins can manage timesheet_logs" ON timesheet_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Admins can manage billing_records" ON billing_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Admins can manage vendors" ON vendors FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Admins can manage clients" ON clients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')));

CREATE POLICY "Authenticated users can insert communication_logs" ON communication_logs FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users can read own profile rw" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Audit logs: only super admins can read, service role writes
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can read audit_logs" ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
