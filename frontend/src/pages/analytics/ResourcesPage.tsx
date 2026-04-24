import { useEffect, useState, useMemo } from 'react';
import { analyticsApi, type ResourcesOverview } from '../../api/analytics';
import { useAnalyticsFilters } from '../../context/AnalyticsContext';
import { AnalyticsFilterBar } from '../../components/analytics/AnalyticsFilterBar';
import { DoughnutChart } from '../../components/charts/DoughnutChart';

export function ResourcesPage() {
  const { queryParams } = useAnalyticsFilters();
  const [data, setData] = useState<ResourcesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    analyticsApi.getResourcesSkills(queryParams)
      .then(setData)
      .catch(() => setError('Failed to load resources data'))
      .finally(() => setLoading(false));
  }, [queryParams]);

  const chartData = useMemo(() => data?.skills ?? [], [data]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem' }}>
        Resource Overview
      </h1>

      <AnalyticsFilterBar />

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}
      {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

      {!loading && !error && data && (
        <>
          <div className="card" style={{ display: 'inline-block', padding: '1rem 1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Resources</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--cta)' }}>{data.total_resources.toLocaleString()}</div>
          </div>

          <div style={{ maxWidth: '520px' }}>
            <DoughnutChart data={chartData} title="Skill Distribution" height={320} />
          </div>

          {chartData.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No skill data for the selected period.</p>
          )}
        </>
      )}
    </div>
  );
}
