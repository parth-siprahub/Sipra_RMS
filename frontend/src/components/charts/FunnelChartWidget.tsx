import { memo, useMemo } from 'react';

interface FunnelStage {
  stage: string;
  count: number;
  drop_off_pct: number | null;
}

interface Props {
  stages: FunnelStage[];
  title?: string;
}

const STAGE_COLORS = [
  'var(--cta)',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
];

export const FunnelChartWidget = memo(function FunnelChartWidget({ stages, title }: Props) {
  const maxCount = useMemo(() => Math.max(...stages.map(s => s.count), 1), [stages]);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      {title && (
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h3>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {stages.map((stage, i) => {
          const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const color = STAGE_COLORS[i % STAGE_COLORS.length];
          return (
            <div key={stage.stage}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{stage.stage}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {stage.count.toLocaleString()}
                  {stage.drop_off_pct !== null && (
                    <span style={{ color: 'var(--color-danger)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                      ▼ {stage.drop_off_pct}%
                    </span>
                  )}
                </span>
              </div>
              <div style={{ height: '2rem', background: 'var(--surface-alt, var(--border))', borderRadius: '0.375rem', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${widthPct}%`,
                    background: color,
                    borderRadius: '0.375rem',
                    transition: 'width 0.5s ease',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '0.5rem',
                    minWidth: stage.count > 0 ? '2rem' : '0',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
