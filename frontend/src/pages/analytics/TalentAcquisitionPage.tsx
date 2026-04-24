import React, { useEffect, useState, useMemo } from 'react';
import { analyticsApi, type LabelValue, type DailyStatusRow, type PaginatedTable } from '../../api/analytics';
import { useAnalyticsFilters } from '../../context/AnalyticsContext';
import { AnalyticsFilterBar } from '../../components/analytics/AnalyticsFilterBar';
import { PieChartWidget } from '../../components/charts/PieChartWidget';
import { BarChartWidget } from '../../components/charts/BarChartWidget';
import { DoughnutChart } from '../../components/charts/DoughnutChart';

const PAGE_SIZE = 20;

type SortField = keyof DailyStatusRow;

const COLUMNS: { key: SortField; label: string }[] = [
  { key: 'name', label: 'Candidate' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'skills', label: 'Skills' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'created_at', label: 'Added' },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6366f1', SCREENING: '#06b6d4', SELECTED: '#10b981',
  ONBOARDED: '#10b981', SCREEN_REJECT: '#ef4444', REJECTED_BY_CLIENT: '#ef4444',
};

export function TalentAcquisitionPage() {
  const { queryParams } = useAnalyticsFilters();

  const [hiringType, setHiringType] = useState<LabelValue[]>([]);
  const [clientDemand, setClientDemand] = useState<LabelValue[]>([]);
  const [employmentType, setEmploymentType] = useState<LabelValue[]>([]);
  const [tableData, setTableData] = useState<PaginatedTable<DailyStatusRow>>({ data: [], total: 0, page: 1, page_size: PAGE_SIZE });
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDesc, setSortDesc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setError(null);
    Promise.all([
      analyticsApi.getHiringType(queryParams),
      analyticsApi.getClientDemand(queryParams),
      analyticsApi.getEmploymentType(queryParams),
    ])
      .then(([ht, cd, et]) => { setHiringType(ht); setClientDemand(cd); setEmploymentType(et); })
      .catch(() => setError('Failed to load chart data'));
  }, [queryParams]);

  useEffect(() => {
    setLoading(true);
    analyticsApi.getDailyStatus({
      ...queryParams,
      page: String(page),
      page_size: String(PAGE_SIZE),
      sort_by: sortField,
      sort_order: sortDesc ? 'desc' : 'asc',
    })
      .then(setTableData)
      .catch(() => setError('Failed to load table data'))
      .finally(() => setLoading(false));
  }, [queryParams, page, sortField, sortDesc]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [queryParams]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(tableData.total / PAGE_SIZE)), [tableData.total]);

  const searchQ = search.trim().toLowerCase();
  const visibleRows = useMemo(
    () => searchQ
      ? tableData.data.filter(r =>
          r.name.toLowerCase().includes(searchQ) ||
          (r.vendor || '').toLowerCase().includes(searchQ) ||
          (r.source || '').toLowerCase().includes(searchQ) ||
          (r.skills || '').toLowerCase().includes(searchQ),
        )
      : tableData.data,
    [tableData.data, searchQ],
  );

  function handleSort(field: SortField) {
    if (field === sortField) setSortDesc(d => !d);
    else { setSortField(field); setSortDesc(true); }
  }

  const thStyle: React.CSSProperties = {
    padding: '0.6rem 0.75rem',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    background: 'var(--surface)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem' }}>
        Talent Acquisition
      </h1>

      <AnalyticsFilterBar />

      {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <PieChartWidget data={hiringType} title="Hiring Type" />
        <BarChartWidget data={clientDemand} title="Client Demand" />
        <DoughnutChart data={employmentType} title="Employment Type" />
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Daily Status Grid &nbsp;<span style={{ fontWeight: 400, textTransform: 'none' }}>({tableData.total.toLocaleString()} total)</span>
          </h3>
          <input
            type="text"
            className="input-field"
            style={{ maxWidth: '220px' }}
            placeholder="Search candidate, vendor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} style={thStyle} onClick={() => handleSort(col.key)}>
                    {col.label} {sortField === col.key ? (sortDesc ? '↓' : '↑') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLUMNS.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : visibleRows.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{searchQ ? 'No matches' : 'No data'}</td></tr>
              ) : (
                visibleRows.map((row, i) => (
                  <tr key={row.candidate_id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-alt, transparent)' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500, color: 'var(--text)' }}>{row.name}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.72rem', background: STATUS_COLORS[row.status] ?? 'var(--border)', color: '#fff', fontWeight: 500 }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{row.source ?? '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.skills ?? '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{row.vendor ?? '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{row.created_at ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <button className="btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button className="btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
        </div>
      </div>
    </div>
  );
}
