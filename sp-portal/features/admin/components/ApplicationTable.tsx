import type { AdminApplicationRecord } from '../utils/adminWorkspace';

type ApplicationTableProps = {
  applications: AdminApplicationRecord[];
  isSaving: boolean;
  onStatusChange: (applicationId: string, status: string) => void;
};

const statusOptions = [
  { label: 'Submitted', value: 'submitted' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'For Exam', value: 'for_exam' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Waitlisted', value: 'waitlisted' },
  { label: 'Declined', value: 'declined' },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not recorded';
  }

  return date.toLocaleDateString('en-PH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function ApplicationTable({ applications, isSaving, onStatusChange }: ApplicationTableProps) {
  if (applications.length === 0) {
    return (
      <div className="application-locked-panel">
        <strong>No applications yet.</strong>
        <span>Submitted applications will appear here for review and status updates.</span>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="usis-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Learner</th>
            <th>Program</th>
            <th>Guardian</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id}>
              <td>{application.applicationNumber}</td>
              <td>
                <strong>{application.learnerName}</strong>
                <span>{application.schoolName}</span>
              </td>
              <td>
                <strong>{application.incomingGradeLevel}</strong>
                <span>{application.selectedProgramTrack}</span>
              </td>
              <td>{application.guardianName}</td>
              <td>
                <strong>{application.guardianContact}</strong>
                <span>{application.email}</span>
              </td>
              <td>
                <select
                  className="admin-status-select"
                  disabled={isSaving}
                  value={application.status}
                  onChange={(event) => onStatusChange(application.id, event.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>{formatDate(application.submittedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
