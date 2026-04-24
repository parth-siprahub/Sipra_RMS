import { memo, useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAnalyticsFilters } from '../../context/AnalyticsContext';
import { useAuth, isAdminRole } from '../../context/AuthContext';
import { analyticsApi } from '../../api/analytics';

export const AnalyticsFilterBar = memo(function AnalyticsFilterBar() {
  const { filters, setStartDate, setEndDate, setRecruiterId, resetFilters } = useAnalyticsFilters();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const hasFilters = !!(filters.startDate || filters.endDate || filters.recruiterId);

  const [recruiters, setRecruiters] = useState<Array<{ id: string; full_name: string }>>([]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    analyticsApi.listRecruiters()
      .then(list => { if (!cancelled) setRecruiters(list); })
      .catch(err => console.error('Failed to load recruiters:', err));
    return () => { cancelled = true; };
  }, [isAdmin]);

  return (
    <div
      className="card"
      style={{
        padding: '0.875rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Filters
      </span>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text)' }}>
        From
        <input
          type="date"
          className="input-field"
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
          value={filters.startDate}
          onChange={e => setStartDate(e.target.value)}
        />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text)' }}>
        To
        <input
          type="date"
          className="input-field"
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
          value={filters.endDate}
          onChange={e => setEndDate(e.target.value)}
        />
      </label>

      {isAdmin && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text)' }}>
          Recruiter
          <select
            className="input-field"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: '11rem' }}
            value={filters.recruiterId}
            onChange={e => setRecruiterId(e.target.value)}
            aria-label="Recruiter"
          >
            <option value="">All Recruiters</option>
            {recruiters.map(r => (
              <option key={r.id} value={r.id}>{r.full_name}</option>
            ))}
          </select>
        </label>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {hasFilters && (
          <button
            onClick={resetFilters}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem' }}
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>
    </div>
  );
});
