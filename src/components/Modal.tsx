import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from './Icons';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title: string;
}

export function Modal({ onClose, children, className = '', title }: ModalProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'textarea, input, button:not(.modal-close)',
      );
      focusable?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        ref={panelRef}
      >
        <h2 className="sr-only" id={id}>
          {title}
        </h2>
        <button type="button" className="modal-close icon-btn" onClick={onClose} aria-label="Close dialog">
          <IconX size={19} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
