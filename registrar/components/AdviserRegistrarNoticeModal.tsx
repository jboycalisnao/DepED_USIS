import React from 'react';
import { createPortal } from 'react-dom';

interface AdviserRegistrarNoticeModalProps {
  open: boolean;
  advisoryClassNames: string;
  onContinue: () => void;
}

const AdviserRegistrarNoticeModal: React.FC<AdviserRegistrarNoticeModalProps> = ({
  open,
  advisoryClassNames,
  onContinue,
}) => {
  if (!open) return null;

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" />
      <div
        className="modal-dialog registrar-adviser-notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-adviser-notice-title"
      >
        <div className="modal-dialog__header registrar-adviser-notice-modal__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Teaching Account Notice</p>
            <h3 id="registrar-adviser-notice-title">Adviser Registrar View</h3>
          </div>
        </div>
        <div className="modal-dialog__body registrar-adviser-notice-modal__body">
          <p>
            You are logging in with a teaching account linked to an advisory class. The registrar will open the adviser
            view for <strong>{advisoryClassNames}</strong>.
          </p>
          <p>Please continue to load the adviser registrar workspace.</p>
        </div>
        <div className="modal-dialog__actions registrar-adviser-notice-modal__actions">
          <button type="button" className="modal-dialog__blue" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AdviserRegistrarNoticeModal;
