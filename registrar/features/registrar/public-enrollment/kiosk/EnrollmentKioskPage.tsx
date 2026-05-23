import { useEffect, useMemo, useState } from 'react';
import { getEnrollmentKioskState, subscribeEnrollmentKioskState, type EnrollmentKioskState } from './enrollmentKioskSync';
import '../../../../styles/publicEnrollment.css';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
}

const draftFieldLabels: Array<{ key: string; label: string }> = [
  { key: 'schoolId', label: 'School ID' },
  { key: 'schoolYear', label: 'School Year' },
  { key: 'schoolToEnroll', label: 'School to Enroll' },
  { key: 'studentType', label: 'Learner Type' },
  { key: 'learnerCategory', label: 'Learner Category' },
  { key: 'previousSchool', label: 'Previous School Attended' },
  { key: 'previousSchoolYear', label: 'Last S.Y. Attended' },
  { key: 'lastGradeLevel', label: 'Last Grade Level Attended' },
  { key: 'gradeToEnroll', label: 'Grade Level to Enroll' },
  { key: 'track', label: 'Track' },
  { key: 'strand', label: 'Preferred Strand' },
  { key: 'semester', label: 'Semester' },
  { key: 'birthCertificateNo', label: 'PSA Birth Certificate No.' },
  { key: 'lrn', label: 'LRN' },
  { key: 'email', label: 'Email Address' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'extensionName', label: 'Extension Name' },
  { key: 'birthDate', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'placeOfBirth', label: 'Place of Birth' },
  { key: 'learnerContact', label: 'Learner Contact Number' },
  { key: 'motherTongue', label: 'Mother Tongue' },
  { key: 'religion', label: 'Religion' },
  { key: 'is4Ps', label: '4Ps Beneficiary' },
  { key: 'fourPsHouseholdId', label: '4Ps Household ID' },
  { key: 'currentAddress', label: 'Current Address' },
  { key: 'permanentAddress', label: 'Permanent Address' },
  { key: 'fatherName', label: "Father's Full Name" },
  { key: 'fatherContact', label: "Father's Contact Number" },
  { key: 'motherName', label: "Mother's Maiden Name" },
  { key: 'motherContact', label: "Mother's Contact Number" },
  { key: 'guardianName', label: "Legal Guardian's Name" },
  { key: 'guardianContact', label: "Guardian's Contact Number" },
  { key: 'hasSpedNeed', label: 'SPED Need' },
  { key: 'preferredModality', label: 'Preferred Learning Modality' },
  { key: 'deviceAccess', label: 'Preferred Device' },
  { key: 'hasInternet', label: 'Internet Access' },
];

const draftFieldLabelMap = new Map(draftFieldLabels.map((field) => [field.key, field.label]));

function fallbackLabelFromKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export default function EnrollmentKioskPage() {
  const [state, setState] = useState<EnrollmentKioskState>(() => getEnrollmentKioskState());

  useEffect(() => {
    return subscribeEnrollmentKioskState(setState);
  }, []);

  const visibleDraftRows = useMemo(() => {
    const draft = state.draft || {};
    return draftFieldLabels
      .map(({ key, label }) => {
        const value = String((draft as Record<string, unknown>)[key] ?? '').trim();
        return {
          key,
          label,
          value,
        };
      });
  }, [state.draft]);

  const groupedRows = useMemo(() => {
    const enrollmentContextKeys = ['schoolId', 'schoolYear', 'schoolToEnroll', 'studentType', 'learnerCategory', 'previousSchool', 'previousSchoolYear', 'lastGradeLevel', 'gradeToEnroll', 'track', 'strand', 'semester'];
    const learnerInfoKeys = ['birthCertificateNo', 'lrn', 'email', 'lastName', 'firstName', 'middleName', 'extensionName', 'birthDate', 'gender', 'placeOfBirth', 'learnerContact', 'motherTongue', 'religion', 'is4Ps', 'fourPsHouseholdId'];
    const addressInfoKeys = ['currentAddress', 'permanentAddress'];
    const guardianInfoKeys = ['fatherName', 'fatherContact', 'motherName', 'motherContact', 'guardianName', 'guardianContact', 'hasSpedNeed', 'preferredModality', 'deviceAccess', 'hasInternet'];

    const group = (keys: string[]) => visibleDraftRows.filter((row) => keys.includes(row.key));
    const categorizedKeys = new Set([...enrollmentContextKeys, ...learnerInfoKeys, ...addressInfoKeys, ...guardianInfoKeys]);

    return {
      enrollmentContext: group(enrollmentContextKeys),
      learnerInfo: group(learnerInfoKeys),
      addressInfo: group(addressInfoKeys),
      guardianInfo: group(guardianInfoKeys),
      otherInfo: Object.entries(state.draft || {})
        .map(([key, rawValue]) => ({
          key,
          label: draftFieldLabelMap.get(key) || fallbackLabelFromKey(key),
          value: String(rawValue ?? '').trim(),
        }))
        .filter((row) => !categorizedKeys.has(row.key) && row.value),
    };
  }, [visibleDraftRows, state.draft]);

  const cardClass = (section: 'enrollmentContext' | 'learnerInfo' | 'addressInfo' | 'guardianInfo' | 'otherInfo') => {
    const isFocused = state.focusedSection === section;
    const hasFocus = Boolean(state.focusedSection);
    return [
      'registrar-kiosk-card',
      isFocused ? 'registrar-kiosk-card--focused' : '',
      hasFocus && !isFocused ? 'registrar-kiosk-card--dimmed' : '',
    ].filter(Boolean).join(' ');
  };

  return (
    <div className="registrar-kiosk-page">
      <header className="registrar-kiosk-page__header">
        <div>
          <p className="registrar-kiosk-page__eyebrow">Registrar Enrollment Kiosk</p>
          <h1>Live Learner Information Display</h1>
          <p className="registrar-kiosk-page__meta">Last update: {formatDateTime(state.updatedAt)}</p>
        </div>
        <div className="registrar-kiosk-page__header-right">
          <span className={`registrar-kiosk-status-chip ${state.isEditing ? 'registrar-kiosk-status-chip--active' : ''}`}>
            {state.isEditing ? 'Encoding in progress' : 'Waiting for active edit session'}
          </span>
          <p className="registrar-kiosk-page__meta">Live sync from Registrar Enrollment</p>
        </div>
      </header>

      <section className="registrar-kiosk-board">
        <aside className="registrar-kiosk-column">
          <article className="registrar-kiosk-card">
            <div className="registrar-kiosk-card__head">
              <h2>Selected Learner</h2>
              <span className="registrar-kiosk-card__badge">Previous Years</span>
            </div>
            {state.selectedLearner ? (
              <dl className="registrar-kiosk-list">
                <div><dt>Name</dt><dd>{state.selectedLearner.fullName}</dd></div>
                <div><dt>LRN</dt><dd>{state.selectedLearner.lrn || '--'}</dd></div>
                <div><dt>Latest S.Y.</dt><dd>{state.selectedLearner.latestSchoolYear || '--'}</dd></div>
                <div><dt>Latest Grade</dt><dd>{state.selectedLearner.latestGradeLevel || '--'}</dd></div>
                <div><dt>Latest Section</dt><dd>{state.selectedLearner.latestSection || '--'}</dd></div>
              </dl>
            ) : (
              <p className="registrar-kiosk-empty">No learner selected yet from enrollment search.</p>
            )}
          </article>
        </aside>

        <div className="registrar-kiosk-column">
          <article className={cardClass('enrollmentContext')}>
            <div className={`registrar-kiosk-focus-indicator ${state.focusedSection === 'enrollmentContext' ? 'is-active' : ''}`} />
            <div className="registrar-kiosk-card__head">
              <h2>Enrollment Context</h2>
              <span className="registrar-kiosk-card__badge">Form Section</span>
            </div>
            {groupedRows.enrollmentContext.length ? (
              <div className="registrar-kiosk-fields registrar-kiosk-fields--two-col">
                {groupedRows.enrollmentContext.map((row) => (
                  <div key={row.label} className="registrar-kiosk-field">
                    <span>{row.label}</span>
                    <strong>{row.value || '--'}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="registrar-kiosk-empty">No enrollment context values yet.</p>
            )}
          </article>

          <article className={cardClass('addressInfo')}>
            <div className={`registrar-kiosk-focus-indicator ${state.focusedSection === 'addressInfo' ? 'is-active' : ''}`} />
            <div className="registrar-kiosk-card__head">
              <h2>Address Information</h2>
              <span className="registrar-kiosk-card__badge">Form Section</span>
            </div>
            {groupedRows.addressInfo.length ? (
              <div className="registrar-kiosk-fields">
                {groupedRows.addressInfo.map((row) => (
                  <div key={row.label} className="registrar-kiosk-field">
                    <span>{row.label}</span>
                    <strong>{row.value || '--'}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="registrar-kiosk-empty">No address values yet.</p>
            )}
          </article>

          <article className={cardClass('otherInfo')}>
            <div className={`registrar-kiosk-focus-indicator ${state.focusedSection === 'otherInfo' ? 'is-active' : ''}`} />
            <div className="registrar-kiosk-card__head">
              <h2>Other Enrollment Details</h2>
              <span className="registrar-kiosk-card__badge">Auto-captured</span>
            </div>
            {groupedRows.otherInfo.length ? (
              <div className="registrar-kiosk-fields registrar-kiosk-fields--two-col">
                {groupedRows.otherInfo.map((row) => (
                  <div key={row.key} className="registrar-kiosk-field">
                    <span>{row.label}</span>
                    <strong>{row.value || '--'}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="registrar-kiosk-empty">No additional values.</p>
            )}
          </article>
        </div>

        <div className="registrar-kiosk-column">
          <article className={cardClass('learnerInfo')}>
            <div className={`registrar-kiosk-focus-indicator ${state.focusedSection === 'learnerInfo' ? 'is-active' : ''}`} />
            <div className="registrar-kiosk-card__head">
              <h2>Learner Personal Information</h2>
              <span className="registrar-kiosk-card__badge">Form Section</span>
            </div>
            {groupedRows.learnerInfo.length ? (
              <div className="registrar-kiosk-fields registrar-kiosk-fields--two-col">
                {groupedRows.learnerInfo.map((row) => (
                  <div key={row.label} className="registrar-kiosk-field">
                    <span>{row.label}</span>
                    <strong>{row.value || '--'}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="registrar-kiosk-empty">No learner information values yet.</p>
            )}
          </article>

          <article className={cardClass('guardianInfo')}>
            <div className={`registrar-kiosk-focus-indicator ${state.focusedSection === 'guardianInfo' ? 'is-active' : ''}`} />
            <div className="registrar-kiosk-card__head">
              <h2>Parent, Guardian, and Access</h2>
              <span className="registrar-kiosk-card__badge">Form Section</span>
            </div>
            {groupedRows.guardianInfo.length ? (
              <div className="registrar-kiosk-fields registrar-kiosk-fields--two-col">
                {groupedRows.guardianInfo.map((row) => (
                  <div key={row.label} className="registrar-kiosk-field">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="registrar-kiosk-empty">No guardian/access values yet.</p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
