import React from 'react';

type TopCenterAlertProps = {
  open: boolean;
  title: string;
  message: string;
  type?: 'primary' | 'danger' | 'accent';
  onClose: () => void;
};

const iconByType: Record<NonNullable<TopCenterAlertProps['type']>, string> = {
  primary: 'info',
  danger: 'warning',
  accent: 'priority_high',
};

const classByType: Record<NonNullable<TopCenterAlertProps['type']>, string> = {
  primary: 'alert-modal--success',
  danger: 'alert-modal--danger',
  accent: 'alert-modal--warning',
};

export default function TopCenterAlert({ open, title, message, type = 'danger', onClose }: TopCenterAlertProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`alert-modal ${classByType[type]}`} role="alertdialog" aria-modal="true" aria-live="assertive">
        <div className="alert-modal__icon" aria-hidden="true">
          <span className="material-symbols-outlined">{iconByType[type]}</span>
        </div>
        <div className="alert-modal__content">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
        <div className="alert-modal__actions">
          <button type="button" className="alert-modal__blue" onClick={onClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
