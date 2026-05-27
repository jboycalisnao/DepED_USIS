import type { ManagedSection, SectionTrack } from '../services/subjectsManagementService';

const trackLabel: Record<SectionTrack, string> = {
  regular: 'Regular',
  senior_high_school: 'Senior High School',
  special_program_ste: 'Special Program (STE)',
};

type Props = {
  onManage: (section: ManagedSection) => void;
  section: ManagedSection;
};

export function SectionSubjectsPreview({ onManage, section }: Props) {
  const subjects = Array.isArray(section.subjects) ? section.subjects : [];

  return (
    <div className="ia-subjects-section-view">
      <div className="ia-subjects-section-view__header">
        <div className="ia-subjects-section-view__meta">
          <p><strong>Track:</strong> {trackLabel[section.track]}</p>
          <p><strong>Adviser:</strong> {section.adviserName || 'Not Set'}</p>
        </div>
        <button type="button" className="registry-action-button" onClick={() => onManage(section)}>
          Manage Subjects
        </button>
      </div>
      <div className="registry-table-wrap">
        <table className="registry-table ia-registry-table--enhanced">
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Subject Title</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td>{subject.subjectCode}</td>
                <td>{subject.subjectTitle}</td>
                <td><span className="modal-record__chip">{subject.isCore ? 'Core' : 'Applied'}</span></td>
              </tr>
            ))}
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={3}>No subjects set for this section yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
