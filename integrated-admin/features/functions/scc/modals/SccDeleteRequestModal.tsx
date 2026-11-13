import { useEffect, useState, type FormEvent } from 'react';
import type { IaSccServiceRequest } from '../types';
import { deleteIaSccRequest, resolveRequestAssociatedEmail } from '../services/iaSccService';

type SccDeleteRequestModalProps = {
  request: IaSccServiceRequest | null;
  coordinatorName: string;
  onClose: () => void;
  onDeleted: (result: {
    request: IaSccServiceRequest;
    deletedEmail?: string;
    removedFromGoogleAdmin: boolean;
  }) => void;
};

export function SccDeleteRequestModal({
  request,
  coordinatorName,
  onClose,
  onDeleted,
}: SccDeleteRequestModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setPassword('');
    setShowPassword(false);
    setErrorMsg(null);
    setIsDeleting(false);
  }, [request?.id]);

  if (!request) return null;

  const associatedEmail = resolveRequestAssociatedEmail(request);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Please enter the password for your authenticated USIS Coordinator account.');
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMsg(null);
      const outcome = await deleteIaSccRequest({
        request,
        coordinatorPassword: password,
      });
      onDeleted({
        request,
        deletedEmail: outcome.deletedEmail,
        removedFromGoogleAdmin: outcome.removedFromGoogleAdmin,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to delete service request record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => !isDeleting && onClose()} />
      <div
        className="modal-dialog ia-scc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ia-scc-delete-req-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">
              {request.trackingNumber} • {request.organizationAcronym}
            </p>
            <h3 id="ia-scc-delete-req-title">Delete Service Request Record</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close"
          >
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

          <div className="ia-scc-alert ia-scc-alert--danger" role="note">
            <span className="material-symbols-outlined" aria-hidden="true">warning</span>
            <span>
              You are about to permanently delete service request{' '}
              <strong>{request.trackingNumber}</strong> ({request.title}).
              {associatedEmail ? (
                <>
                  {' '}
                  The associated institutional email account{' '}
                  <code>{associatedEmail}</code> will also be permanently deleted from Google
                  Workspace Admin Console and cleared from organization records.
                </>
              ) : null}
            </span>
          </div>

          <div className="ia-scc-detail-meta">
            <div className="ia-scc-detail-meta__item">
              <span>Organization</span>
              <strong>
                {request.organizationName} ({request.organizationAcronym})
              </strong>
            </div>
            <div className="ia-scc-detail-meta__item">
              <span>Current Status</span>
              <strong>{request.status.replace('_', ' ').toUpperCase()}</strong>
            </div>
          </div>

          <div className="ia-scc-password-row">
            <label className="floating-field ia-scc-password-row__input">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder=" "
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                disabled={isDeleting}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span>USIS Coordinator Account Password *</span>
            </label>
            <button
              type="button"
              className="secondary-btn"
              disabled={isDeleting}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <p className="ia-scc-muted" style={{ margin: 0 }}>
            Authorized action for authenticated coordinator: <strong>{coordinatorName}</strong>.
          </p>
          </div>

          <div className="modal-dialog__actions ia-scc-modal__actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn ia-scc-btn--danger-solid"
              disabled={isDeleting || !password}
            >
              {isDeleting ? 'Deleting...' : 'Delete Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
