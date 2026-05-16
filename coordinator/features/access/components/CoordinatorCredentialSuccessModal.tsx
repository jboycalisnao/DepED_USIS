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
    <div className="modal-overlay">
      <div className="modal-content section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <p className="section-card__eyebrow">Account Created Successfully</p>
          <h3 className="admin-shell__title" style={{ margin: '8px 0 16px' }}>Credential Summary</h3>
          
          <p className="registry-copy" style={{ marginBottom: '20px' }}>
            The account has been created. Please copy the summary below and share it securely with the user.
          </p>

          <div className="credential-summary-box">
            <pre className="credential-summary-text">{summaryText}</pre>
          </div>

          <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              className="admin-shell__logout" 
              onClick={handleCopy}
              style={{ background: copied ? '#0f6b3c' : 'var(--deped-blue)' }}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
            </button>
            <button 
              className="admin-shell__logout" 
              onClick={onClose}
              style={{ background: 'transparent', border: '1px solid var(--deped-line)', color: 'var(--deped-ink)' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(18, 35, 61, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          width: 100%;
          max-width: 600px;
          box-shadow: var(--deped-shadow);
        }
        .credential-summary-box {
          background: #f8fafc;
          border: 1px solid var(--deped-line);
          border-radius: 8px;
          padding: 16px;
          max-height: 300px;
          overflow-y: auto;
        }
        .credential-summary-text {
          margin: 0;
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 13px;
          line-height: 1.5;
          color: var(--deped-ink);
        }
      `}} />
    </div>
  );
}
