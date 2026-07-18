
import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const toneClass = variant === 'danger' ? 'alert-modal--danger' : '';
  const confirmClass = variant === 'danger' ? 'alert-modal__danger' : 'alert-modal__blue';

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label={`Cancel ${title}`} />
      <div className={`alert-modal ${toneClass}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="alert-modal__content">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
        <div className="alert-modal__actions">
          <button type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmationModal;

