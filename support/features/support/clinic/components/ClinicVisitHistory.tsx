import type { ClinicVisitRecord } from '../types';
import { formatClinicDateTime } from '../utils/clinicFormatters';

type ClinicVisitHistoryProps = {
  visits: ClinicVisitRecord[];
};

export function ClinicVisitHistory({ visits }: ClinicVisitHistoryProps) {
  return (
    <article className="support-note-box clinic-flow-card">
      <strong>Clinic Visit Registry</strong>
      {visits.length === 0 ? (
        <span>No matching clinic records.</span>
      ) : (
        <div className="clinic-registry-table-wrap">
          <table className="clinic-registry-table">
            <thead>
              <tr>
                <th>Visit Code</th>
                <th>Learner Profile</th>
                <th>Consultation</th>
                <th>Vital Signs</th>
                <th>Disposition</th>
                <th>Assessed</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td>{visit.visitCode}</td>
                  <td>
                    <strong>{visit.learnerName}</strong>
                    <div>LRN: {visit.learnerLrn}</div>
                    <div>{visit.sex}, {visit.age} years old</div>
                    <div>{visit.gradeSection}</div>
                    <div>Referred by: {visit.referredBy}</div>
                  </td>
                  <td>
                    <div>Complaint: {visit.concern}</div>
                    <div>Notes: {visit.notes}</div>
                    <div>Action: {visit.actionTaken}</div>
                  </td>
                  <td>
                    BP {visit.bloodPressure}
                    <br />
                    Temp {visit.temperatureC} C | Pulse {visit.pulseBpm}
                    <br />
                    RR {visit.respiratoryRate} | O2 {visit.oxygenSaturation}%
                    <br />
                    Ht {visit.heightCm} cm | Wt {visit.weightKg} kg
                  </td>
                  <td>
                    <div>{visit.disposition}</div>
                    {visit.followUpDate ? <div>Follow-up: {visit.followUpDate}</div> : null}
                  </td>
                  <td>{formatClinicDateTime(visit.assessedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
