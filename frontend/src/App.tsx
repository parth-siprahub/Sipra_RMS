import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './pages/Login';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Dashboard } from './pages/Dashboard';
import { ResourceRequests } from './pages/ResourceRequests';
import { Candidates } from './pages/Candidates';
import { Sows } from './pages/Sows';
import { JobProfiles } from './pages/JobProfiles';
import { CommunicationLogs } from './pages/CommunicationLogs';
import { Vendors } from './pages/Vendors';
import { Employees } from './pages/Employees';
import { Timesheets } from './pages/Timesheets';
import { Clients } from './pages/Clients';
import { Reports } from './pages/Reports';
import { ReportEmployeeDrillDown } from './pages/ReportEmployeeDrillDown';
import { BillingConfig } from './pages/BillingConfig';
import { TimesheetJiraDrillDown } from './pages/TimesheetJiraDrillDown';
import { TimesheetAwsDrillDown } from './pages/TimesheetAwsDrillDown';

const NotFound = () => <div className="p-10 text-center text-2xl text-text-muted font-medium">404 - Page Not Found</div>;

function RoleRedirect({ role, to, defaultElement }: { role: string; to: string; defaultElement: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === role) return <Navigate to={to} replace />;
  return <>{defaultElement}</>;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(_error: Error, _info: React.ErrorInfo) {
    // Errors captured by boundary — integrate telemetry/logging service here if needed
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="card p-8 text-center" style={{ maxWidth: 480 }}>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-danger)' }}>
              Something went wrong
            </h2>
            <p className="text-muted mb-4">
              An unexpected error occurred. Please reload the page.
            </p>
            <button className="btn" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="rms-theme">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={
                <ProtectedRoute>
                  {/* Redirect SUPER_ADMIN role from Dashboard to Employees/User Creation */}
                  <RoleRedirect role="SUPER_ADMIN" to="/employees" defaultElement={<Dashboard />} />
                </ProtectedRoute>
              } />
              <Route path="resource-requests" element={<ResourceRequests />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="job-profiles" element={<JobProfiles />} />
              <Route path="sows" element={<Sows />} />
              <Route path="communication-logs" element={<CommunicationLogs />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="employees" element={<Employees />} />
              <Route path="timesheets" element={<Timesheets />} />
              <Route path="clients" element={<Clients />} />
              <Route path="reports" element={<Reports />} />
              <Route path="reports/employee/:employeeId" element={<ReportEmployeeDrillDown />} />
              <Route path="billing-config" element={<BillingConfig />} />
              <Route path="timesheets/drill-down/jira" element={<TimesheetJiraDrillDown />} />
              <Route path="timesheets/drill-down/aws" element={<TimesheetAwsDrillDown />} />
            </Route>

              {/* Dashboard alias – direct nav to /dashboard redirects to root */}
              <Route path="/dashboard" element={<Navigate to="/" replace />} />

              {/* Catch All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
