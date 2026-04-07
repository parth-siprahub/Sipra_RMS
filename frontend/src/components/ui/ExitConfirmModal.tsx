import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from './Modal';
import type { ExitPayload } from '../../api/candidates';

interface ExitConfirmModalProps {
    isOpen: boolean;
    candidateName: string;
    onConfirm: (payload: ExitPayload) => Promise<void>;
    onCancel: () => void;
}

export function ExitConfirmModal({ isOpen, candidateName, onConfirm, onCancel }: ExitConfirmModalProps) {
    const todayIso = new Date().toISOString().split('T')[0];
    const [exitDate, setExitDate] = useState<string>(todayIso);
    const [exitReason, setExitReason] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    // Reset form each time the modal opens
    useEffect(() => {
        if (isOpen) {
            setExitDate(todayIso);
            setExitReason('');
        }
    }, [isOpen, todayIso]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!exitDate) return;
        setSubmitting(true);
        try {
            await onConfirm({
                last_working_day: exitDate,
                ...(exitReason.trim() ? { exit_reason: exitReason.trim() } : {}),
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title="Confirm Exit"
            maxWidth="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Warning Banner */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20">
                    <LogOut size={18} className="text-danger shrink-0 mt-0.5" />
                    <p className="text-sm text-text">
                        You are marking <span className="font-semibold">{candidateName}</span> as{' '}
                        <span className="font-semibold text-danger">Exited</span>. This will update their
                        employee record. You can revert this if needed.
                    </p>
                </div>

                {/* Exit Date */}
                <div>
                    <label className="input-label" htmlFor="exit-date">
                        Last Working Day <span className="text-danger">*</span>
                    </label>
                    <input
                        id="exit-date"
                        type="date"
                        required
                        value={exitDate}
                        max={todayIso}
                        onChange={(e) => setExitDate(e.target.value)}
                        className="input-field mt-1"
                    />
                    <p className="text-[11px] text-text-muted mt-1">Defaults to today. Change to the actual last working day.</p>
                </div>

                {/* Exit Reason (optional) */}
                <div>
                    <label className="input-label" htmlFor="exit-reason">
                        Exit Reason <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <input
                        id="exit-reason"
                        type="text"
                        value={exitReason}
                        onChange={(e) => setExitReason(e.target.value)}
                        placeholder="e.g. Resigned, Project end, Contract closure"
                        className="input-field mt-1"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn btn-secondary flex-1"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn flex-1 bg-danger text-white hover:bg-danger/90 font-semibold"
                        disabled={submitting || !exitDate}
                    >
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Confirm Exit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
