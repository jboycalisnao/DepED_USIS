import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import type { HelpTicketRecord, HelpTicketStatus } from '../../tickets/services/ticketStore';

type Props = {
  adminNotes: string;
  isSaving: boolean;
  onClose: () => void;
  onAdminNotesChange: (value: string) => void;
  onResetStatus: () => void;
  onRequestDelete: () => void;
  onRequestSave: () => void;
  onTicketStatusChange: (value: HelpTicketStatus) => void;
  statusOptions: Array<{ label: string; value: HelpTicketStatus }>;
  ticket: HelpTicketRecord;
  ticketStatus: HelpTicketStatus;
};

const toStatusTone = (status: HelpTicketStatus) => {
  if (status === 'Resolved') return 'success';
  if (status === 'In Review') return 'warning';
  if (status === 'Closed') return 'closed';
  return 'open';
};

const formatDateTime = (value: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

export function TicketActionModal({
  adminNotes,
  isSaving,
  onClose,
  onAdminNotesChange,
  onResetStatus,
  onRequestDelete,
  onRequestSave,
  onTicketStatusChange,
  statusOptions,
  ticket,
  ticketStatus,
}: Props) {
  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide school-help-portal-ticket-modal" role="dialog" aria-modal="true" aria-label="Selected ticket actions">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Selected Ticket</p>
            <h3>{ticket.referenceNo}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close ticket modal">
            <span aria-hidden="true">x</span>
          </button>
        </div>

        <div className="modal-dialog__body school-help-portal-ticket-modal__body">
          <div className="school-help-portal-ticket-modal__summary">
            <div>
              <span>Learner</span>
              <strong>{ticket.learnerName || '-'}</strong>
            </div>
            <div>
              <span>LRN</span>
              <strong>{ticket.learnerLrn || '-'}</strong>
            </div>
            <div>
              <span>Grade</span>
              <strong>{ticket.gradeLevel || '-'}</strong>
            </div>
            <div>
              <span>Section</span>
              <strong>{ticket.section || '-'}</strong>
            </div>
            <div>
              <span>Category</span>
              <strong>{ticket.category || '-'}</strong>
            </div>
            <div>
              <span>Submitted</span>
              <strong>{formatDateTime(ticket.createdAt)}</strong>
            </div>
          </div>

          <div className="school-help-portal-ticket-modal__body-grid">
            <div className="school-help-portal-ticket-modal__card">
              <span>Subject</span>
              <p>{ticket.subject || '-'}</p>
            </div>
            <div className="school-help-portal-ticket-modal__card">
              <span>Contact</span>
              <p>{ticket.contactNo || '-'}</p>
            </div>
            <div className="school-help-portal-ticket-modal__card school-help-portal-ticket-modal__card--full">
              <span>Details</span>
              <p>{ticket.details || '-'}</p>
            </div>
          </div>

          <div className="school-help-portal-ticket-modal__status-row">
            <span className={`status-badge status-badge--${toStatusTone(ticketStatus)}`}>{ticketStatus}</span>
            <span className="school-help-portal-ticket-modal__status-copy">
              Last update: {formatDateTime(ticket.updatedAt || ticket.resolvedAt || ticket.createdAt)}
            </span>
          </div>

          {ticket.adminNotes ? (
            <div className="school-help-portal-ticket-modal__admin-note">
              <span>Admin Note</span>
              <p>{ticket.adminNotes}</p>
            </div>
          ) : null}

          <div className="school-help-portal-ticket-modal__actions">
            <UsisSearchableSelect
              ariaLabel="Update Ticket Status"
              label="Update Ticket Status"
              floatingLabel
              showLabel={false}
              allowTyping
              value={ticketStatus}
              onChange={(value) => onTicketStatusChange(value as HelpTicketStatus)}
              options={statusOptions}
            />

            <label className="floating-field school-help-portal-ticket-modal__notes">
              <div className="floating-field__control">
                <textarea value={adminNotes} onChange={(event) => onAdminNotesChange(event.target.value)} placeholder=" " rows={5} />
                <span>Admin Notes</span>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-dialog__actions school-help-portal-ticket-modal__footer">
          <button type="button" className="modal-dialog__danger" onClick={onRequestDelete} disabled={isSaving}>
            Delete Ticket
          </button>
          <button type="button" className="modal-dialog__blue" onClick={onResetStatus} disabled={isSaving}>
            Reset Status
          </button>
          <button type="button" className="modal-dialog__primary" onClick={onRequestSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Ticket Action'}
          </button>
        </div>
      </div>
    </div>
  );
}
