import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

const NotFound = () => <div className="p-10 text-center text-2xl">404 - Page Not Found</div>;

function App() {
  return (
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
              <Route index element={<Dashboard />} />
              <Route path="resource-requests" element={<ResourceRequests />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="job-profiles" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECRUITER']}>
                  <JobProfiles />
                </ProtectedRoute>
              } />
              <Route path="sows" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <Sows />
                </ProtectedRoute>
              } />
              <Route path="communication-logs" element={<CommunicationLogs />} />
              <Route path="vendors" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                  <Vendors />
                </ProtectedRoute>
              } />
              <Route path="employees" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                  <Employees />
                </ProtectedRoute>
              } />
              <Route path="timesheets" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                  <Timesheets />
                </ProtectedRoute>
              } />
              <Route path="clients" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                  <Reports />
                </ProtectedRoute>
              } />
            </Route>

            {/* Dashboard alias – direct nav to /dashboard redirects to root */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* Catch All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
