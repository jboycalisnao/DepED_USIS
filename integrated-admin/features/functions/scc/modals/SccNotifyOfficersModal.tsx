import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { IaSccOrganization } from '../types';
import { useOfficerRecipients } from '../hooks/useOfficerRecipients';
import { OfficerNotificationBox } from '../components/OfficerNotificationBox';
import { sendOfficerEmailNotification } from '../services/iaSccService';
import { buildCustomOfficerAnnouncementEmail } from '../utils/sccNotificationTemplates';

type SccNotifyOfficersModalProps = {
  organization: IaSccOrganization | null;
  onClose: () => void;
  onSent?: (sentTo: string[], ccSent: string[]) => void;
};

export function SccNotifyOfficersModal({
  organization,
  onClose,
  onSent,
}: SccNotifyOfficersModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notify = useOfficerRecipients({
    organizationId: organization?.id,
    organizationAcronym: organization?.acronym,
    organizationName: organization?.name,
    adviserEmail: organization?.adviserEmail,
    enabled: Boolean(organization),
    defaultChecked: true,
  });

  useEffect(() => {
    if (!organization) return;
    setErrorMsg(null);
    setSubject(`[Leon NHS USIS SCC • ${organization.acronym}] Official Officer Notification`);
    setMessage(
      [
        `Good day, ${organization.name} (${organization.acronym}) Officers,`,
        '',
        '',
        '',
        'Respectfully,',
        'Leon NHS USIS — Integrated Admin (SCC)',
        'Leon National High School',
      ].join('\n'),
    );
  }, [organization]);

  if (!organization) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!notify.smtpStatus?.configured) {
      setErrorMsg('Email notification service is not configured.');
      return;
    }
    if (notify.effectiveTo.length === 0) {
      setErrorMsg(
        'Please select at least one registered officer email or enter an email address.',
      );
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setErrorMsg('Subject and message body are required.');
      return;
    }

    try {
      setIsSending(true);
      setSendProgress(
        notify.effectiveTo.length > 1 ? { sent: 0, total: notify.effectiveTo.length } : null,
      );
      const mail = buildCustomOfficerAnnouncementEmail({
        organizationName: organization.name,
        organizationAcronym: organization.acronym,
        subject: subject.trim(),
        message: message.trim(),
      });
      const res = await sendOfficerEmailNotification({
        to: notify.effectiveTo,
        cc: notify.effectiveCc,
        replyTo: organization.adviserEmail || undefined,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        onProgress: ({ sent, total }) => {
          setSendProgress({ sent, total });
        },
      });
      onSent?.(res.sentTo, res.ccSent);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to send email notification.');
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide ia-scc-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Send Email Notification to ${organization.acronym} Officers`}
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">
              {organization.name} ({organization.acronym}) • Officer Notification
            </p>
            <h3>Notify Registered Officers</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-dialog__body ia-scc-modal__body">
          {errorMsg ? (
            <div className="ia-scc-alert ia-scc-alert--danger" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{errorMsg}</span>
            </div>
          ) : null}

          <div className="ia-scc-form-stack">
            <OfficerNotificationBox
              title="Send email notification to selected officer recipients"
              smtpStatus={notify.smtpStatus}
              recipients={notify.recipients}
              allOfficersCount={notify.allOfficersCount}
              selectedEmails={notify.selectedEmails}
              presetMode={notify.presetMode}
              includeAdviser={notify.includeAdviser}
              adviserEmail={organization.adviserEmail}
              manualEmail={notify.manualEmail}
              notifyEnabled={true}
              isLoading={notify.isLoading}
              onToggleNotify={() => {}}
              onApplyPreset={notify.applyPreset}
              onToggleEmail={notify.toggleEmail}
              onToggleAdviser={notify.setIncludeAdviser}
              onManualEmailChange={notify.setManualEmail}
            />

            <label className="floating-field">
              <input
                type="text"
                placeholder=" "
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <span>Email Subject *</span>
            </label>

            <label className="floating-field">
              <textarea
                rows={7}
                placeholder=" "
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <span>Notification Message *</span>
            </label>
          </div>
          </div>

          <div className="modal-dialog__actions ia-scc-modal__actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isSending}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={isSending || !notify.smtpStatus?.configured || notify.effectiveTo.length === 0}
            >
              {isSending
                ? sendProgress && sendProgress.total > 1
                  ? `Sending Queued (${sendProgress.sent}/${sendProgress.total})...`
                  : 'Sending Email Notification...'
                : `Send Notification (${notify.effectiveTo.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
