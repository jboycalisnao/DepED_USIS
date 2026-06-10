import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { CoordinatorDepartmentRecord, TeachingNonTeachingCredentialRecord } from '../services/teachingNonTeachingCredentialsService';
import {
  downloadTeachingNonTeachingCredentialTemplate,
  parseTeachingNonTeachingCredentialWorkbook,
  type TeachingNonTeachingBulkImportResult,
} from '../utils/teachingNonTeachingCredentialWorkbook';
import type { SaveTeachingNonTeachingCredentialInput } from '../services/teachingNonTeachingCredentialsService';
import { buildDuplicateCoordinatorKeySet, isDuplicateCoordinatorName } from '../utils/teachingNonTeachingCredentialPreview';

type Props = {
  departments: CoordinatorDepartmentRecord[];
  existingRecords: TeachingNonTeachingCredentialRecord[];
  isSubmitting: boolean;
  onBack: () => void;
  onClose: () => void;
  onImport: (records: SaveTeachingNonTeachingCredentialInput[]) => Promise<TeachingNonTeachingBulkImportResult>;
  schoolCode: string;
};

const formatSummary = (result: TeachingNonTeachingBulkImportResult) =>
  result.errors.length > 0
    ? `${result.createdCount} imported, ${result.skippedCount} skipped.`
    : `${result.createdCount} credential${result.createdCount === 1 ? '' : 's'} imported successfully.`;

type PanelMode = 'guide' | 'preview';

const formatPersonnelType = (value: string) => (value === 'non_teaching' ? 'Non-Teaching' : 'Teaching');
const formatStatus = (value: boolean) => (value ? 'Active' : 'Inactive');

export function TeachingNonTeachingCredentialBulkImportPanel({
  departments,
  existingRecords,
  isSubmitting,
  onBack,
  onClose,
  onImport,
  schoolCode,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<SaveTeachingNonTeachingCredentialInput[]>([]);
  const [localError, setLocalError] = useState('');
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [lastResult, setLastResult] = useState<TeachingNonTeachingBulkImportResult | null>(null);
  const [mode, setMode] = useState<PanelMode>('guide');
  const duplicateCoordinatorKeys = useMemo(() => buildDuplicateCoordinatorKeySet(existingRecords), [existingRecords]);

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    setLocalError('');
    try {
      await downloadTeachingNonTeachingCredentialTemplate(departments);
    } catch (nextError: any) {
      setLocalError(nextError?.message || 'Unable to download the blank import template.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setParsedRows([]);
    setLastResult(null);
    setLocalError('');
    setIsReadingFile(true);
    try {
      const rows = await parseTeachingNonTeachingCredentialWorkbook(file, departments, schoolCode);
      setParsedRows(rows);
      setMode(rows.length > 0 ? 'preview' : 'guide');
      if (rows.length === 0) {
        setLocalError('The uploaded workbook does not contain any credential rows.');
      }
    } catch (nextError: any) {
      setLocalError(nextError?.message || 'Unable to read the uploaded workbook.');
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      setLocalError('Choose a populated workbook before importing.');
      return;
    }
    setLocalError('');
    try {
      const result = await onImport(parsedRows);
      setLastResult(result);
      if (result.errors.length === 0) {
        onBack();
      }
    } catch (nextError: any) {
      setLocalError(nextError?.message || 'Unable to complete the bulk import.');
    }
  };

  return (
    <div className="ia-teaching-credential-bulk-import">
      <p className="registry-copy ia-teaching-credential-bulk-import__lead">
        Download a blank workbook, fill in the required rows, then upload the completed file here.
      </p>

      <div className="ia-teaching-credential-bulk-import__actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
          disabled={isSubmitting || isDownloadingTemplate || isReadingFile}
        >
          Back to Form
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={handleDownloadTemplate}
          disabled={isSubmitting || isDownloadingTemplate || departments.length === 0}
        >
          {isDownloadingTemplate ? 'Preparing Template...' : 'Download Blank Template'}
        </button>
      </div>

      {mode === 'guide' ? (
        <>
          <div className="ia-teaching-credential-bulk-import__rules">
            <p className="ia-teaching-credential-bulk-import__rules-title">Required Columns</p>
            <p className="registry-copy ia-teaching-credential-bulk-import__rules-copy">
              First Name, Last Name, Department, Username, Password, and Personnel Type. Department and Personnel Type use Excel dropdowns.
              Leave Status blank for Active.
            </p>
          </div>

          <div className="ia-teaching-credential-bulk-import__file">
            <div className="ia-teaching-credential-bulk-import__file-row">
              <div className="ia-teaching-credential-bulk-import__file-copy">
                <span className="ia-teaching-credential-bulk-import__file-label">Upload completed Excel file</span>
                {selectedFileName ? <p className="ia-teaching-credential-bulk-import__file-name">{selectedFileName}</p> : null}
              </div>
              <button
                type="button"
                className="ia-teaching-credential-bulk-import__file-button"
                disabled={isSubmitting || isReadingFile}
                onClick={() => fileInputRef.current?.click()}
              >
                {isReadingFile ? 'Reading workbook...' : selectedFileName ? 'Replace completed Excel file' : 'Choose completed Excel file'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              accept=".xlsx,.xls"
              disabled={isSubmitting || isReadingFile}
              onChange={handleFileChange}
              type="file"
            />
          </div>
        </>
      ) : (
        <div className="ia-teaching-credential-bulk-import__preview">
          <div className="ia-teaching-credential-bulk-import__preview-head">
            <div>
              <p className="ia-teaching-credential-bulk-import__rules-title">Uploaded File Preview</p>
              <p className="registry-copy">
                Review the extracted rows below before importing. File: {selectedFileName}
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setMode('guide');
                setParsedRows([]);
                setSelectedFileName('');
                setLocalError('');
                setLastResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={isSubmitting || isReadingFile}
            >
              Change File
            </button>
          </div>
          <div className="registry-table-wrap ia-teaching-credential-bulk-import__table-wrap">
            <table className="registry-table ia-registry-table--enhanced ia-teaching-credential-bulk-import__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Username</th>
                  <th>Personnel Type</th>
                  <th>Status</th>
                  <th>Duplicate</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => (
                  <tr key={`${row.username}-${row.departmentId}`}>
                    <td><strong>{[row.firstName, row.lastName].filter(Boolean).join(' ')}</strong></td>
                    <td>{departments.find((department) => department.id === row.departmentId)?.name || 'Not Set'}</td>
                    <td>{row.username}</td>
                    <td>{formatPersonnelType(row.personnelType)}</td>
                    <td>{formatStatus(row.isActive ?? true)}</td>
                    <td>
                      {isDuplicateCoordinatorName(row.firstName, row.lastName, duplicateCoordinatorKeys) ? (
                        <span className="ia-teaching-credential-bulk-import__duplicate-tag">Duplicate</span>
                      ) : (
                        <span className="ia-teaching-credential-bulk-import__duplicate-tag is-muted">Unique</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {parsedRows.length > 0 ? (
        <p className="registry-copy">{parsedRows.length} credential row{parsedRows.length === 1 ? '' : 's'} ready to import.</p>
      ) : null}
      {localError ? <p className="login-card__error">{localError}</p> : null}
      {lastResult ? (
        <div className={`ia-teaching-credential-bulk-import__result${lastResult.errors.length ? ' is-warning' : ' is-success'}`}>
          <strong>{formatSummary(lastResult)}</strong>
          {lastResult.errors.length > 0 ? (
            <ul>
              {lastResult.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="modal-dialog__actions">
        <button type="button" onClick={onClose} disabled={isSubmitting || isDownloadingTemplate || isReadingFile}>
          Close
        </button>
        <button type="button" className="modal-dialog__blue" onClick={handleImport} disabled={isSubmitting || parsedRows.length === 0}>
          {isSubmitting ? 'Importing...' : 'Import Credentials'}
        </button>
      </div>
    </div>
  );
}
