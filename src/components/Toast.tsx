import { useEffect } from 'react';
import { IconCheck, IconInfo, IconX } from './Icons';

export interface ToastState {
  message: string;
  kind?: 'success' | 'error' | 'info';
  id: number;
}

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  const kind = toast.kind ?? 'info';

  return (
    <div className={`toast toast-${kind}`} role="status" key={toast.id}>
      <span className="toast-icon">
        {kind === 'success' ? (
          <IconCheck size={16} />
        ) : kind === 'error' ? (
          <IconX size={16} />
        ) : (
          <IconInfo size={16} />
        )}
      </span>
      <span>{toast.message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">
        <IconX size={14} />
      </button>
    </div>
  );
}
