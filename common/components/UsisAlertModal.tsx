import React from 'react';
import { createPortal } from 'react-dom';

type UsisAlertModalProps = {
  open: boolean;
  title: string;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
};

export function UsisAlertModal({
  open,
  title,
  message,
  tone = 'info',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
}: UsisAlertModalProps) {
  if (!open) return null;

  const toneClass =
    tone === 'success'
      ? 'alert-modal--success'
      : tone === 'warning'
        ? 'alert-modal--warning'
        : tone === 'danger'
          ? 'alert-modal--danger'
          : '';

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`alert-modal ${toneClass}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="alert-modal__content">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
        <div className="alert-modal__actions">
          {onConfirm ? (
            <button type="button" onClick={onClose}>
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            className={onConfirm ? 'alert-modal__primary' : 'alert-modal__blue'}
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

