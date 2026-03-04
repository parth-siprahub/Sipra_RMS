import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
    footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', footer }: ModalProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handler);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className={`w-full ${maxWidth}`}
                style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '1rem',
                    boxShadow: 'var(--shadow-xl)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '88vh',
                    animation: 'modalIn 200ms cubic-bezier(0.34, 1.1, 0.64, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div
                    className="flex items-center justify-between flex-shrink-0"
                    style={{
                        padding: '1.125rem 1.5rem',
                        borderBottom: '1px solid var(--color-border)',
                    }}
                >
                    <h2
                        id="modal-title"
                        style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            margin: 0,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                                'var(--color-surface-active)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Body (scrollable) ── */}
                <div
                    className="flex-1 overflow-y-auto custom-scrollbar"
                    style={{ padding: '1.25rem 1.5rem' }}
                >
                    {children}
                </div>

                {/* ── Footer (optional) ── */}
                {footer && (
                    <div
                        className="flex-shrink-0 flex items-center justify-end gap-2.5"
                        style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-background)',
                            borderRadius: '0 0 1rem 1rem',
                        }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
