import React, { useMemo } from 'react';
import { EnrollmentRecord, getLearnerStatusTone, resolveEffectiveLearnerStatus, Student } from '../types';
import { normalizeLearnerTags } from '../utils/learnerTags';

interface LearnerDetailsModalProps {
  student: Student | null;
  history: EnrollmentRecord[];
  activeSchoolYearLabel?: string;
  onClose: () => void;
  onChangeStatus?: (student: Student) => void;
  onToggleLoginStatus?: (student: Student) => void;
}

const LearnerDetailsModal: React.FC<LearnerDetailsModalProps> = ({
  student,
  history,
  activeSchoolYearLabel = '',
  onClose,
  onChangeStatus,
  onToggleLoginStatus,
}) => {
  const learnerTags = useMemo(() => {
    if (!student) return [];
    return normalizeLearnerTags(student.tags);
  }, [student]);

  if (!student) return null;

  const effectiveStatus = resolveEffectiveLearnerStatus(student, activeSchoolYearLabel);
  const isLoginDisabled =
    (student.loginStatus || '').trim().toLowerCase() === 'inactive' ||
    (student.loginStatus || '').trim().toLowerCase() === 'disabled';
  const isLoginActive = !isLoginDisabled;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />

      <article className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="learner-details-title">
        <header className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Learner Record</p>
            <h3 id="learner-details-title">
              {student.lastName}, {student.firstName} {student.middleName || ''}
            </h3>
            <div className="modal-record__meta">
              <span>LRN {student.lrn}</span>
              <span>{student.gender}</span>
              <span className={`status-badge status-badge--${getLearnerStatusTone(effectiveStatus)}`}>
                {effectiveStatus}
              </span>
              <span className={`status-badge status-badge--${isLoginActive ? 'enrolled' : 'withdrawn'}`}>
                Login: {isLoginActive ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close learner record">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="modal-dialog__body custom-scrollbar">
          <div className="modal-record">
            <div className="modal-record__grid">
              <section className="modal-record__section">
                <h4>Personal Record</h4>
                <div className="modal-record__fields">
                  <RecordField label="Birth Date" value={student.birthDate || 'Not Provided'} />
                  <RecordField label="Contact" value={student.contactNumber || 'N/A'} />
                  <RecordField label="Permanent Address" value={student.address || 'Local Resident'} />
                </div>
              </section>

              <section className="modal-record__section">
                <h4>Family Background</h4>
                <div className="modal-record__fields">
                  <RecordField label="Father" value={student.father_name || 'N/A'} />
                  <RecordField label="Mother" value={student.mother_name || 'N/A'} />
                  <RecordField label="Guardian" value={student.guardian_name || 'Parent/Guardian'} />
                </div>
              </section>
            </div>

            {(student.is4Ps || learnerTags.length > 0) && (
              <section className="modal-record__section">
                <h4>Institutional Profile</h4>
                <div className="modal-record__fields">
                  <RecordField label="4Ps Beneficiary" value={student.is4Ps ? 'Yes' : 'No'} />
                </div>
                <div className="modal-record__chips">
                  {learnerTags.map((tag) => (
                    <span className="modal-record__chip" key={tag}>
                      <span className="material-symbols-outlined">sell</span>
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="modal-record__section">
              <h4>Academic Lifecycle</h4>
              {history.length > 0 ? (
                <div className="modal-record__grid">
                  {history.map((record) => (
                    <div className="modal-record__timeline" key={`${record.schoolYear}-${record.gradeLevel}-${record.section}`}>
                      <span>{record.schoolYear}</span>
                      <strong>{record.gradeLevel} - {record.section}</strong>
                      <p>{record.status} on {record.enrollmentDate}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="notice-box">
                  <strong>No historical records found</strong>
                  <span>This learner has no archived enrollment lifecycle entries.</span>
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="modal-dialog__actions">
          {onChangeStatus ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                onClose();
                onChangeStatus(student);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }}>
                published_with_changes
              </span>
              Change Status
            </button>
          ) : null}
          {onToggleLoginStatus ? (
            <button
              type="button"
              className={isLoginActive ? 'secondary-button' : 'primary-button'}
              onClick={() => {
                onClose();
                onToggleLoginStatus(student);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }}>
                {isLoginActive ? 'lock_person' : 'lock_open'}
              </span>
              {isLoginActive ? 'Disable Login Credentials' : 'Enable Login Credentials'}
            </button>
          ) : null}
          <button type="button" onClick={() => window.print()}>Generate Dossier</button>
          <button type="button" className="modal-dialog__blue" onClick={onClose}>Close Record</button>
        </footer>
      </article>
    </div>
  );
};

function RecordField({ label, value }: { label: string; value: string }) {
  return (
    <div className="modal-record__field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default LearnerDetailsModal;
