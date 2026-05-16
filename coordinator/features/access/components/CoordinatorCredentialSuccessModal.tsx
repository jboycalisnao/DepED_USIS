import { useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password?: string;
    accessLevel: string;
    credentialType: string;
  };
}

export function CoordinatorCredentialSuccessModal({ isOpen, onClose, data }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const roleText = 'school';
  const typeText = data.credentialType === 'registrar' ? 'Registrar account' : 'USIS Coordinator';

  const summaryText = `DepED USIS - Coordinator Portal

You have been registered to the DepEd Unified School Information System (USIS), with the following information:

Please sign in to your ${roleText} as ${typeText} with the following credentials:

Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Username: ${data.username}
Password: ${data.password || '(Managed by Administrator)'} (Please reset after first sign in).

Thank you for ensuring the DepEd delivers quality education.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Credential summary">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Account Created Successfully</p>
            <h3>Credential Summary</h3>
          </div>
        </div>
        <div className="modal-dialog__body">
          <p className="registry-copy">The account has been created. Please copy the summary below and share it securely with the user.</p>
          <div className="modal-record" style={{ marginTop: 12 }}>
            <pre className="credential-summary-text" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{summaryText}</pre>
          </div>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__blue" onClick={handleCopy}>
            {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
          </button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
