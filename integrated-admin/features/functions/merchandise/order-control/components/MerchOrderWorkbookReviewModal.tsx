import { createPortal } from 'react-dom';
import type { MerchOrderWorkbookReview } from '../utils/merchOrdersWorkbook';

type Props = {
  isOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  review: MerchOrderWorkbookReview | null;
};

const formatIssueLabel = (severity: 'warning' | 'error') => (severity === 'error' ? 'Error' : 'Warning');

export function MerchOrderWorkbookReviewModal({ isOpen, isProcessing, onClose, onConfirm, review }: Props) {
  if (!isOpen || !review) return null;

  const hasValidChanges = review.patches.length > 0;
  const canConfirm = hasValidChanges && !isProcessing;

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide integrated-admin-workbook-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merch-workbook-review-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Merch Orders</p>
            <h3 id="merch-workbook-review-title">Review Upload File</h3>
          </div>
        </div>

        <div className="modal-dialog__body">
          <p>Check the upload summary below before we sync any workbook changes to the database.</p>

          <div className="integrated-admin-workbook-review-modal__summary">
            <div className="integrated-admin-workbook-review-modal__stat">
              <span>File</span>
              <strong>{review.fileName}</strong>
            </div>
            <div className="integrated-admin-workbook-review-modal__stat">
              <span>Total rows scanned</span>
              <strong>{review.totalCount}</strong>
            </div>
            <div className="integrated-admin-workbook-review-modal__stat">
              <span>Ready to sync</span>
              <strong>{review.changedCount}</strong>
            </div>
            <div className="integrated-admin-workbook-review-modal__stat">
              <span>Skipped rows</span>
              <strong>{review.skippedCount}</strong>
            </div>
          </div>

          <div className="integrated-admin-workbook-review-modal__notice">
            {review.issueCount > 0 ? (
              <p>
                {review.issueCount} issue{review.issueCount === 1 ? '' : 's'} were found. Fix the file if you want every row to sync.
              </p>
            ) : (
              <p>No upload issues were detected.</p>
            )}
          </div>

          {review.issues.length > 0 ? (
            <div className="integrated-admin-workbook-review-modal__issues">
              {review.issues.map((issue, index) => (
                <div className={`integrated-admin-workbook-review-modal__issue integrated-admin-workbook-review-modal__issue--${issue.severity}`} key={`${issue.sheetName}-${issue.rowNumber}-${index}`}>
                  <div className="integrated-admin-workbook-review-modal__issue-head">
                    <strong>{formatIssueLabel(issue.severity)}</strong>
                    <span>
                      {issue.sheetName} / Row {issue.rowNumber}
                    </span>
                  </div>
                  <p>{issue.message}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="modal-dialog__actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={!canConfirm}>
            {isProcessing ? 'Syncing...' : hasValidChanges ? 'Sync Valid Changes' : 'No Valid Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
