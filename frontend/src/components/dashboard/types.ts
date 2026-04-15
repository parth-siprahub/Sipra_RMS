// ─── Dashboard shared types ─────────────────────────────────────────────────

export interface VendorStats {
    total: number;
    selected: number;
    onboarded: number;
    rejected: number;
    rejection_rate: number;
}

export interface SOWUtilization {
    sow_number: string;
    max: number;
    current: number;
}

export interface TimelineEntry {
    date: string;
    count: number;
}

export interface SkillEntry {
    skill: string;
    count: number;
}

/** Active employees grouped by primary job profile technology (dashboard drill-down). */
export interface TechnologyBreakdownEntry {
    technology: string;
    count: number;
}

export interface MissingIdentifier {
    employee_id: number;
    rms_name: string;
    missing_fields: string[];
}

export interface TriadEntry {
    employee_id: number;
    rms_name: string;
    jira_hours: number;
    capped_hours: number;
    aws_hours: number | null;
    compliance_75_pct: boolean | null;
    is_billable: boolean;
}

export interface VendorRisk {
    vendor_name: string;
    total: number;
    rejected: number;
    rejection_rate: number;
    risk_level: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface PipelineRisk {
    pipeline_dropout_pct: number;
    bottleneck_pct: number;
    pipeline_health_score: number;
    critical_vendor_count: number;
    vendor_risks: VendorRisk[];
}

export interface SkillStatusRow {
    skill: string;
    statuses: Record<string, number>;
    total: number;
}

export interface DashboardMetrics {
    total_requests: number;
    requests_by_status: Record<string, number>;
    requests_by_priority: Record<string, number>;
    total_candidates: number;
    candidates_by_status: Record<string, number>;
    backfill_count: number;
    vendor_performance: Record<string, VendorStats>;
    sow_utilization: SOWUtilization[];
    timeline: TimelineEntry[];
    candidates_by_skill: SkillEntry[];
    total_employees?: number;
    active_employees?: number;
    active_employees_by_technology?: TechnologyBreakdownEntry[];
    missing_identifiers?: MissingIdentifier[];
    triad_summary?: TriadEntry[];
    triad_billing_month?: string;
    risk?: PipelineRisk;
    skill_status_matrix?: SkillStatusRow[];
}
