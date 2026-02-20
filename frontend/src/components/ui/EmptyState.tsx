import { Inbox } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
    message?: string;
    action?: React.ReactNode;
}

export function EmptyState({
    message = 'No data found',
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-text-muted">
            <Inbox size={40} className="opacity-40" />
            <p className="text-sm">{message}</p>
            {action}
        </div>
    );
}
