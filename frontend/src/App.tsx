import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './pages/Login';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Dashboard } from './pages/Dashboard';
import { ResourceRequests } from './pages/ResourceRequests';
import { Candidates } from './pages/Candidates';

const JobProfiles = () => <div className="p-4"><h1 className="text-2xl font-bold">Job Profiles</h1></div>;
const SMSows = () => <div className="p-4"><h1 className="text-2xl font-bold">Statements of Work</h1></div>;
const CommunicationLogs = () => <div className="p-4"><h1 className="text-2xl font-bold">Communication Logs</h1></div>;
const NotFound = () => <div className="p-10 text-center text-2xl">404 - Page Not Found</div>;

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="rms-theme">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Protected */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="resource-requests" element={<ResourceRequests />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="job-profiles" element={<JobProfiles />} />
              <Route path="sows" element={<SMSows />} />
              <Route path="communication-logs" element={<CommunicationLogs />} />
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
