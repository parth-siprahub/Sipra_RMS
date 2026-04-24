import { useEffect, useState } from 'react';
import { analyticsApi, type PipelineFunnel } from '../../api/analytics';
import { useAnalyticsFilters } from '../../context/AnalyticsContext';
import { AnalyticsFilterBar } from '../../components/analytics/AnalyticsFilterBar';
import { FunnelChartWidget } from '../../components/charts/FunnelChartWidget';

export function PipelinePage() {
  const { queryParams } = useAnalyticsFilters();
  const [data, setData] = useState<PipelineFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    analyticsApi.getPipelineFunnel(queryParams)
      .then(setData)
      .catch(() => setError('Failed to load pipeline data'))
      .finally(() => setLoading(false));
  }, [queryParams]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem' }}>
        Pipeline
      </h1>

      <AnalyticsFilterBar />

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}
      {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

      {!loading && !error && data && (
        <div style={{ maxWidth: '640px' }}>
          <FunnelChartWidget stages={data.stages} title="Recruitment Funnel" />

          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
            {data.stages.map(s => (
              <div key={s.stage} className="card" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cta)' }}>{s.count.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.stage}</div>
                {s.drop_off_pct !== null && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: '0.2rem' }}>
                    ▼ {s.drop_off_pct}% drop
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
