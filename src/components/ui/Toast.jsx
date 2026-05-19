import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

function ToastItem({ id, kind = 'info', title, message, onClose }) {
  const colors = {
    success: { bd: 'var(--success)',  bg: 'var(--success-bg)' },
    info:    { bd: 'var(--mp-blue)',  bg: 'var(--mp-blue-50)' },
    warn:    { bd: 'var(--warning)',  bg: 'var(--warning-bg)' },
    error:   { bd: 'var(--error)',    bg: 'var(--error-bg)' },
  };
  const c = colors[kind] ?? colors.info;
  return (
    <div style={{
      width: 360,
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${c.bd}`,
      borderRadius: 12,
      boxShadow: 'var(--shadow-modal)',
      padding: 16,
      display: 'flex',
      gap: 12,
      animation: 'mp-toast-in 200ms ease-out',
    }}>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)', marginBottom: message ? 4 : 0 }}>
            {title}
          </div>
        )}
        {message && (
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{message}</div>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        style={{ background: 'none', border: 0, color: 'var(--text-3)', padding: 0, cursor: 'pointer', flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ kind = 'info', title, message, duration = 4000 }) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, kind, title, message }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem {...t} onClose={dismiss}/>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes mp-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
