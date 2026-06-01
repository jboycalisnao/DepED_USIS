import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../../../lib/supabase';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import type { PublicEnrollmentSubmission } from '../../types';
import { fetchPublicEnrollmentSubmissionById, updatePublicEnrollmentSubmissionRecord } from '../../services/publicEnrollmentSubmissions';

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

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '--';
  return date.toLocaleString();
};

export default function PublicEnrollmentSubmissionDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<PublicEnrollmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingTrailId, setIsDeletingTrailId] = useState<string | null>(null);
  const [learnerHistory, setLearnerHistory] = useState<Array<any>>([]);

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
        if (!lrn) return;
        const { data, error: learnerError } = await supabase
          .from('registrar_learners')
          .select('enrollment_history')
          .eq('lrn', lrn)
          .maybeSingle();
        if (cancelled || learnerError || !data) return;
        setLearnerHistory(Array.isArray((data as any).enrollment_history) ? (data as any).enrollment_history : []);
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
        <div className="notice-box">
          <strong>Audit Trail</strong>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {auditTrail.map((item, index) => (
              <article key={`${item.id}-${index}`} style={{ border: '1px solid rgba(18,35,61,0.14)', borderRadius: 10, padding: '10px 12px', background: '#fbfcff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
                  <strong>{item.title}</strong>
                  {item.deletable ? (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ minHeight: 30, padding: '0 10px' }}
                      onClick={() => void deleteTrail(item)}
                      disabled={isDeletingTrailId === item.id}
                    >
                      {isDeletingTrailId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  ) : null}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--deped-muted)' }}>{formatDate(item.date)}</p>
                <p style={{ margin: '4px 0 0' }}>{item.detail}</p>
              </article>
            ))}
            {auditTrail.length === 0 ? <span>No audit trail events recorded yet.</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
