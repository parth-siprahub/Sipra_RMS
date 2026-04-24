import { memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = [
  'var(--cta)',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#ec4899',
  '#6366f1',
];

interface DataPoint { label: string; value: number }

interface Props {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export const PieChartWidget = memo(function PieChartWidget({ data, title, height = 280 }: Props) {
  const chartData = data.map(d => ({ name: d.label, value: d.value }));

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      {title && (
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" outerRadius="70%" paddingAngle={2} dataKey="value">
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.8rem' }}
          />
          <Legend formatter={(value) => <span style={{ color: 'var(--text)', fontSize: '0.8rem' }}>{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
