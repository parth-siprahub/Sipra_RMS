import { cn } from '../../lib/utils';

export interface KPICardProps {
    label: string;
    value: number | string;
    accent: string;
    sub: string;
    subColor?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    gradient?: string;
}

/** Brand-styled KPI card with a colored gradient top-border accent */
export function KPICard({ label, value, accent, sub, subColor, icon: Icon, gradient }: KPICardProps) {
    return (
        <div className="bg-surface rounded-xl border border-border relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 cursor-default group">
            {/* Gradient accent bar at top */}
            <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: gradient || accent }}
            />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
                    <h3
                        className="text-3xl font-extrabold mt-1.5"
                        style={{ color: accent }}
                    >
                        {value}
                    </h3>
                </div>
                <div
                    className="p-2.5 rounded-xl transition-colors"
                    style={{ backgroundColor: `${accent}10` }}
                >
                    <Icon size={22} style={{ color: accent }} />
                </div>
            </div>
            <p className={cn('text-[10px] font-semibold mt-3 uppercase tracking-wider', subColor || 'text-text-muted')}>
                {sub}
            </p>
        </div>
    );
}

/** Brand accent colors matching the SipraHub dashboard theme */
export const KPI_ACCENT_COLORS = {
    red: '#CC1A24',
    green: '#16A34A',
    orange: '#EA580C',
    purple: '#7C3AED',
    blue: '#2563EB',
};

/** Gradient variants for the KPI accent bar */
export const KPI_GRADIENTS = {
    red: 'linear-gradient(90deg, #CC1A24, #FF5C5C)',
    green: 'linear-gradient(90deg, #0F9D58, #34D399)',
    orange: 'linear-gradient(90deg, #E37400, #F4B400)',
    purple: 'linear-gradient(90deg, #7B2FBE, #A78BFA)',
    blue: 'linear-gradient(90deg, #1967D2, #60A5FA)',
};
