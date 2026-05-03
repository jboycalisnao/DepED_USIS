
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'primary' | 'danger' | 'accent';
  isLoading?: boolean;
  hideCancel?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'primary',
  isLoading = false,
  hideCancel = false
}) => {
  if (!isOpen) return null;

  const alertTypeClasses = {
    primary: 'alert-modal--success',
    danger: 'alert-modal--danger',
    accent: 'alert-modal--warning',
  };

  const icons = {
    primary: 'info',
    danger: 'warning',
    accent: 'priority_high',
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onCancel} />

      <div className={`alert-modal ${alertTypeClasses[type]}`} role="alertdialog" aria-modal="true" aria-labelledby="registrar-alert-title">
        <div className="alert-modal__icon" aria-hidden="true">
          <span className="material-symbols-outlined">{icons[type]}</span>
        </div>
        <div className="alert-modal__content">
          <h3 id="registrar-alert-title">{title}</h3>
          <p>{message}</p>
        </div>

        <div className="alert-modal__actions">
          {!hideCancel && (
            <button type="button" onClick={onCancel} disabled={isLoading}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={type === 'primary' ? 'alert-modal__blue' : 'alert-modal__primary'}
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
