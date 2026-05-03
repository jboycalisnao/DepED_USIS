import React, { useMemo } from 'react';
import { EnrollmentRecord, Student } from '../types';

interface LearnerDetailsModalProps {
  student: Student | null;
  history: EnrollmentRecord[];
  onClose: () => void;
}

const profileFlagOptions = [
  { label: 'SSLG Member', key: 'isSSLG', icon: 'military_tech' },
  { label: 'Club Officer', key: 'isClubOfficer', icon: 'workspace_premium' },
  { label: 'Athlete', key: 'isAthlete', icon: 'sports_basketball' },
  { label: 'Artist', key: 'isArtist', icon: 'palette' },
  { label: '4Ps', key: 'is4Ps', icon: 'family_restroom' },
  { label: 'Indigent', key: 'isIndigent', icon: 'volunteer_activism' },
] as const;

const LearnerDetailsModal: React.FC<LearnerDetailsModalProps> = ({ student, history, onClose }) => {
  const profileFlags = useMemo(() => {
    if (!student) return [];
    return profileFlagOptions.filter((flag) => Boolean(student[flag.key]));
  }, [student]);

  if (!student) return null;

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
              <span>{student.status}</span>
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

            {profileFlags.length > 0 && (
              <section className="modal-record__section">
                <h4>Institutional Profile</h4>
                <div className="modal-record__chips">
                  {profileFlags.map((flag) => (
                    <span className="modal-record__chip" key={flag.key}>
                      <span className="material-symbols-outlined">{flag.icon}</span>
                      {flag.label}
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
