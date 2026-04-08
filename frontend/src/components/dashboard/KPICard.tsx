import { cn } from '../../lib/utils';

export interface KPICardProps {
    label: string;
    value: number | string;
    accent: string;
    sub: string;
    subColor?: string;
    subClassName?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    gradient?: string;
}

/** Brand-styled KPI card with a colored gradient top-border accent */
export function KPICard({ label, value, accent, sub, subColor, subClassName, icon: Icon, gradient }: KPICardProps) {
    const subCls = subClassName || subColor;
    return (
        <div className="bg-surface rounded-xl border border-border relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 cursor-default group">
            {/* Gradient accent bar at top */}
            <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: gradient || accent }}
            />
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
                    {/* Use div/Counter not h3 so global heading color (--color-text) never hides the metric */}
                    <div
                        className="font-heading text-3xl font-extrabold mt-1.5 tabular-nums leading-tight"
                        style={{ color: accent }}
                    >
                        {value}
                    </div>
                </div>
                <div
                    className="p-2.5 rounded-xl transition-colors shrink-0"
                    style={{ backgroundColor: `${accent}10` }}
                >
                    <span style={{ color: accent }}><Icon size={22} /></span>
                </div>
            </div>
            <p className={cn('text-[10px] font-semibold mt-3 uppercase tracking-wider', subCls || 'text-text-muted')}>
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
