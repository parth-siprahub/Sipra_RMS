import React, { createContext, useContext, useState, useMemo } from 'react';

interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  recruiterId: string;
}

interface AnalyticsContextValue {
  filters: AnalyticsFilters;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setRecruiterId: (v: string) => void;
  resetFilters: () => void;
  queryParams: Record<string, string>;
}

const defaultFilters: AnalyticsFilters = {
  startDate: '',
  endDate: '',
  recruiterId: '',
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);

  const setStartDate = (v: string) => setFilters(f => ({ ...f, startDate: v }));
  const setEndDate = (v: string) => setFilters(f => ({ ...f, endDate: v }));
  const setRecruiterId = (v: string) => setFilters(f => ({ ...f, recruiterId: v }));
  const resetFilters = () => setFilters(defaultFilters);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (filters.startDate) p['start_date'] = filters.startDate;
    if (filters.endDate) p['end_date'] = filters.endDate;
    if (filters.recruiterId) p['recruiter_id'] = filters.recruiterId;
    return p;
  }, [filters]);

  const value = useMemo(
    () => ({ filters, setStartDate, setEndDate, setRecruiterId, resetFilters, queryParams }),
    [filters, queryParams]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsFilters(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalyticsFilters must be used inside AnalyticsProvider');
  return ctx;
}
