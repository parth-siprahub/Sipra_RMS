import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Dashboard } from '../Dashboard';

// Stub API so the metrics effect resolves immediately
vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      total_sows: 0, active_sows: 0, total_job_profiles: 0, open_resource_requests: 0,
      total_candidates: 0, pipeline_by_status: [], recent_activities: [],
    }),
  },
}));

// Stub the two tab components so tests focus only on the tab switcher
vi.mock('../../components/dashboard/OverviewTab', () => ({
  OverviewTab: () => <div data-testid="overview-tab">Overview Content</div>,
}));
vi.mock('../../components/dashboard/DashboardAnalytics', () => ({
  DashboardAnalytics: () => <div data-testid="analytics-tab">Analytics Content</div>,
}));

describe('Dashboard tab toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('defaults to Overview tab on first load', async () => {
    render(<Dashboard />);
    expect(await screen.findByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('analytics-tab')).toBeNull();
  });

  it('switches to Analytics tab when button clicked', async () => {
    render(<Dashboard />);
    await screen.findByTestId('overview-tab');
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    expect(screen.getByTestId('analytics-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('overview-tab')).toBeNull();
  });

  it('persists Analytics tab choice to localStorage', async () => {
    render(<Dashboard />);
    await screen.findByTestId('overview-tab');
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    expect(localStorage.getItem('rms.dashboard.tab')).toBe('analytics');
  });

  it('restores persisted Analytics tab on remount', async () => {
    localStorage.setItem('rms.dashboard.tab', 'analytics');
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('analytics-tab')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('overview-tab')).toBeNull();
  });
});
