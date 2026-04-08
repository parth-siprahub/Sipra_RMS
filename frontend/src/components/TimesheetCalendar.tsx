import { useMemo } from 'react';
import { cn } from '../lib/utils';

interface CalendarEntry {
    log_date: string;
    hours_logged: number;
    is_ooo: boolean;
}

interface TimesheetCalendarProps {
    entries: CalendarEntry[];
    month: string; // "YYYY-MM"
    employeeName?: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TimesheetCalendar({ entries, month, employeeName }: TimesheetCalendarProps) {
    const { daysInMonth, startDay, entryMap, totalHours, totalOoo, workingDays } = useMemo(() => {
        const [y, m] = month.split('-').map(Number);
        const dim = new Date(y, m, 0).getDate();
        const sd = new Date(y, m - 1, 1).getDay();

        const map = new Map<number, CalendarEntry>();
        let total = 0;
        let ooo = 0;
        let wd = 0;
        for (const e of entries) {
            const day = parseInt(e.log_date.split('-')[2], 10);
            map.set(day, e);
            total += e.hours_logged;
            if (e.is_ooo) ooo++;
            else if (e.hours_logged > 0) wd++;
        }

        return { year: y, mo: m, daysInMonth: dim, startDay: sd, entryMap: map, totalHours: total, totalOoo: ooo, workingDays: wd };
    }, [entries, month]);

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div className="card">
            {employeeName && (
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-text">{employeeName}</h3>
                    <div className="flex gap-4 text-xs text-text-muted">
                        <span>{workingDays} days worked</span>
                        <span>{totalOoo} OOO</span>
                        <span className="font-medium text-text">{totalHours.toFixed(1)}h total</span>
                    </div>
                </div>
            )}

            <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAY_LABELS.map(d => (
                        <div key={d} className="text-center text-xs font-medium text-text-muted py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {cells.map((day, idx) => {
                        if (day === null) {
                            return <div key={`empty-${idx}`} className="aspect-square" />;
                        }

                        const entry = entryMap.get(day);
                        const isWeekend = (startDay + day - 1) % 7 === 0 || (startDay + day - 1) % 7 === 6;

                        let bgClass = 'bg-surface-hover/30';
                        let textColor = 'text-text-muted';

                        if (entry) {
                            if (entry.is_ooo) {
                                bgClass = 'bg-warning/15';
                                textColor = 'text-warning';
                            } else if (entry.hours_logged >= 8) {
                                bgClass = 'bg-success/15';
                                textColor = 'text-success';
                            } else if (entry.hours_logged >= 6) {
                                bgClass = 'bg-cta/15';
                                textColor = 'text-cta';
                            } else if (entry.hours_logged > 0) {
                                bgClass = 'bg-danger/15';
                                textColor = 'text-danger';
                            }
                        } else if (isWeekend) {
                            bgClass = 'bg-transparent';
                        }

                        return (
                            <div
                                key={day}
                                className={cn(
                                    "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-colors",
                                    bgClass
                                )}
                                title={entry ? (entry.is_ooo ? `Day ${day}: OOO` : `Day ${day}: ${entry.hours_logged.toFixed(1)}h`) : `Day ${day}`}
                            >
                                <span className={cn("font-medium", isWeekend && !entry ? "text-text-muted/50" : "text-text")}>
                                    {day}
                                </span>
                                {entry && (
                                    <span className={cn("text-[10px] font-bold leading-none mt-0.5", textColor)}>
                                        {entry.is_ooo ? 'OOO' : `${entry.hours_logged.toFixed(1)}h`}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-success/15 border border-success/30" /> 8h+
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-cta/15 border border-cta/30" /> 6-8h
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-danger/15 border border-danger/30" /> &lt;6h
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-warning/15 border border-warning/30" /> OOO
                    </span>
                </div>
            </div>
        </div>
    );
}
