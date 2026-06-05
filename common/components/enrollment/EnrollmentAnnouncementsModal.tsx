import { EnrollmentAnnouncementsBox } from './EnrollmentAnnouncementsBox';
import type { EnrollmentAnnouncement } from '../../types/enrollmentAnnouncements';

type Props = {
  open: boolean;
  announcements: EnrollmentAnnouncement[];
  onClose: () => void;
  continueLabel?: string;
};

export function EnrollmentAnnouncementsModal({
  open,
  announcements,
  onClose,
  continueLabel = 'Continue',
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="enrollment-announcements-modal-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Enrollment Procedures</p>
            <h3 id="enrollment-announcements-modal-title">Enrollment Announcements</h3>
          </div>
        </div>
        <div className="modal-dialog__body">
          <p>Posted by the registrar for enrollment procedures.</p>
          <EnrollmentAnnouncementsBox
            announcements={announcements}
            className="enrollment-announcements--modal"
            hideHeader
          />
        </div>
        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__blue" onClick={onClose}>
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
