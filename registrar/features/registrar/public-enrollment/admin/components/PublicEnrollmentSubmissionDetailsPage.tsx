import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../../../lib/supabase';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import { SearchableSelect } from '../../../../../components/ui/SearchableSelect';
import type { PublicEnrollmentSubmission } from '../../types';
import { fetchPublicEnrollmentSubmissionById, updatePublicEnrollmentSubmissionRecord } from '../../services/publicEnrollmentSubmissions';
import {
  getSubmissionStatusTone,
  normalizeSubmissionStatus,
  resolveSubmissionStatus,
  submissionStatusOptions,
} from '../../utils/submissionStatus';

type AuditItem = {
  id: string;
  title: string;
  date: string;
  detail: string;
  deletable: boolean;
  trailIndex: number;
};

type PayloadAuditEntry = {
  id?: string;
  action?: string;
  at?: string;
  detail?: string;
};

type LearnerSubmissionStatus = {
  id: string;
  status: string;
  sectionId: string;
  sectionName: string;
};

type LearnerEnrollmentHistoryRow = {
  id: string;
  schoolYear: string;
  gradeLevel: string;
  section: string;
  status: string;
  enrolledAt: string;
};

type EnrollmentHistoryTableRow = LearnerEnrollmentHistoryRow & {
  deletable: boolean;
  source: 'learner-history' | 'submission' | 'legacy';
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '--';
  return date.toLocaleString();
};

const resolveHistoryTone = (value: string): 'info' | 'success' | 'warning' | 'danger' => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('approved') || normalized.includes('enrolled') || normalized.includes('complete')) return 'success';
  if (normalized.includes('existing learner') || normalized.includes('previous learner')) return 'info';
  if (normalized.includes('review') || normalized.includes('pending')) return 'warning';
  if (normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('deny')) return 'danger';
  return 'info';
};

export default function PublicEnrollmentSubmissionDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<PublicEnrollmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingTrailId, setIsDeletingTrailId] = useState<string | null>(null);
  const [deletingHistoryRowId, setDeletingHistoryRowId] = useState<string | null>(null);
  const [learnerHistory, setLearnerHistory] = useState<Array<any>>([]);
  const [registrarHistoryRows, setRegistrarHistoryRows] = useState<LearnerEnrollmentHistoryRow[]>([]);
  const [enrollmentHistoryRows, setEnrollmentHistoryRows] = useState<EnrollmentHistoryTableRow[]>([]);
  const [learnerRecord, setLearnerRecord] = useState<LearnerSubmissionStatus | null>(null);
  const [activeSchoolYear, setActiveSchoolYear] = useState('');
  const [currentYearSectionId, setCurrentYearSectionId] = useState('');
  const [currentYearSectionName, setCurrentYearSectionName] = useState('');
  const [statusDraft, setStatusDraft] = useState('Pending');
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data } = await supabase
        .from('registrar_school_years')
        .select('label')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setActiveSchoolYear(String((data as any)?.label || '').trim());
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchPublicEnrollmentSubmissionById(id);
        if (cancelled) return;
        if (!row) {
          setError('Submission record not found.');
          setSubmission(null);
          return;
        }
        setSubmission(row);

        const lrn = String(row.lrn || row.payload?.lrn || '').trim();
        if (lrn) {
        const { data, error: learnerError } = await supabase
          .from('registrar_learners')
          .select('id,status,section_id')
          .eq('lrn', lrn)
          .maybeSingle();
          if (!cancelled && !learnerError && data) {
            const sectionId = String((data as any).section_id || '').trim();
            let sectionName = '';
            if (sectionId) {
              const { data: sectionRow } = await supabase
                .from('registrar_sections')
                .select('name')
                .eq('id', sectionId)
                .maybeSingle();
              sectionName = String((sectionRow as any)?.name || '').trim();
            }

            const resolvedStatus = normalizeSubmissionStatus(String(row.payload?.status || '').trim() || 'Pending');

            setLearnerRecord({
              id: String((data as any).id || '').trim(),
              status: resolvedStatus,
              sectionId,
              sectionName,
            });
            setStatusDraft(resolvedStatus);
            setLearnerHistory([]);
            const learnerIdValue = String((data as any).id || '').trim();
            const { data: historyRows } = await supabase
              .from('registrar_enrollment_history')
              .select('id,school_year,grade_level,section,status,enrollment_date,created_at')
              .eq('learner_id', learnerIdValue)
              .order('enrollment_date', { ascending: false, nullsFirst: false })
              .order('created_at', { ascending: false });

            if (!cancelled) {
              const canonicalRows = (historyRows || [])
                .map((entry: any) => ({
                  id: String(entry?.id || '').trim(),
                  schoolYear: String(entry?.school_year || '').trim() || '--',
                  gradeLevel: String(entry?.grade_level || '').trim() || '--',
                  section: String(entry?.section || '').trim() || '--',
                  status: String(entry?.status || '').trim() || 'Recorded',
                  enrolledAt: String(entry?.enrollment_date || entry?.created_at || '').trim(),
                }))
                .filter((entry: LearnerEnrollmentHistoryRow) => Boolean(entry.id));
              setRegistrarHistoryRows(canonicalRows);

              const { data: allSubmissionRows, error: allSubmissionRowsError } = await supabase
                .from('registrar_public_enrollment_submissions')
                .select('id,created_at,school_year,grade_to_enroll,lrn,payload')
                .eq('lrn', lrn)
                .order('created_at', { ascending: false });
              if (allSubmissionRowsError) throw allSubmissionRowsError;

              const { data: allRowsByPayloadLrn, error: allRowsByPayloadLrnError } = await supabase
                .from('registrar_public_enrollment_submissions')
                .select('id,created_at,school_year,grade_to_enroll,lrn,payload')
                .filter('payload->>lrn', 'eq', lrn)
                .order('created_at', { ascending: false });
              if (!allRowsByPayloadLrnError && allRowsByPayloadLrn?.length) {
                const seen = new Set((allSubmissionRows || []).map((row: any) => String(row.id || '').trim()));
                for (const row of allRowsByPayloadLrn) {
                  const rowId = String((row as any).id || '').trim();
                  if (!rowId || seen.has(rowId)) continue;
                  (allSubmissionRows || []).push(row);
                  seen.add(rowId);
                }
              }

              const submissionMapped: EnrollmentHistoryTableRow[] = (allSubmissionRows || []).map((row: any, index) => {
                const rowPayload = row?.payload && typeof row.payload === 'object' ? (row.payload as Record<string, any>) : {};
                return {
                  id: String(row.id || `submission-${index}`),
                  schoolYear: String(row.school_year || rowPayload.schoolYear || '--').trim() || '--',
                  gradeLevel: String(row.grade_to_enroll || rowPayload.gradeToEnroll || '--').trim() || '--',
                  section: String(rowPayload.assignedSectionName || '--').trim() || '--',
                  status: String(rowPayload.status || 'Submission Received').trim() || 'Submission Received',
                  enrolledAt: String(row.created_at || '').trim(),
                  deletable: false,
                  source: 'submission',
                };
              });

              const learnerHistoryMapped: EnrollmentHistoryTableRow[] = canonicalRows.map((entry) => ({
                ...entry,
                deletable: true,
                source: 'learner-history',
              }));

              const dedupe = new Map<string, EnrollmentHistoryTableRow>();
              for (const row of [...learnerHistoryMapped, ...submissionMapped]) {
                const key = `${row.schoolYear}|${row.gradeLevel}|${row.section}|${row.enrolledAt}|${row.status}`;
                if (!dedupe.has(key)) dedupe.set(key, row);
              }

              setEnrollmentHistoryRows(Array.from(dedupe.values()).sort((a, b) => new Date(b.enrolledAt || 0).getTime() - new Date(a.enrolledAt || 0).getTime()));
            }
          } else if (!cancelled) {
            setLearnerRecord(null);
            setStatusDraft(resolveSubmissionStatus({ status: String(row.payload?.status || '').trim(), fallback: 'Pending' }));
            setLearnerHistory([]);
            setRegistrarHistoryRows([]);
            setEnrollmentHistoryRows([]);
            setCurrentYearSectionId('');
            setCurrentYearSectionName('');
          }
        } else {
          setLearnerRecord(null);
          setStatusDraft(resolveSubmissionStatus({ status: String(row.payload?.status || '').trim(), fallback: 'Pending' }));
          setLearnerHistory([]);
          setRegistrarHistoryRows([]);
          setEnrollmentHistoryRows([]);
          setCurrentYearSectionId('');
          setCurrentYearSectionName('');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load submission details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!learnerRecord?.id || !activeSchoolYear) {
        setCurrentYearSectionId('');
        setCurrentYearSectionName('');
        return;
      }
      const { data: currentYearHistoryRow } = await supabase
        .from('registrar_enrollment_history')
        .select('section,section_id,status')
        .eq('learner_id', learnerRecord.id)
        .eq('school_year', activeSchoolYear)
        .order('enrollment_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      setCurrentYearSectionId(String((currentYearHistoryRow as any)?.section_id || '').trim());
      setCurrentYearSectionName(String((currentYearHistoryRow as any)?.section || '').trim());
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [learnerRecord?.id, activeSchoolYear]);

  const auditTrail = useMemo(() => {
    if (!submission) return [] as AuditItem[];
    const payload = submission.payload || ({} as any);
    const schoolYear = String(submission.school_year || payload.schoolYear || '').trim();

    const payloadTrail: AuditItem[] = (Array.isArray((payload as any).auditTrail) ? ((payload as any).auditTrail as PayloadAuditEntry[]) : [])
      .filter((entry) => entry && (entry.at || entry.action || entry.detail))
      .map((entry, index) => ({
        id: String(entry.id || `trail-${index}`),
        title: String(entry.action || 'Submission Event'),
        date: String(entry.at || ''),
        detail: String(entry.detail || 'No details provided.'),
        deletable: true,
        trailIndex: index,
      }));

    const list: AuditItem[] = [
      {
        id: 'system-submission-received',
        title: 'Submission Received',
        date: submission.created_at,
        detail: `Public enrollment submission captured for ${schoolYear || 'unspecified school year'}.`,
        deletable: false,
        trailIndex: -1,
      },
      ...payloadTrail,
    ];

    learnerHistory
      .filter((entry) => entry && typeof entry === 'object')
      .forEach((entry) => {
        const matchYear = String(entry.schoolYear || '').trim() === schoolYear;
        const matchLrn = String(entry?.submissionPayload?.lrn || '').trim() === String(submission.lrn || payload.lrn || '').trim();
        if (!matchYear && !matchLrn) return;
        list.push({
          id: `system-history-${String(entry.id || entry.enrollmentDate || Math.random())}`,
          title: 'Learner Enrollment Recorded',
          date: String(entry.enrollmentDate || ''),
          detail: `Enrolled to ${String(entry.section || 'section not specified')} (${String(entry.gradeLevel || 'grade not specified')}).`,
          deletable: false,
          trailIndex: -1,
        });
      });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [submission, learnerHistory]);

  const hasCurrentSchoolYearSection = Boolean(activeSchoolYear && (currentYearSectionId || currentYearSectionName));
  const hasPriorEnrollmentHistory = registrarHistoryRows.length > 0 || learnerHistory.length > 0;
  const currentStatus = hasCurrentSchoolYearSection
    ? 'Enrolled'
    : hasPriorEnrollmentHistory
      ? 'Existing Learner'
      : normalizeSubmissionStatus(statusDraft);
  const statusTone = getSubmissionStatusTone(currentStatus);
  const statusOptions = submissionStatusOptions.map((option) => ({ value: option, label: option }));

  if (loading) return <UsisPageLoader message="Loading submission details..." />;

  if (error || !submission) {
    return (
      <section className="portal-panel registrar-public-enrollment-submissions">
        <div className="portal-panel__header"><h2>Submission Details</h2></div>
        <div className="portal-panel__body">
          <p>{error || 'Submission not found.'}</p>
          <button type="button" className="secondary-button" onClick={() => navigate('/enroll')}>Back to Submissions</button>
        </div>
      </section>
    );
  }

  const payload = submission.payload || ({} as any);
  const fullName = [submission.last_name || payload.lastName, submission.first_name || payload.firstName, submission.middle_name || payload.middleName].filter(Boolean).join(', ');
  const submissionStatus = currentStatus;

  const deleteTrail = async (item: AuditItem) => {
    if (!submission || !item.deletable || item.trailIndex < 0) return;
    const confirmed = window.confirm('Delete this audit trail entry? This action cannot be undone.');
    if (!confirmed) return;
    try {
      setIsDeletingTrailId(item.id);
      setError(null);
      const currentPayload = ((submission.payload && typeof submission.payload === 'object' ? submission.payload : {}) as Record<string, any>);
      const currentTrail = Array.isArray(currentPayload.auditTrail) ? [...currentPayload.auditTrail] : [];
      currentTrail.splice(item.trailIndex, 1);
      const nextPayload = {
        ...currentPayload,
        auditTrail: currentTrail,
      } as any;
      await updatePublicEnrollmentSubmissionRecord(submission.id, {
        school_id: submission.school_id || null,
        school_year: submission.school_year || null,
        lrn: submission.lrn || null,
        last_name: submission.last_name || null,
        first_name: submission.first_name || null,
        middle_name: submission.middle_name || null,
        grade_to_enroll: submission.grade_to_enroll || null,
        guardian_contact: submission.guardian_contact || null,
        payload: nextPayload,
      });
      setSubmission((current) => (current ? { ...current, payload: nextPayload } : current));
    } catch (e: any) {
      setError(e?.message || 'Unable to delete audit trail entry.');
    } finally {
      setIsDeletingTrailId(null);
    }
  };

  const deleteHistoryRow = async (row: LearnerEnrollmentHistoryRow) => {
    if (!submission || !row.id) return;
    const confirmed = window.confirm('Delete this enrollment history record? This action cannot be undone.');
    if (!confirmed) return;
    try {
      setDeletingHistoryRowId(row.id);
      setError(null);
      const { error: deleteError } = await supabase.from('registrar_enrollment_history').delete().eq('id', row.id);
      if (deleteError) throw deleteError;

      const nextRows = registrarHistoryRows.filter((entry) => entry.id !== row.id);
      setRegistrarHistoryRows(nextRows);
      setEnrollmentHistoryRows((current) => current.filter((entry) => entry.id !== row.id || entry.source !== 'learner-history'));

      if (activeSchoolYear && row.schoolYear && row.schoolYear === activeSchoolYear && learnerRecord?.id) {
        const { data: currentYearHistoryRow } = await supabase
          .from('registrar_enrollment_history')
          .select('section,section_id,status')
          .eq('learner_id', learnerRecord.id)
          .eq('school_year', activeSchoolYear)
          .order('enrollment_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setCurrentYearSectionId(String((currentYearHistoryRow as any)?.section_id || '').trim());
        setCurrentYearSectionName(String((currentYearHistoryRow as any)?.section || '').trim());
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to delete enrollment history record.');
    } finally {
      setDeletingHistoryRowId(null);
    }
  };

  const saveStatusChange = async () => {
    if (!submission) return;
    const nextStatus = normalizeSubmissionStatus(statusDraft);
    const currentPayload = (submission.payload && typeof submission.payload === 'object' ? submission.payload : {}) as Record<string, any>;
    const trail = Array.isArray(currentPayload.auditTrail) ? [...currentPayload.auditTrail] : [];
    const nextPayload = {
      ...currentPayload,
      status: nextStatus,
      statusUpdatedAt: new Date().toISOString(),
      auditTrail: [
        ...trail,
        {
          id: crypto.randomUUID(),
          action: 'Status Updated',
          at: new Date().toISOString(),
          detail: `Submission status changed to ${nextStatus}.`,
        },
      ],
    };

    try {
      setIsStatusSaving(true);
      setStatusMessage(null);

      if (learnerRecord?.id) {
        const { error: learnerUpdateError } = await supabase
          .from('registrar_learners')
          .update({ status: nextStatus })
          .eq('id', learnerRecord.id);
        if (learnerUpdateError) throw learnerUpdateError;

        await supabase.from('registrar_enrollment_history').insert({
          learner_id: learnerRecord.id,
          school_year: String(submission.school_year || payload.schoolYear || '').trim(),
          grade_level: String(submission.grade_to_enroll || payload.gradeToEnroll || '').trim() || null,
          section: currentYearSectionName || null,
          status: nextStatus,
          enrollment_date: new Date().toISOString(),
          submission_payload: nextPayload,
          source: 'registrar.public-enrollment.status-change',
        });
      }

      await updatePublicEnrollmentSubmissionRecord(submission.id, {
        school_id: submission.school_id || null,
        school_year: submission.school_year || null,
        lrn: submission.lrn || null,
        last_name: submission.last_name || null,
        first_name: submission.first_name || null,
        middle_name: submission.middle_name || null,
        grade_to_enroll: submission.grade_to_enroll || null,
        guardian_contact: submission.guardian_contact || null,
        payload: nextPayload as any,
      });

      setSubmission((current) => (current ? { ...current, payload: nextPayload as any } : current));
      setLearnerRecord((current) => (current ? { ...current, status: nextStatus } : current));
      setStatusDraft(nextStatus);
      setStatusMessage(`Status updated to ${nextStatus}.`);
    } catch (e: any) {
      setStatusMessage(e?.message || 'Unable to update learner status.');
    } finally {
      setIsStatusSaving(false);
    }
  };

  return (
    <section className="portal-panel registrar-public-enrollment-submissions">
      <div className="portal-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2>Submission Details</h2>
          <p>{fullName || '--'} - LRN: {submission.lrn || '--'}</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => navigate('/enroll')}>Back</button>
      </div>
      <div className="portal-panel__body" style={{ display: 'grid', gap: 14 }}>
        <div className="notice-box">
          <strong>Submission Information</strong>
          <span>Received: {formatDate(submission.created_at)} - School Year: {submission.school_year || payload.schoolYear || '--'} - Grade: {submission.grade_to_enroll || payload.gradeToEnroll || '--'}</span>
        </div>
        <div className="notice-box registrar-public-enrollment-submissions__status-card">
          <strong>Check Submission Status</strong>
          <div className="registrar-public-enrollment-submissions__status-grid">
            <div className={`registrar-public-enrollment-submissions__status-pill registrar-public-enrollment-submissions__status-pill--${statusTone}`}>
              <span className="registrar-public-enrollment-submissions__status-dot" aria-hidden="true" />
              <span>{submissionStatus}</span>
            </div>
            <div className="registrar-public-enrollment-submissions__status-field">
              <SearchableSelect
                label="Status"
                placeholder="Select status"
                floatingLabel
                showLabel={false}
                value={statusDraft}
                onChange={setStatusDraft}
                options={statusOptions}
              />
            </div>
            <button type="button" className="secondary-button registrar-public-enrollment-submissions__status-action" onClick={() => void saveStatusChange()} disabled={isStatusSaving}>
              {isStatusSaving ? 'Updating...' : 'Change Status'}
            </button>
          </div>
          <p className="registrar-public-enrollment-submissions__status-note">
            {hasCurrentSchoolYearSection
              ? `Learner is assigned to ${currentYearSectionName || learnerRecord?.sectionName || 'a section'} for the current active school year, so the visible status stays Enrolled.`
              : hasPriorEnrollmentHistory
                ? 'This learner has a previous record, but no section is assigned for the current school year.'
                : 'Select a new status for the learner record linked to this submission.'}
          </p>
          {statusMessage ? <p className="registrar-public-enrollment-submissions__status-feedback">{statusMessage}</p> : null}
        </div>
        <div className="notice-box">
          <strong>Enrollment History</strong>
          <div style={{ marginTop: 10, overflowX: 'auto' }}>
            <table className="usis-table registrar-public-enrollment-submissions__history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>School Year</th>
                  <th>Grade Level</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentHistoryRows.length > 0 ? (
                  enrollmentHistoryRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.enrolledAt)}</td>
                      <td>{row.schoolYear || '--'}</td>
                      <td>{row.gradeLevel || '--'}</td>
                      <td>{row.section || '--'}</td>
                      <td>
                        <span className={`registrar-public-enrollment-submissions__status-pill registrar-public-enrollment-submissions__status-pill--${resolveHistoryTone(row.status || 'Recorded')}`}>
                          <span className="registrar-public-enrollment-submissions__status-dot" aria-hidden="true" />
                          <span>{row.status || 'Pending'}</span>
                        </span>
                      </td>
                      <td>
                        {row.source === 'learner-history' ? (
                          <button
                            type="button"
                            className="secondary-button registrar-public-enrollment-submissions__history-delete"
                            onClick={() => void deleteHistoryRow(row)}
                            disabled={deletingHistoryRowId === row.id}
                          >
                            {deletingHistoryRowId === row.id ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : (
                          <span>--</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No enrollment history records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="notice-box">
          <strong>Audit Trail</strong>
          <div className="registrar-public-enrollment-submissions__audit-trail-list">
            {auditTrail.map((item, index) => (
              <article key={`${item.id}-${index}`} className="registrar-public-enrollment-submissions__audit-item">
                <div className="registrar-public-enrollment-submissions__audit-copy">
                  <strong className="registrar-public-enrollment-submissions__audit-title">{item.title}</strong>
                  <p className="registrar-public-enrollment-submissions__audit-date">{formatDate(item.date)}</p>
                  <p className="registrar-public-enrollment-submissions__audit-detail">{item.detail}</p>
                </div>
                <div className="registrar-public-enrollment-submissions__audit-side">
                  {item.deletable ? (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ minHeight: 32, padding: '0 10px' }}
                      onClick={() => void deleteTrail(item)}
                      disabled={isDeletingTrailId === item.id}
                    >
                      {isDeletingTrailId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {auditTrail.length === 0 ? <span>No audit trail events recorded yet.</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
