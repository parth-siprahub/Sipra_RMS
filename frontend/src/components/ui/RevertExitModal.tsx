import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Modal } from './Modal';
import type { CandidateStatus } from '../../api/candidates';

const REVERT_STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
    { value: 'ONBOARDED', label: 'Onboarded (recommended)' },
    { value: 'ON_HOLD', label: 'On Hold' },
];

interface RevertExitModalProps {
    isOpen: boolean;
    candidateName: string;
    onConfirm: (targetStatus: CandidateStatus) => Promise<void>;
    onCancel: () => void;
}

export function RevertExitModal({ isOpen, candidateName, onConfirm, onCancel }: RevertExitModalProps) {
    const [targetStatus, setTargetStatus] = useState<CandidateStatus>('ONBOARDED');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) setTargetStatus('ONBOARDED');
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onConfirm(targetStatus);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title="Revert Exit"
            maxWidth="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Info Banner */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <RotateCcw size={18} className="text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-text">
                        Revert <span className="font-semibold">{candidateName}</span> from{' '}
                        <span className="font-semibold text-danger">Exit</span>? Their employee record
                        will be restored to <span className="font-semibold">Active</span> and the
                        exit date will be cleared.
                    </p>
                </div>

                {/* Target Status Selector */}
                <div>
                    <label className="input-label" htmlFor="revert-status">
                        Restore to Pipeline Status
                    </label>
                    <select
                        id="revert-status"
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as CandidateStatus)}
                        className="input-field mt-1"
                    >
                        {REVERT_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-[11px] text-text-muted mt-1">
                        Select the pipeline stage to move this candidate back to.
                    </p>
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
                        className="btn btn-cta flex-1 font-semibold"
                        disabled={submitting}
                    >
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Revert Exit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
