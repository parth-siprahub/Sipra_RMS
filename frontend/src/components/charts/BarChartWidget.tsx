import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DataPoint { label: string; value: number }

interface Props {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export const BarChartWidget = memo(function BarChartWidget({ data, title, height = 280 }: Props) {
  const chartData = data.map(d => ({ name: d.label, value: d.value }));

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      {title && (
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.8rem' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i % 2 === 0 ? 'var(--cta)' : '#8b5cf6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
