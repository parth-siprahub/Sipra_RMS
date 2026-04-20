import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardAnalytics } from '../DashboardAnalytics';
import { AnalyticsProvider } from '../../../context/AnalyticsContext';

// Stub all analytics data fetches so charts don't error
vi.mock('../../../api/analytics', () => ({
  analyticsApi: {
    getResourcesSkills: vi.fn().mockResolvedValue({ total_resources: 0, skills: [] }),
    getHiringType: vi.fn().mockResolvedValue([]),
    getClientDemand: vi.fn().mockResolvedValue([]),
    getEmploymentType: vi.fn().mockResolvedValue([]),
    getPipelineFunnel: vi.fn().mockResolvedValue({ stages: [] }),
    getPivotData: vi.fn().mockResolvedValue([]),
    listRecruiters: vi.fn().mockResolvedValue([
      { id: 'r1', full_name: 'Alice Recruiter' },
      { id: 'r2', full_name: 'Bob Admin' },
    ]),
  },
}));

// Mock AuthContext to return admin role
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'admin-id', role: 'ADMIN', email: 'admin@example.com', full_name: 'Admin' },
    isAuthenticated: true,
    isLoading: false,
  }),
  isAdminRole: (role?: string) =>
    role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'MANAGEMENT',
}));

describe('DashboardAnalytics FilterBar — admin recruiter dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recruiter dropdown with recruiter names for admin', async () => {
    render(
      <AnalyticsProvider>
        <DashboardAnalytics />
      </AnalyticsProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /recruiter/i })).toBeInTheDocument();
    });

    expect(screen.getByText('All Recruiters')).toBeInTheDocument();
    expect(screen.getByText('Alice Recruiter')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin')).toBeInTheDocument();
  });
});
