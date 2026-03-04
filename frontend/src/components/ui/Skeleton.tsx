import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden bg-surface-hover rounded-lg border border-border/5",
                "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
                className
            )}
        />
    );
}

export function CardSkeleton() {
    return (
        <div className="card p-5 space-y-4">
            <div className="flex justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-12 w-12 rounded-2xl" />
            </div>
            <Skeleton className="h-3 w-32 mt-4" />
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <div className="flex items-center gap-4 py-4 px-2 border-b border-border/50">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
    );
}

export function KanbanCardSkeleton() {
    return (
        <div className="card p-3 space-y-3 animate-fade-in">
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="pt-2 flex justify-between items-center">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-12" />
            </div>
        </div>
    );
}

export function KanbanColumnSkeleton() {
    return (
        <div className="flex flex-col min-w-[220px] w-[220px] bg-surface/50 rounded-2xl border border-border shrink-0 p-2 space-y-3">
            <div className="px-3 py-2 flex items-center justify-between border-b border-border/10">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <KanbanCardSkeleton />
            <KanbanCardSkeleton />
            <KanbanCardSkeleton />
        </div>
    );
}

