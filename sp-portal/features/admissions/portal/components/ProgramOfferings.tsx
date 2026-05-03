import type { ProgramOffering } from '../types';

type ProgramOfferingsProps = {
  offerings: ProgramOffering[];
};

export function ProgramOfferings({ offerings }: ProgramOfferingsProps) {
  return (
    <section className="section-shell" id="programs">
      <div className="section-shell__header">
        <p className="section-shell__eyebrow">Programs / Grade Levels Offered</p>
        <h2>Programs Available for Application</h2>
      </div>
      <div className="table-card">
        <table className="usis-table">
          <thead>
            <tr>
              <th>Grade Level</th>
              <th>Program / Track</th>
              <th>Slots</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {offerings.map((offering) => (
              <tr key={offering.id}>
                <td>{offering.gradeLevel}</td>
                <td>{offering.programTrack}</td>
                <td>{offering.slots}</td>
                <td>{offering.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
