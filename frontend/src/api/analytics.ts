import { api as apiClient } from './client';

export interface LabelValue {
  label: string;
  value: number;
}

export interface ResourcesOverview {
  total_resources: number;
  skills: LabelValue[];
}

export interface PaginatedTable<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DailyStatusRow {
  candidate_id: number;
  name: string;
  status: string;
  source: string | null;
  skills: string | null;
  vendor: string | null;
  created_at: string | null;
}

export interface FunnelStage {
  stage: string;
  count: number;
  drop_off_pct: number | null;
}

export interface PipelineFunnel {
  stages: FunnelStage[];
}

export interface PivotRow {
  candidate_id: number;
  name: string;
  status: string;
  source: string | null;
  skills: string | null;
  vendor: string | null;
  client_name: string | null;
  request_priority: string | null;
  created_at: string | null;
}

type Params = Record<string, string>;

export const analyticsApi = {
  getResourcesSkills: (params: Params) =>
    apiClient.get<ResourcesOverview>('/analytics/resources/skills', params),

  getHiringType: (params: Params) =>
    apiClient.get<LabelValue[]>('/analytics/ta/hiring-type', params),

  getClientDemand: (params: Params) =>
    apiClient.get<LabelValue[]>('/analytics/ta/client-demand', params),

  getEmploymentType: (params: Params) =>
    apiClient.get<LabelValue[]>('/analytics/ta/employment-type', params),

  getDailyStatus: (params: Params & { page?: string; page_size?: string; sort_by?: string; sort_order?: string }) =>
    apiClient.get<PaginatedTable<DailyStatusRow>>('/analytics/ta/daily-status', params),

  getRequirementTracker: (params: Params = {}) =>
    apiClient.get<{ stages: Array<{ stage: string; label: string; open_count: number }> }>(
        '/analytics/pipeline/requirement-tracker',
        params,
    ),

  getPipelineFunnel: (params: Params) =>
    apiClient.get<PipelineFunnel>('/analytics/pipeline/funnel', params),

  getPivotData: (params: Params) =>
    apiClient.get<PivotRow[]>('/analytics/reports/pivot-data', params),

  getHiringTypeSplit: (params: Params = {}) =>
    apiClient.get<LabelValue[]>('/analytics/ta/hiring-type-split', params),

  listRecruiters: (): Promise<Array<{ id: string; full_name: string }>> =>
    apiClient.get('/users/recruiters'),
};
