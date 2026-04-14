import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

/** Inner column width inside the card — wider = less empty margin on large screens */
export type FormPageContentWidth = 'full' | 'comfortable' | 'compact';

const contentWidthClass: Record<FormPageContentWidth, string> = {
    full: 'w-full',
    /** ~56rem: good for multi-column forms without huge side gutters */
    comfortable: 'w-full max-w-4xl',
    /** ~36rem: short admin forms */
    compact: 'w-full max-w-xl',
};

export interface FormPageLayoutProps {
    backHref: string;
    backLabel: string;
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    contentWidth?: FormPageContentWidth;
    className?: string;
}

/**
 * Shared shell for create/edit routes: matches list pages (icon chip + title + subtitle) and uses a full-width card with a bounded form column to avoid excessive whitespace.
 */
export function FormPageLayout({
    backHref,
    backLabel,
    title,
    description,
    icon: Icon,
    children,
    contentWidth = 'comfortable',
    className,
}: FormPageLayoutProps) {
    return (
        <div className={cn('space-y-4 animate-fade-in w-full', className)}>
            <header className="flex flex-col gap-1">
                <Link
                    to={backHref}
                    className="text-sm font-medium text-cta hover:underline w-fit rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cta/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    ← {backLabel}
                </Link>
                <div className="flex items-start gap-3 mt-1.5">
                    {Icon ? (
                        <div
                            className="p-2 rounded-lg bg-cta/10 text-cta shrink-0"
                            aria-hidden
                        >
                            <Icon size={22} strokeWidth={2} />
                        </div>
                    ) : null}
                    <div className="min-w-0 flex-1 pt-0.5">
                        <h1 className="text-xl font-bold text-text tracking-tight">{title}</h1>
                        {description ? (
                            <p className="text-sm text-text-muted mt-1 leading-snug">{description}</p>
                        ) : null}
                    </div>
                </div>
            </header>

            <div className="card w-full p-5 md:p-6 border border-border">
                <div className={cn(contentWidthClass[contentWidth], 'min-w-0')}>{children}</div>
            </div>
        </div>
    );
}

export function FormPageLoadingCard({ label }: { label: string }) {
    return (
        <div className="card w-full py-16 md:py-20 flex flex-col items-center justify-center gap-3 border border-border">
            <div className="spinner w-8 h-8 border-cta" aria-hidden />
            <p className="text-text-muted text-sm">{label}</p>
        </div>
    );
}
