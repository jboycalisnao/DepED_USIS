type LearnerHelpTicketSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  referenceNo: string;
};

export function LearnerHelpTicketSuccessModal({ open, onClose, referenceNo }: LearnerHelpTicketSuccessModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="alert-modal alert-modal--success" role="alertdialog" aria-modal="true" aria-labelledby="learner-help-ticket-success-title">
        <div className="alert-modal__icon" aria-hidden="true">
          <span className="material-symbols-outlined">check_circle</span>
        </div>
        <div className="alert-modal__content">
          <h3 id="learner-help-ticket-success-title">Ticket Submitted</h3>
          <p>Your help ticket has been saved. Reference No. {referenceNo}.</p>
        </div>
        <div className="alert-modal__actions">
          <button type="button" className="alert-modal__blue" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
