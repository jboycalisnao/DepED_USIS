import type { LearnerAttendanceArchiveSnapshot } from '../../../../services/attendanceArchiveService';

type ArchivedAttendanceSectionProps = {
  snapshot: LearnerAttendanceArchiveSnapshot;
  isLoading: boolean;
  error: string | null;
};

const formatCount = (value: number) => value.toLocaleString();

export function ArchivedAttendanceSection({ snapshot, isLoading, error }: ArchivedAttendanceSectionProps) {
  return (
    <section className="learner-services-history learner-attendance-archive" aria-label="Archived attendance records">
      <header className="learner-services-history__header learner-attendance-archive__header">
        <div>
          <h3>Archived Attendance</h3>
          <p>
            These records have already been archived. The school portal shows only the archive summary and date ranges here.
          </p>
        </div>
        <span className="learner-attendance-archive__badge">Archived Records</span>
      </header>

      <div className="learner-attendance-archive__notice" role="note">
        <strong>Archived data notice:</strong> records in this section are no longer part of the live attendance table and are kept in the archive summaries.
      </div>

      <div className="learner-attendance-archive__stats" aria-label="Archived attendance summary metrics">
        <article className="learner-attendance-archive__metric">
          <span>Archive Batches</span>
          <strong>{formatCount(snapshot.totalBatches)}</strong>
        </article>
        <article className="learner-attendance-archive__metric">
          <span>Raw Rows Archived</span>
          <strong>{formatCount(snapshot.totalRows)}</strong>
        </article>
        <article className="learner-attendance-archive__metric">
          <span>Unscheduled Taps</span>
          <strong>{formatCount(snapshot.totalUnscheduled)}</strong>
        </article>
        <article className="learner-attendance-archive__metric learner-attendance-archive__metric--highlight">
          <span>Latest Archive Range</span>
          <strong>{snapshot.latestArchivedRange || 'N/A'}</strong>
        </article>
      </div>

      {isLoading ? <p className="learner-services-history__state">Loading archived attendance records.</p> : null}
      {error ? <p className="learner-services-history__state learner-attendance-archive__error">{error}</p> : null}
      {!isLoading && !error && snapshot.records.length === 0 ? (
        <p className="learner-services-history__state">No archived attendance records found for this learner yet.</p>
      ) : null}

      {!isLoading && !error && snapshot.records.length > 0 ? (
        <div className="pta-fee-table-scroll learner-attendance-archive__table-scroll">
          <table className="pta-fee-table pta-fee-table--ledger learner-attendance-archive__table">
            <colgroup>
              <col className="learner-attendance-archive__col--range" />
              <col className="learner-attendance-archive__col--month" />
              <col className="learner-attendance-archive__col--count" />
              <col className="learner-attendance-archive__col--count" />
              <col className="learner-attendance-archive__col--count" />
              <col className="learner-attendance-archive__col--count" />
              <col className="learner-attendance-archive__col--count" />
              <col className="learner-attendance-archive__col--count" />
              <col className="learner-attendance-archive__col--archive" />
            </colgroup>
            <thead>
              <tr>
                <th>Archive Range</th>
                <th>Month</th>
                <th>Rows</th>
                <th>AM In</th>
                <th>AM Out</th>
                <th>PM In</th>
                <th>PM Out</th>
                <th>Unscheduled</th>
                <th>Archived At</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.records.map((record) => (
                <tr key={record.id}>
                  <td className="learner-attendance-archive__range-cell">
                    <strong>{record.archiveRangeLabel}</strong>
                    <span>{record.notes || 'Archived in the system'}</span>
                  </td>
                  <td className="learner-attendance-archive__month-cell">
                    <strong>{record.archiveMonthLabel}</strong>
                    <span>{record.archiveMonth}</span>
                  </td>
                  <td className="pta-fee-cell--amount">{formatCount(record.rowCount)}</td>
                  <td className="pta-fee-cell--amount">{formatCount(record.amInCount)}</td>
                  <td className="pta-fee-cell--amount">{formatCount(record.amOutCount)}</td>
                  <td className="pta-fee-cell--amount">{formatCount(record.pmInCount)}</td>
                  <td className="pta-fee-cell--amount">{formatCount(record.pmOutCount)}</td>
                  <td className="pta-fee-cell--amount">{formatCount(record.unscheduledCount)}</td>
                  <td className="learner-attendance-archive__archive-cell">
                    <strong>{record.archivedAtLabel}</strong>
                    <span>{record.notes || 'Archive'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
