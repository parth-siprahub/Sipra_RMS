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
              <Route path="job-profiles" element={<JobProfiles />} />
              <Route path="sows" element={<Sows />} />
              <Route path="communication-logs" element={<CommunicationLogs />} />
              <Route path="vendors" element={<Vendors />} />
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
