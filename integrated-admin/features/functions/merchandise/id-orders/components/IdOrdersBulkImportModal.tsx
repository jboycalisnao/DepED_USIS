import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import { UsisChoiceOption } from '../../../../../../common/components/ui/UsisChoiceOption';
import type { IdOrderWorkbookReview } from '../utils/idOrdersWorkbook';

type Props = {
  gradeOptions: string[];
  isBusy: boolean;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => Promise<void>;
  onReview: (file: File) => Promise<void>;
  onConfirmImport: () => Promise<void>;
  onGradeChange: (value: string) => void;
  onResetReview: () => void;
  selectedGrade: string;
  selectedScope: 'all' | 'grade';
  onScopeChange: (value: 'all' | 'grade') => void;
  review: IdOrderWorkbookReview | null;
  isReviewing: boolean;
  isImporting: boolean;
};

const scopeOptions: Array<{ value: 'all' | 'grade'; title: string; description: string }> = [
  { value: 'all', title: 'Whole Orders', description: 'Download a workbook for all currently loaded ID order records.' },
  { value: 'grade', title: 'Selected Grade Level', description: 'Download a workbook for only the chosen grade level.' },
];

export function IdOrdersBulkImportModal({
  gradeOptions,
  isBusy,
  isImporting,
  isReviewing,
  isOpen,
  onClose,
  onDownload,
  onReview,
  onConfirmImport,
  onGradeChange,
  onResetReview,
  review,
  selectedGrade,
  selectedScope,
  onScopeChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setLocalError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setLocalError('');
  };

  const handleReviewClick = async () => {
    if (!selectedFile) {
      setLocalError('Choose an Excel workbook before reviewing.');
      return;
    }

    setLocalError('');
    await onReview(selectedFile);
  };

  const hasBlockingIssues = Boolean(review?.issues.some((issue) => issue.severity === 'error'));

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="id-orders-bulk-import-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">ID Orders</p>
            <h3 id="id-orders-bulk-import-title">Bulk Import ID Orders</h3>
          </div>
        </div>

        <div className="modal-dialog__body registry-form id-orders-bulk-import-modal__body">
          <p>
            Download the workbook template, update the Status column, then upload the completed file to review the changes before syncing.
          </p>

          <fieldset className="registry-choice-group registry-choice-group--stacked">
            <legend>Template Scope</legend>
            {scopeOptions.map((option) => {
              const isSelected = selectedScope === option.value;
              return (
                <UsisChoiceOption
                  key={option.value}
                  checked={isSelected}
                  controlType="radio"
                  description={option.description}
                  label={option.title}
                  name="id-orders-bulk-import-scope"
                  onChange={() => onScopeChange(option.value)}
                  stacked
                  value={option.value}
                />
              );
            })}
          </fieldset>

          {selectedScope === 'grade' ? (
            <div className="id-orders-bulk-import-modal__grade-select">
              <UsisSearchableSelect
                ariaLabel="Grade Level"
                allowTyping
                floatingLabel
                forcePortalMenu
                label="Grade Level"
                onChange={onGradeChange}
                options={gradeOptions.map((grade) => ({ label: grade, value: grade }))}
                placeholder="Select grade level"
                value={selectedGrade}
              />
            </div>
          ) : null}

          {!review ? (
            <>
              <div className="id-orders-bulk-import-modal__file-box">
                <div>
                  <p className="id-orders-bulk-import-modal__section-title">Upload completed workbook</p>
                  <p className="id-orders-bulk-import-modal__file-copy">
                    {selectedFile ? selectedFile.name : 'No file selected yet.'}
                  </p>
                </div>
                <div className="id-orders-bulk-import-modal__file-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isBusy || isReviewing}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Excel File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="id-orders-bulk-import-modal__file-input"
                    disabled={isBusy || isReviewing}
                  />
                </div>
              </div>

              {localError ? <p className="id-orders-bulk-import-modal__error" role="alert">{localError}</p> : null}
            </>
          ) : (
            <div className="id-orders-bulk-import-modal__review">
              <div className="integrated-admin-workbook-review-modal__summary id-orders-bulk-import-modal__summary">
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
                {hasBlockingIssues ? (
                  <p className="id-orders-bulk-import-modal__blocking-note">
                    The workbook has blocking errors, so syncing is disabled until those rows are corrected.
                  </p>
                ) : null}
              </div>

              <div className="id-orders-bulk-import-modal__summary-copy">
                <p className="id-orders-bulk-import-modal__section-title">Rows to be changed</p>
                <div className="id-orders-bulk-import-modal__changes">
                  {review.patches.map((patch, index) => (
                    <div key={`${patch.orderId}-${patch.referenceNo}-${index}`} className="id-orders-bulk-import-modal__change-item">
                      <strong>{patch.referenceNo || patch.orderId}</strong>
                      <span>Status will change to: {patch.orderStatus}</span>
                    </div>
                  ))}
                </div>
              </div>

              {review.issues.length > 0 ? (
                <div className="integrated-admin-workbook-review-modal__issues id-orders-bulk-import-modal__issues">
                  {review.issues.map((issue, index) => (
                    <div className={`integrated-admin-workbook-review-modal__issue integrated-admin-workbook-review-modal__issue--${issue.severity}`} key={`${issue.sheetName}-${issue.rowNumber}-${index}`}>
                      <div className="integrated-admin-workbook-review-modal__issue-head">
                        <strong>{issue.severity === 'error' ? 'Error' : 'Warning'}</strong>
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
          )}
        </div>

        <div className="modal-dialog__actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void onDownload()}
            disabled={isBusy || (selectedScope === 'grade' && !selectedGrade)}
          >
            Download Excel Sheet
          </button>
          {!review ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleReviewClick()}
              disabled={isBusy || isReviewing || !selectedFile}
            >
              {isReviewing ? 'Reviewing...' : 'Review File'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSelectedFile(null);
                  setLocalError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  onResetReview();
                }}
                disabled={isBusy || isReviewing || isImporting}
              >
                Choose Another File
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void onConfirmImport()}
                disabled={isBusy || isReviewing || isImporting || review.patches.length === 0 || hasBlockingIssues}
              >
                {isImporting ? 'Importing...' : hasBlockingIssues ? 'Fix Issues First' : 'Confirm Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
