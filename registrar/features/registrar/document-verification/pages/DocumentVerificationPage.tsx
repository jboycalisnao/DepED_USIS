import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { RegistrarHeader } from '../../../../components/shell/RegistrarHeader';
import { RegistrarFooter } from '../../../../components/shell/RegistrarFooter';
import { loadDocumentVerificationRecord, type DocumentVerificationRecord } from '../services/documentVerificationService';

const DOCUMENT_NO = 'LNHS-REG-USIS-F01';

export default function DocumentVerificationPage() {
  const [searchParams] = useSearchParams();
  const learnerId = searchParams.get('learnerId') || '';
  const lrn = searchParams.get('lrn') || '';
  const doc = searchParams.get('doc') || '';
  const [record, setRecord] = useState<DocumentVerificationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (doc && doc !== DOCUMENT_NO) {
          throw new Error('The QR code does not match the expected registrar document number.');
        }
        const next = await loadDocumentVerificationRecord({ learnerId, lrn });
        if (!cancelled) setRecord(next);
      } catch (nextError: any) {
        if (!cancelled) {
          setRecord(null);
          setError(nextError?.message || 'Unable to verify the document.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [doc, learnerId, lrn]);

  const verificationState = useMemo(() => {
    if (error) return { label: 'Verification Failed', tone: 'danger' as const };
    if (!record) return { label: 'No Record Found', tone: 'warning' as const };
    return { label: 'Verified', tone: 'success' as const };
  }, [error, record]);

  if (isLoading) {
    return <UsisPageLoader message="Verifying registrar document..." />;
  }

  return (
    <>
      <RegistrarHeader showSearch={false} />
      <main className="page-frame">
        <div className="content-width">
          <section className="section-shell">
            <div className="section-card">
              <div className="section-card__bar" />
              <div className="section-card__content">
                <p className="section-card__eyebrow">Public Registrar Page</p>
                <h2>Document Verification</h2>
                <p className="registry-copy">Scan the QR code from the learner information sheet or enter the document link to verify authenticity.</p>

                <div className={`status-badge status-badge--${verificationState.tone}`}>
                  {verificationState.label}
                </div>

                {error ? (
                  <p className="login-card__error registry-feedback">{error}</p>
                ) : null}

                {record ? (
                  <div className="modal-record" style={{ marginTop: '20px' }}>
                    <div className="modal-record__summary">
                      <div className="modal-record__meta">
                        <span>Document No. {DOCUMENT_NO}</span>
                        <span>Learner ID {record.learner.id}</span>
                        <span>LRN {record.learner.lrn}</span>
                      </div>
                      <h3>{record.learner.lastName}, {record.learner.firstName} {record.learner.middleName || ''}</h3>
                    </div>
                    <div className="modal-record__grid">
                      <div className="modal-record__section">
                        <h4>Identity</h4>
                        <div className="modal-record__fields">
                          <div className="modal-record__field"><span>Gender</span><strong>{record.learner.gender || 'N/A'}</strong></div>
                          <div className="modal-record__field"><span>Birth Date</span><strong>{record.learner.birthDate || 'N/A'}</strong></div>
                          <div className="modal-record__field"><span>Status</span><strong>{record.learner.status}</strong></div>
                          <div className="modal-record__field"><span>Contact</span><strong>{record.learner.contactNumber || 'N/A'}</strong></div>
                        </div>
                      </div>
                      <div className="modal-record__section">
                        <h4>Enrollment</h4>
                        <div className="modal-record__fields">
                          <div className="modal-record__field"><span>Section</span><strong>{record.section ? record.section.name : 'Unassigned'}</strong></div>
                          <div className="modal-record__field"><span>Grade Level</span><strong>{record.section?.gradeLevel || 'Unassigned'}</strong></div>
                          <div className="modal-record__field"><span>Strand</span><strong>{record.section?.strand || 'N/A'}</strong></div>
                          <div className="modal-record__field"><span>School Year</span><strong>{record.section?.schoolYearId || record.learner.schoolYear || 'N/A'}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="section-card__content" style={{ paddingTop: '14px' }}>
                    <p>No learner record was found for this verification code.</p>
                  </div>
                )}

                <div style={{ marginTop: '18px' }}>
                  <Link className="secondary-button" to="/">
                    Back to Registrar Landing
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <RegistrarFooter />
    </>
  );
}
