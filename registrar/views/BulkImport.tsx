import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import {
  downloadBulkEnrollmentTemplate,
  parseBulkEnrollmentWorkbook,
} from './enrollment/bulkEnrollmentWorkbook';
import { createPublicEnrollmentSubmission } from '../features/registrar/public-enrollment/services/publicEnrollmentSubmissions';
import { validatePublicEnrollmentDraft } from '../features/registrar/public-enrollment/utils/validation';
import { parseSF1 } from '../services/sf1Service';
import { useStore } from '../store';
import { GradeLevel, Student } from '../types';
import type { EnrollmentDraft } from '../features/registrar/public-enrollment/types';

const BulkImport: React.FC = () => {
  const navigate = useNavigate();
  const { activeSchoolYear, gradeLevels, sections, learners, loading: storeLoading, registrarAccess, bulkAddLearners } = useStore();

  const [file, setFile] = useState<File | null>(null);
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(gradeLevels[0] || GradeLevel.GRADE_7);
  const [sectionId, setSectionId] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<Student[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bulkEnrollmentStudents, setBulkEnrollmentStudents] = useState<Student[]>([]);
  const [bulkEnrollmentFileName, setBulkEnrollmentFileName] = useState('');
  const [isBulkParsing, setIsBulkParsing] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showBulkSuccessModal, setShowBulkSuccessModal] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSubmissionSummary, setBulkSubmissionSummary] = useState<{ success: number; failed: number } | null>(null);

  const availableSections = useMemo(
    () =>
      sections
        .filter((s) => s.schoolYearId === activeSchoolYear.id && (gradeLevel ? s.gradeLevel === gradeLevel : true))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({
          ...s,
          learnerCount: learners.filter((l) => String(l.sectionId).trim() === String(s.id).trim()).length,
        })),
    [sections, gradeLevel, activeSchoolYear.id, learners],
  );

  const selectedSectionName = useMemo(() => sections.find((s) => s.id === sectionId)?.name || '', [sectionId, sections]);
  const gradeOptions = useMemo(() => gradeLevels.map((g) => ({ value: g, label: g })), [gradeLevels]);
  const sectionOptions = useMemo(
    () => availableSections.map((sec) => ({ value: sec.id, label: `${sec.name} (${sec.learnerCount} Learners)` })),
    [availableSections],
  );
  const bulkTotals = useMemo(() => {
    const existingLrns = new Set(learners.map((l) => l.lrn));
    let existingCount = 0;
    let newCount = 0;

    bulkEnrollmentStudents.forEach((student) => {
      if (existingLrns.has(student.lrn)) existingCount += 1;
      else newCount += 1;
    });

    return { total: bulkEnrollmentStudents.length, newCount, existingCount };
  }, [bulkEnrollmentStudents, learners]);

  useEffect(() => {
    const triggerExtraction = async () => {
      if (file && sectionId && !isParsing && !isSaving) {
        setError(null);
        setIsParsing(true);
        const shsMode = gradeLevel === GradeLevel.GRADE_11 || gradeLevel === GradeLevel.GRADE_12;

        try {
          const result = await parseSF1(file, gradeLevel, sectionId, selectedSectionName, activeSchoolYear.label, shsMode);
          if (result.error) {
            setError(result.error);
            setFile(null);
          } else {
            setPreviewData(result.students);
            setShowPreview(true);
          }
        } catch (err: any) {
          setError(`Processing failure: ${err.message}`);
        } finally {
          setIsParsing(false);
        }
      }
    };

    triggerExtraction();
  }, [file, sectionId]);

  const totals = useMemo(() => {
    const existingLrns = new Set(learners.map((l) => l.lrn));
    let existingCount = 0;
    let newCount = 0;

    previewData.forEach((p) => {
      if (existingLrns.has(p.lrn)) existingCount += 1;
      else newCount += 1;
    });

    return { newCount, existingCount, total: previewData.length };
  }, [previewData, learners]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      if (!sectionId) setError('Please designate a target section first so the system can map the records.');
    }
  };

  const handleCommit = async () => {
    if (previewData.length === 0) return;

    setIsSaving(true);
    const result = await bulkAddLearners(previewData);

    if (result?.error) {
      setError(`Database Error: ${result.error}.`);
      setIsSaving(false);
      setShowFinalConfirm(false);
    } else {
      setIsSaving(false);
      setShowFinalConfirm(false);
      setShowPreview(false);
      setShowSuccessModal(true);
    }
  };

  const handleBulkTemplateDownload = () => {
    downloadBulkEnrollmentTemplate(activeSchoolYear.label, gradeLevel, selectedSectionName);
  };

  const handleBulkFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    event.target.value = '';

    if (!selectedFile) return;
    if (!sectionId) {
      setBulkError('Please designate a target section first so the workbook can be matched correctly.');
      return;
    }

    setBulkError(null);
    setIsBulkParsing(true);

    try {
      const result = await parseBulkEnrollmentWorkbook(selectedFile, {
        selectedGrade: gradeLevel,
        selectedSectionId: sectionId,
        selectedSectionName,
        schoolYearLabel: activeSchoolYear.label,
        sections,
      });

      if (result.error) {
        setBulkError(result.error);
        setBulkEnrollmentStudents([]);
        setBulkEnrollmentFileName('');
        setShowBulkPreview(false);
        return;
      }

      setBulkEnrollmentStudents(result.students);
      setBulkEnrollmentFileName(selectedFile.name);
      setShowBulkPreview(true);
    } catch (err: any) {
      setBulkError(`Bulk import failed: ${err?.message || 'Unable to process the workbook.'}`);
      setBulkEnrollmentStudents([]);
      setBulkEnrollmentFileName('');
    } finally {
      setIsBulkParsing(false);
    }
  };

  const buildBulkEnrollmentDraft = (student: Student): EnrollmentDraft => {
    const gradeText = String(gradeLevel || '').trim();
    const previousGradeNumber = Number(gradeText.replace(/\D/g, '')) - 1;
    const previousGradeLevel = previousGradeNumber > 0 ? `Grade ${previousGradeNumber}` : '';
    const isSeniorHigh = gradeLevel === GradeLevel.GRADE_11 || gradeLevel === GradeLevel.GRADE_12;

    return {
      schoolId: registrarAccess?.schoolUuid || registrarAccess?.schoolId || '',
      schoolYear: activeSchoolYear.label,
      schoolToEnroll: registrarAccess?.schoolName || 'USIS School',
      studentType: 'New Learner',
      learnerCategory: 'Same School',
      previousSchool: '',
      previousSchoolYear: '',
      lastGradeLevel: previousGradeLevel,
      gradeToEnroll: gradeText,
      track: isSeniorHigh ? 'Academic Track' : 'Academic Track',
      strand: '',
      semester: isSeniorHigh ? '1st Sem' : '',
      birthCertificateNo: '',
      lrn: student.lrn,
      email: student.email || '',
      lastName: student.lastName,
      firstName: student.firstName,
      middleName: student.middleName || '',
      extensionName: '',
      birthDate: student.birthDate || '',
      gender: student.gender || 'Male',
      placeOfBirth: '',
      height: '',
      weight: '',
      learnerContact: student.contactNumber || '',
      motherTongue: '',
      religion: 'Roman Catholic',
      is4Ps: student.is4Ps ? 'Yes' : 'No',
      fourPsHouseholdId: '',
      currentAddress: student.address || '',
      permanentAddress: student.address || '',
      fatherName: student.father_name || '',
      fatherContact: '',
      motherName: student.mother_name || '',
      motherContact: '',
      guardianName: student.guardian_name || '',
      guardianContact: student.contactNumber || '',
      hasSpedNeed: 'No',
      preferredModality: 'Face-to-face',
      deviceAccess: 'None',
      hasInternet: 'Yes',
      consent: true,
    };
  };

  const handleBulkCommit = async () => {
    if (bulkEnrollmentStudents.length === 0) return;
    if (!registrarAccess?.schoolUuid && !registrarAccess?.schoolId) {
      setBulkError('School context is unavailable. Please sign in again before queueing submissions.');
      return;
    }

    setIsBulkSaving(true);
    setBulkError(null);

    const submittedRows: Student[] = [];
    const failedRows: Array<{ lrn: string; reason: string }> = [];

    for (const student of bulkEnrollmentStudents) {
      const draft = buildBulkEnrollmentDraft(student);
      const validationError = validatePublicEnrollmentDraft(draft);
      if (validationError) {
        failedRows.push({ lrn: student.lrn, reason: validationError });
        continue;
      }

      try {
        await createPublicEnrollmentSubmission(draft);
        submittedRows.push(student);
      } catch (error: any) {
        failedRows.push({
          lrn: student.lrn,
          reason: error?.message || 'Unable to queue submission.',
        });
      }
    }

    setIsBulkSaving(false);
    setShowBulkConfirm(false);
    setShowBulkPreview(false);
    setBulkSubmissionSummary({ success: submittedRows.length, failed: failedRows.length });

    if (submittedRows.length > 0) {
      setShowBulkSuccessModal(true);
    }

    if (failedRows.length > 0) {
      const details = failedRows
        .slice(0, 5)
        .map((row) => `${row.lrn || 'Unknown LRN'}: ${row.reason}`)
        .join(' ');
      setBulkError(
        submittedRows.length > 0
          ? `Queued ${submittedRows.length} submission${submittedRows.length === 1 ? '' : 's'}. ${failedRows.length} row${failedRows.length === 1 ? '' : 's'} could not be queued. ${details}`
          : `No submissions were queued. ${details}`,
      );
    }
  };

  const resetBulkEnrollment = () => {
    setBulkEnrollmentStudents([]);
    setBulkEnrollmentFileName('');
    setBulkError(null);
    setBulkSubmissionSummary(null);
    setShowBulkPreview(false);
    setShowBulkConfirm(false);
    setShowBulkSuccessModal(false);
  };

  const resetForNewImport = () => {
    setFile(null);
    setPreviewData([]);
    setError(null);
    setShowSuccessModal(false);
  };

  return (
    <div className="registrar-import-page">
      {(isSaving || isParsing || isBulkParsing || isBulkSaving || storeLoading) && (
        <div className="registrar-import-page__overlay">
          <div className="registrar-import-page__spinner" />
          <h3>Syncing Cloud Registry</h3>
          <p>Processing learner records through the Duplicate Resolution Engine.</p>
        </div>
      )}

      <div className="registrar-import-page__layout">
        <aside className="registrar-import-page__sidebar">
          <section className="registrar-import-page__panel">
            <h3>Batch Configuration</h3>
            <div className="registrar-import-page__field-stack">
              <div>
                <label>Grade Level</label>
                <SearchableSelect
                  label="Grade Level"
                  placeholder="Select Grade Level"
                  floatingLabel
                  showLabel={false}
                  value={gradeLevel}
                  onChange={(value) => {
                    setGradeLevel(value as GradeLevel);
                    setSectionId('');
                  }}
                  options={gradeOptions}
                />
              </div>

              <div>
                <label>Class Section</label>
                <SearchableSelect
                  label="Class Section"
                  placeholder="Select Target Destination"
                  floatingLabel
                  showLabel={false}
                  value={sectionId}
                  onChange={setSectionId}
                  options={sectionOptions}
                />
                {availableSections.length === 0 && <p className="registrar-import-page__hint">No active section found for this level.</p>}
              </div>
            </div>
          </section>

          {sectionId && (
            <section className="registrar-import-page__status">
              <div>
                <span className="material-symbols-outlined">auto_fix_high</span>
                <strong>Auto-Extractor Active</strong>
              </div>
              <p>
                The system is ready. Upload a spreadsheet below and it will be parsed immediately for section <b>{selectedSectionName}</b>.
              </p>
            </section>
          )}
        </aside>

        <main className="registrar-import-page__main">
          <div className="space-y-6">
            <section className="registrar-import-page__dropzone">
              <div className="registrar-import-page__drop-icon">
                <span className="material-symbols-outlined">{isParsing ? 'hourglass_top' : 'upload_file'}</span>
              </div>

              <div className="registrar-import-page__drop-copy">
                <h2>{isParsing ? 'Extracting Intelligence...' : 'Bulk School Form 1'}</h2>
                <p>
                  {isParsing
                    ? 'Mapping column indices and resolving student identities against the master registry...'
                    : 'Records will be processed instantly once both section and file are specified.'}
                </p>
              </div>

              {!isParsing && (
                <>
                  <input type="file" id="sf1-upload" className="registrar-import-page__hidden-input" accept=".xlsx, .xls" onChange={handleFileChange} />
                  <label htmlFor="sf1-upload" className={`registrar-import-page__upload-btn ${!sectionId ? 'is-disabled' : ''}`}>
                    {!sectionId ? 'Designate Section First' : 'Select Spreadsheet'}
                  </label>
                </>
              )}

              {error && (
                <div className="registrar-import-page__error">
                  <span className="material-symbols-outlined">error_outline</span>
                  <span>{error}</span>
                </div>
              )}

              {isParsing && (
                <div className="registrar-import-page__progress">
                  <div className="registrar-import-page__progress-track">
                    <div className="registrar-import-page__progress-bar" />
                  </div>
                  <span>Processing Data Streams</span>
                </div>
              )}
            </section>

            <section className="registrar-import-page__dropzone">
              <div className="registrar-import-page__drop-icon">
                <span className="material-symbols-outlined">{isBulkParsing ? 'hourglass_top' : 'group_add'}</span>
              </div>

              <div className="registrar-import-page__drop-copy">
                <h2>{isBulkParsing ? 'Validating Enrollment Workbook...' : 'Bulk Enrollment'}</h2>
                <p>
                  {isBulkParsing
                    ? 'Reviewing learner rows and preparing submission payloads before queueing.'
                    : 'Download the template, complete the learner rows, then upload the workbook to queue online enrollment submissions.'}
                </p>
              </div>

              {!isBulkParsing && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleBulkTemplateDownload}
                    className="registrar-import-page__upload-btn"
                  >
                    Download Excel Template
                  </button>
                  <input
                    type="file"
                    id="bulk-enrollment-upload"
                    className="registrar-import-page__hidden-input"
                    accept=".xlsx, .xls"
                    onChange={handleBulkFileChange}
                  />
                  <label htmlFor="bulk-enrollment-upload" className={`registrar-import-page__upload-btn ${!sectionId ? 'is-disabled' : ''}`}>
                    {!sectionId ? 'Designate Section First' : 'Upload Bulk Excel'}
                  </label>
                </div>
              )}

              {bulkError && (
                <div className="registrar-import-page__error">
                  <span className="material-symbols-outlined">error_outline</span>
                  <span>{bulkError}</span>
                </div>
              )}

              {isBulkParsing && (
                <div className="registrar-import-page__progress">
                  <div className="registrar-import-page__progress-track">
                    <div className="registrar-import-page__progress-bar" />
                  </div>
                  <span>Processing Enrollment Workbook</span>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {showPreview && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowPreview(false)} />
          <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="resolution-preview-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="resolution-preview-title">Resolution Preview</h3>
                <div className="registrar-import-page__preview-badges">
                  <span>{totals.newCount} New Profiles</span>
                  <span>{totals.existingCount} Profile Updates</span>
                </div>
              </div>
            </div>

            <div className="modal-dialog__body custom-scrollbar">
              <table className="usis-table">
                <thead>
                  <tr>
                    <th>LRN</th>
                    <th>Identity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((s, idx) => {
                    const isExisting = learners.some((l) => l.lrn === s.lrn);
                    return (
                      <tr key={idx}>
                        <td>{s.lrn}</td>
                        <td>
                          <div>{s.lastName}, {s.firstName}</div>
                          <small>{s.birthDate}</small>
                        </td>
                        <td>
                          <span className="status-badge">{isExisting ? 'Existing Learner' : 'Ready to Queue'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-dialog__actions">
              <button onClick={() => { setShowPreview(false); resetForNewImport(); }}>Abort & Return</button>
              <button onClick={() => setShowFinalConfirm(true)} className="modal-dialog__blue">
                <span className="material-symbols-outlined">save</span>
                Commit Batch Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showFinalConfirm}
        title="Execute Batch Operation"
        message={`Confirming the resolution of ${totals.total} records into ${selectedSectionName}. New profiles will be created and existing profiles will be updated with information from the spreadsheet.`}
        onConfirm={handleCommit}
        onCancel={() => setShowFinalConfirm(false)}
        confirmLabel="Finalize & Commit"
        isLoading={isSaving}
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        title="Batch Import Successful"
        message="The learner records have been synchronized. Upload another batch or proceed to the learner registry."
        onConfirm={resetForNewImport}
        onCancel={() => navigate('/learners')}
        confirmLabel="Upload More"
        cancelLabel="View Registry"
        type="primary"
      />

      {showBulkPreview && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowBulkPreview(false)} />
          <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="bulk-enrollment-preview-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="bulk-enrollment-preview-title">Bulk Submission Preview</h3>
                <div className="registrar-import-page__preview-badges">
                  <span>{bulkTotals.newCount} Ready to Queue</span>
                  <span>{bulkTotals.existingCount} Existing Learners</span>
                </div>
              </div>
            </div>

            <div className="modal-dialog__body custom-scrollbar">
              <table className="usis-table">
                <thead>
                  <tr>
                    <th>LRN</th>
                    <th>Identity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkEnrollmentStudents.map((student, index) => {
                    const isExisting = learners.some((learner) => learner.lrn === student.lrn);
                    return (
                      <tr key={`${student.lrn}-${index}`}>
                        <td>{student.lrn}</td>
                        <td>
                          <div>
                            {student.lastName}, {student.firstName}
                          </div>
                          <small>{student.birthDate}</small>
                        </td>
                        <td>
                          <span className="status-badge">{isExisting ? 'Existing Learner' : 'Ready to Queue'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-dialog__actions">
              <button onClick={() => { setShowBulkPreview(false); resetBulkEnrollment(); }}>Abort & Return</button>
              <button onClick={() => setShowBulkConfirm(true)} className="modal-dialog__blue">
                <span className="material-symbols-outlined">save</span>
                Queue Submissions
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showBulkConfirm}
        title="Queue Bulk Submissions"
        message={`Confirm queueing ${bulkTotals.total} learner${bulkTotals.total === 1 ? '' : 's'} from ${bulkEnrollmentFileName || 'the uploaded workbook'} into online enrollment submissions for ${gradeLevel}${selectedSectionName ? ` - ${selectedSectionName}` : ''}.`}
        onConfirm={handleBulkCommit}
        onCancel={() => setShowBulkConfirm(false)}
        confirmLabel="Queue Batch"
        isLoading={isBulkSaving}
      />

      <ConfirmationModal
        isOpen={showBulkSuccessModal}
        title="Bulk Enrollment Submitted"
        message={`The workbook has been queued into online enrollment submissions.${bulkSubmissionSummary ? ` ${bulkSubmissionSummary.success} submission${bulkSubmissionSummary.success === 1 ? '' : 's'} created${bulkSubmissionSummary.failed ? `, ${bulkSubmissionSummary.failed} row${bulkSubmissionSummary.failed === 1 ? '' : 's'} skipped` : ''}.` : ''} Review them in the submissions page before they are approved into the learner list.`}
        onConfirm={resetBulkEnrollment}
        onCancel={() => navigate('/enroll')}
        confirmLabel="Upload More"
        cancelLabel="View Submissions"
        type="primary"
      />
    </div>
  );
};

export default BulkImport;
