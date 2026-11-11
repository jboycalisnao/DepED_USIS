import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { SccServiceRequest, SccSession } from '../../../types';
import { updateSccRequestStatus } from '../../../services/sccSupabase';

interface ProvisionServiceModalProps {
  request: SccServiceRequest | null;
  session: SccSession;
  onClose: () => void;
  onUpdated: (updated: SccServiceRequest) => void;
}

export function ProvisionServiceModal({ request, session, onClose, onUpdated }: ProvisionServiceModalProps) {
  if (!request) return null;

  const defaultAssignedEmail =
    request.serviceKey === 'email_account'
      ? `${(request.details.requestedMailboxAlias || request.organizationAcronym.toLowerCase()).replace(/@.*$/, '')}@leonnhs.edu.ph`
      : '';

  const [assignedEmail, setAssignedEmail] = useState(defaultAssignedEmail);
  const [tempPassword, setTempPassword] = useState(() => `Leonnhs.${new Date().getFullYear()}`);
  const [driveUrl, setDriveUrl] = useState('');
  const [instructions, setInstructions] = useState(
    'Please sign in via Google Workspace (mail.google.com) and set up two-factor authentication upon initial access.',
  );
  const [reviewerRemarks, setReviewerRemarks] = useState(
    'Duly approved and provisioned by the School ICT Coordinator.',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const updated = await updateSccRequestStatus(request.id, {
        status: 'provisioned',
        reviewerRemarks: reviewerRemarks.trim(),
        reviewedBy: session.fullName,
        provisionedData: {
          assignedEmail: assignedEmail.trim(),
          tempPassword: tempPassword.trim(),
          driveUrl: driveUrl.trim() || undefined,
          setupInstructions: instructions.trim(),
          provisionedAt: new Date().toISOString(),
          provisionedBy: session.fullName,
        },
      });

      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to provision service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high scc-usis-modal-wrap" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scc-prov-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">
              {request.trackingNumber} • {request.organizationName}
            </p>
            <h3 id="scc-prov-title">Provision Digital Service</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-dialog__body scc-form">
            {errorMsg ? (
              <div className="scc-alert scc-alert--danger" role="alert">
                <span>{errorMsg}</span>
              </div>
            ) : null}

            <div className="notice-box">
              <strong>Request Summary</strong>
              <span>{request.title}</span>
              <span style={{ fontSize: '13px' }}>{request.justification}</span>
            </div>

          {request.serviceKey === 'email_account' ? (
            <div className="scc-form-grid">
              <div className="scc-form-group">
                <label className="scc-label" htmlFor="scc-prov-email">
                  Assigned Google Workspace Email *
                </label>
                <input
                  id="scc-prov-email"
                  type="email"
                  className="scc-input"
                  required
                  value={assignedEmail}
                  onChange={(e) => setAssignedEmail(e.target.value)}
                />
              </div>

              <div className="scc-form-group">
                <label className="scc-label" htmlFor="scc-prov-pass">
                  Temporary Password *
                </label>
                <input
                  id="scc-prov-pass"
                  type="text"
                  className="scc-input"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {request.serviceKey === 'cloud_storage' ? (
            <div className="scc-form-group">
              <label className="scc-label" htmlFor="scc-prov-drive">
                Google Shared Drive Link *
              </label>
              <input
                id="scc-prov-drive"
                type="url"
                className="scc-input"
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
              />
            </div>
          ) : null}

          <div className="scc-form-group">
            <label className="scc-label" htmlFor="scc-prov-instructions">
              Setup & Security Instructions
            </label>
            <textarea
              id="scc-prov-instructions"
              className="scc-textarea"
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <div className="scc-form-group">
            <label className="scc-label" htmlFor="scc-prov-remarks">
              Coordinator Approval Remarks
            </label>
            <input
              id="scc-prov-remarks"
              type="text"
              className="scc-input"
              value={reviewerRemarks}
              onChange={(e) => setReviewerRemarks(e.target.value)}
            />
            </div>
          </div>

          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="modal-dialog__blue" disabled={isSubmitting}>
              {isSubmitting ? 'Provisioning...' : 'Complete & Provision Service'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
