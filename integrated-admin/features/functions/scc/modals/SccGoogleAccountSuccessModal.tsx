import { useState } from 'react';
import { createPortal } from 'react-dom';

export type SccGoogleAccountSuccessInfo = {
  action: 'created' | 'updated';
  userId?: string;
  primaryEmail: string;
  tempPassword?: string;
  orgUnitPath?: string;
  trackingNumber?: string;
  notificationSummary?: {
    sentTo: string[];
    ccSent?: string[];
    error?: string;
  };
};

type SccGoogleAccountSuccessModalProps = {
  info: SccGoogleAccountSuccessInfo | null;
  onClose: () => void;
};

export function SccGoogleAccountSuccessModal({
  info,
  onClose,
}: SccGoogleAccountSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!info) return null;

  const title =
    info.action === 'updated'
      ? 'Google Workspace Account Updated'
      : 'Google Workspace Account Created';

  const handleCopy = async () => {
    const lines = [
      'Google Workspace Credentials (Leon NHS)',
      `Email: ${info.primaryEmail}`,
      info.tempPassword ? `Temporary Password: ${info.tempPassword}` : '',
      info.orgUnitPath ? `Organizational Unit: ${info.orgUnitPath}` : '',
      'Sign In: https://mail.google.com',
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="alert-modal alert-modal--success"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="ia-scc-success-modal__head">
          <div className="alert-modal__icon ia-scc-success-modal__icon" aria-hidden="true">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="alert-modal__content">
            <h3>{title}</h3>
            <p>
              {info.trackingNumber
                ? `Request ${info.trackingNumber} has been provisioned and synced.`
                : 'The account is now active in Google Workspace Admin Console.'}
            </p>
          </div>
        </div>

        <div className="modal-record__fields">
          <div className="modal-record__field">
            <span>Primary Email</span>
            <strong className="ia-scc-mono-break">{info.primaryEmail}</strong>
          </div>

          {info.tempPassword ? (
            <div className="modal-record__field">
              <span>Temporary Password</span>
              <strong className="ia-scc-mono-break">{info.tempPassword}</strong>
            </div>
          ) : null}

          {info.orgUnitPath ? (
            <div className="modal-record__field">
              <span>Organizational Unit</span>
              <strong>{info.orgUnitPath}</strong>
            </div>
          ) : null}

          {info.userId ? (
            <div className="modal-record__field">
              <span>Directory User ID</span>
              <strong className="ia-scc-mono-break">{info.userId}</strong>
            </div>
          ) : null}

          {info.notificationSummary ? (
            <div className="modal-record__field">
              <span>Officer Email Notification</span>
              {info.notificationSummary.error ? (
                <strong style={{ color: '#b42318' }}>
                  Failed: {info.notificationSummary.error}
                </strong>
              ) : (
                <strong className="ia-scc-mono-break">
                  Sent to {info.notificationSummary.sentTo.join(', ')}
                  {info.notificationSummary.ccSent && info.notificationSummary.ccSent.length > 0
                    ? ` (CC: ${info.notificationSummary.ccSent.join(', ')})`
                    : ''}
                </strong>
              )}
            </div>
          ) : null}
        </div>

        <div className="alert-modal__actions">
          <button type="button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Credentials'}
          </button>
          <button type="button" className="alert-modal__blue" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
