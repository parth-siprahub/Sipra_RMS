import React, { useEffect, useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { analyticsApi, type PivotRow } from '../../api/analytics';
import { useAnalyticsFilters } from '../../context/AnalyticsContext';
import { AnalyticsFilterBar } from '../../components/analytics/AnalyticsFilterBar';

type Dimension = keyof Pick<PivotRow, 'status' | 'source' | 'vendor' | 'client_name' | 'request_priority'>;


const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'client_name', label: 'Client' },
  { key: 'request_priority', label: 'Priority' },
];

function buildPivot(
  rows: PivotRow[],
  rowDim: Dimension,
  colDim: Dimension,
): { rowKeys: string[]; colKeys: string[]; matrix: Record<string, Record<string, number>> } {
  const matrix: Record<string, Record<string, number>> = {};
  const rowSet = new Set<string>();
  const colSet = new Set<string>();

  for (const r of rows) {
    const rk = String(r[rowDim] ?? '(blank)');
    const ck = String(r[colDim] ?? '(blank)');
    rowSet.add(rk);
    colSet.add(ck);
    if (!matrix[rk]) matrix[rk] = {};
    matrix[rk][ck] = (matrix[rk][ck] ?? 0) + 1;
  }

  return {
    rowKeys: [...rowSet].sort(),
    colKeys: [...colSet].sort(),
    matrix,
  };
}

export function ReportsAnalyticsPage() {
  const { queryParams } = useAnalyticsFilters();
  const [data, setData] = useState<PivotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowDim, setRowDim] = useState<Dimension>('status');
  const [colDim, setColDim] = useState<Dimension>('source');

  useEffect(() => {
    setLoading(true);
    setError(null);
    analyticsApi.getPivotData(queryParams)
      .then(setData)
      .catch(() => setError('Failed to load pivot data'))
      .finally(() => setLoading(false));
  }, [queryParams]);

  const pivot = useMemo(() => buildPivot(data, rowDim, colDim), [data, rowDim, colDim]);

  const handleExport = useCallback(() => {
    if (!pivot.rowKeys.length) return;
    const wsData: (string | number)[][] = [
      [rowDim + ' \\ ' + colDim, ...pivot.colKeys, 'Total'],
      ...pivot.rowKeys.map(rk => {
        const rowTotal = pivot.colKeys.reduce((s, ck) => s + (pivot.matrix[rk]?.[ck] ?? 0), 0);
        return [rk, ...pivot.colKeys.map(ck => pivot.matrix[rk]?.[ck] ?? 0), rowTotal];
      }),
    ];
    const totals = ['Total', ...pivot.colKeys.map(ck =>
      pivot.rowKeys.reduce((s, rk) => s + (pivot.matrix[rk]?.[ck] ?? 0), 0)
    ), data.length];
    wsData.push(totals);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Pivot');
    XLSX.writeFile(wb, `analytics_pivot_${rowDim}_x_${colDim}.xlsx`);
  }, [pivot, data.length, rowDim, colDim]);

  const selectStyle: React.CSSProperties = {
    padding: '0.3rem 0.6rem',
    fontSize: '0.85rem',
    border: '1px solid var(--border)',
    borderRadius: '0.375rem',
    background: 'var(--surface)',
    color: 'var(--text)',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>Analytics Reports</h1>
        <button className="btn" onClick={handleExport} disabled={loading || data.length === 0} style={{ fontSize: '0.85rem' }}>
          Export .xlsx
        </button>
      </div>

      <AnalyticsFilterBar />

      {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}

      {/* Pivot config */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pivot</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text)' }}>
          Rows
          <select style={selectStyle} value={rowDim} onChange={e => setRowDim(e.target.value as Dimension)}>
            {DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text)' }}>
          Columns
          <select style={selectStyle} value={colDim} onChange={e => setColDim(e.target.value as Dimension)}>
            {DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </label>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {data.length.toLocaleString()} rows · Measure: Count
        </span>
      </div>

      {/* Pivot table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>
        ) : pivot.rowKeys.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data for selected filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, position: 'sticky', top: 0, left: 0, zIndex: 2 }}>
                    {DIMENSIONS.find(d => d.key === rowDim)?.label} \ {DIMENSIONS.find(d => d.key === colDim)?.label}
                  </th>
                  {pivot.colKeys.map(ck => (
                    <th key={ck} style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', borderBottom: '2px solid var(--border)', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, position: 'sticky', top: 0, whiteSpace: 'nowrap' }}>
                      {ck}
                    </th>
                  ))}
                  <th style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', borderBottom: '2px solid var(--border)', textAlign: 'right', color: 'var(--cta)', fontWeight: 700, position: 'sticky', top: 0 }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {pivot.rowKeys.map((rk, i) => {
                  const rowTotal = pivot.colKeys.reduce((s, ck) => s + (pivot.matrix[rk]?.[ck] ?? 0), 0);
                  return (
                    <tr key={rk} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface-alt, transparent)', borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600, color: 'var(--text)', position: 'sticky', left: 0, background: 'inherit', whiteSpace: 'nowrap' }}>{rk}</td>
                      {pivot.colKeys.map(ck => {
                        const val = pivot.matrix[rk]?.[ck] ?? 0;
                        return (
                          <td key={ck} style={{ padding: '0.45rem 0.75rem', textAlign: 'right', color: val > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                            {val > 0 ? val.toLocaleString() : '—'}
                          </td>
                        );
                      })}
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--cta)' }}>
                        {rowTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface)' }}>
                  <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: 'var(--cta)', position: 'sticky', left: 0, background: 'var(--surface)' }}>Total</td>
                  {pivot.colKeys.map(ck => {
                    const colTotal = pivot.rowKeys.reduce((s, rk) => s + (pivot.matrix[rk]?.[ck] ?? 0), 0);
                    return (
                      <td key={ck} style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--cta)' }}>
                        {colTotal.toLocaleString()}
                      </td>
                    );
                  })}
                  <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--cta)' }}>
                    {data.length.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
