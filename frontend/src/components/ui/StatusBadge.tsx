// Maps status/priority values to the badge CSS classes defined in components.css

const REQUEST_STATUS_MAP: Record<string, string> = {
    OPEN: 'badge-success',
    HOLD: 'badge-warning',
    CLOSED: 'badge-neutral',
};

const CANDIDATE_STATUS_MAP: Record<string, string> = {
    NEW: 'badge-info',
    SCREENING: 'badge-info',
    SUBMITTED_TO_ADMIN: 'badge-info',
    WITH_ADMIN: 'badge-warning',
    REJECTED_BY_ADMIN: 'badge-danger',
    WITH_CLIENT: 'badge-info',
    L1_SCHEDULED: 'badge-warning',
    L1_COMPLETED: 'badge-info',
    L1_SHORTLIST: 'badge-success',
    L1_REJECT: 'badge-danger',
    INTERVIEW_SCHEDULED: 'badge-warning',
    SELECTED: 'badge-success',
    ONBOARDED: 'badge-success',
    REJECTED_BY_CLIENT: 'badge-danger',
    ON_HOLD: 'badge-neutral',
    SCREEN_REJECT: 'badge-danger',
    INTERVIEW_BACK_OUT: 'badge-danger',
    OFFER_BACK_OUT: 'badge-danger',
    EXIT: 'badge-danger',
};

const PRIORITY_MAP: Record<string, string> = {
    URGENT: 'badge-danger',
    HIGH: 'badge-warning',
    MEDIUM: 'badge-info',
    LOW: 'badge-neutral',
};

type BadgeType = 'request' | 'candidate' | 'priority';

interface StatusBadgeProps {
    value: string | null | undefined;
    type: BadgeType;
}

export function StatusBadge({ value, type }: StatusBadgeProps) {
    if (!value) return <span className="badge badge-neutral">—</span>;

    const map =
        type === 'request'
            ? REQUEST_STATUS_MAP
            : type === 'candidate'
                ? CANDIDATE_STATUS_MAP
                : PRIORITY_MAP;

    const colorClass = map[value] ?? 'badge-neutral';
    const label = value.replace(/_/g, ' ');

    return <span className={`badge ${colorClass}`}>{label}</span>;
}
