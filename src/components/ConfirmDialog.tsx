import { IconTrash } from './Icons';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal className="confirm-modal" onClose={onClose} title={title}>
      <div className="confirm-icon">
        <IconTrash size={22} />
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="confirm-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
