import { useEffect } from 'react';

export default function Modal({ open, onClose, children, width = 480, label }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid',
                placeItems: 'center',
                padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: width,
                    background: 'var(--surface-elevated)',
                    borderRadius: 16,
                    boxShadow: 'var(--shadow-modal)',
                    maxHeight: '90vh',
                    overflow: 'auto',
                }}
            >
                {children}
            </div>
        </div>
    );
}
