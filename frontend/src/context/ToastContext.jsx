import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);

  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,.18)',
              fontSize: '.88rem', fontWeight: 600,
              minWidth: 220, maxWidth: 340,
              pointerEvents: 'all', cursor: 'pointer',
              animation: 'slideInToast .2s ease',
              ...TOAST_STYLES[toast.type] || TOAST_STYLES.info,
            }}
            onClick={() => removeToast(toast.id)}
          >
            <i className={`bi ${TOAST_ICONS[toast.type] || TOAST_ICONS.info}`} style={{ fontSize: '1rem', flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{toast.message}</span>
            <i className="bi bi-x" style={{ fontSize: '.9rem', opacity: .6, flexShrink: 0 }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const TOAST_STYLES = {
  success: { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
  error:   { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
  info:    { background: '#cce5ff', color: '#004085', border: '1px solid #b8daff' },
  warning: { background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' },
};

const TOAST_ICONS = {
  success: 'bi-check-circle-fill',
  error:   'bi-x-circle-fill',
  info:    'bi-info-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
};