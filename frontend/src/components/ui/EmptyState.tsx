import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
    title?: string;
    message?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
}

export function EmptyState({
    title = 'No Records Found',
    message = 'We couldn\'t find any data matching your current view.',
    icon: Icon = Inbox,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
            <div className="w-20 h-20 bg-surface-hover rounded-3xl flex items-center justify-center mb-6 border border-border/50 shadow-inner">
                <Icon size={40} className="text-text-muted opacity-40" />
            </div>
            <h3 className="text-lg font-bold text-text mb-2">{title}</h3>
            <p className="text-sm text-text-muted max-w-sm mb-8 leading-relaxed">
                {message}
            </p>
            {action && (
                <div className="animate-slide-up">
                    {action}
                </div>
            )}
        </div>
    );
}
