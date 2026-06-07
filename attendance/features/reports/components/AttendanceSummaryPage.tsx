import { useMemo, useState } from 'react';
import { AttendanceMonthlySummaryRow, AttendanceWeeklySummaryRow } from '../../../types';

interface AttendanceSummaryPageProps {
  onQuerySummaryRange: (
    fromDate: string,
    toDate: string,
  ) => Promise<{ weekly: AttendanceWeeklySummaryRow[]; monthly: AttendanceMonthlySummaryRow[] }>;
}

const todayIso = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, '0');
  const dd = `${now.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const AttendanceSummaryPage = ({ onQuerySummaryRange }: AttendanceSummaryPageProps) => {
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - 30);
    const yyyy = now.getFullYear();
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [toDate, setToDate] = useState(() => todayIso());
  const [loading, setLoading] = useState(false);
  const [weekly, setWeekly] = useState<AttendanceWeeklySummaryRow[]>([]);
  const [monthly, setMonthly] = useState<AttendanceMonthlySummaryRow[]>([]);

  const totals = useMemo(() => {
    const expected = weekly.reduce((sum, row) => sum + row.expectedSlots, 0);
    const present = weekly.reduce((sum, row) => sum + row.presentSlots, 0);
    const missing = weekly.reduce((sum, row) => sum + row.missingSlots, 0);
    const rate = expected > 0 ? Math.round((present / expected) * 100) : 0;
    return { expected, present, missing, rate };
  }, [weekly]);

  const load = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      const result = await onQuerySummaryRange(fromDate, toDate);
      setWeekly(result.weekly);
      setMonthly(result.monthly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="portal-panel attendance-summary-page">
      <div className="portal-panel__header">
        <h1>Attendance Summary</h1>
        <p className="attendance-summary-page__subtitle">Weekly and monthly attendance analytics.</p>
      </div>

      <div className="portal-panel__body attendance-summary-page__body">
        <section className="section-card attendance-summary-page__filters">
          <div className="section-card__bar" />
          <div className="section-card__content attendance-summary-page__filters-content">
            <div className="attendance-summary-page__filters-copy">
              <h3>Range Filter</h3>
              <p>Select a date range to load weekly and monthly summary data.</p>
            </div>

            <div className="form-grid attendance-summary-page__filter-grid">
              <label className="usis-date-time-picker">
                <small>From Date</small>
                <div className="usis-date-time-picker__control floating-field__control">
                  <input
                    type="date"
                    value={fromDate}
                    data-has-value={Boolean(fromDate)}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                  <span className="usis-date-time-picker__floating-label">From Date</span>
                </div>
              </label>

              <label className="usis-date-time-picker">
                <small>To Date</small>
                <div className="usis-date-time-picker__control floating-field__control">
                  <input
                    type="date"
                    value={toDate}
                    data-has-value={Boolean(toDate)}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                  <span className="usis-date-time-picker__floating-label">To Date</span>
                </div>
              </label>
            </div>

            <div className="form-actions attendance-summary-page__actions">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading || !fromDate || !toDate}
                className="primary-button"
              >
                {loading ? 'Loading...' : 'Load Summary'}
              </button>
            </div>
          </div>
        </section>

        <section className="attendance-summary-page__stats-grid">
          <div className="section-card attendance-summary-page__stat-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Expected Slots</h3>
              <p className="attendance-summary-page__stat-value">{totals.expected}</p>
            </div>
          </div>

          <div className="section-card attendance-summary-page__stat-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Present Slots</h3>
              <p className="attendance-summary-page__stat-value attendance-summary-page__stat-value--success">{totals.present}</p>
            </div>
          </div>

          <div className="section-card attendance-summary-page__stat-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Missing Slots</h3>
              <p className="attendance-summary-page__stat-value attendance-summary-page__stat-value--warning">{totals.missing}</p>
            </div>
          </div>

          <div className="section-card attendance-summary-page__stat-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Attendance Rate</h3>
              <p className="attendance-summary-page__stat-value attendance-summary-page__stat-value--blue">{totals.rate}%</p>
            </div>
          </div>
        </section>

        <section className="section-card attendance-summary-page__table-section">
          <div className="section-card__bar" />
          <div className="section-card__content attendance-summary-page__table-block">
            <h3>Weekly Summary</h3>
            <div className="attendance-summary-page__table-shell">
              <table className="attendance-summary-page__table">
                <thead>
                  <tr>
                    <th>Week Start</th>
                    <th>Section</th>
                    <th>Grade</th>
                    <th className="is-right">Expected</th>
                    <th className="is-right">Present</th>
                    <th className="is-right">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="attendance-summary-page__empty">No weekly summary data.</td>
                    </tr>
                  ) : (
                    weekly.map((row, index) => (
                      <tr key={`${row.weekStart}-${row.sectionName}-${index}`}>
                        <td>{row.weekStart}</td>
                        <td className="is-strong">{row.sectionName}</td>
                        <td>{row.gradeLevel}</td>
                        <td className="is-right">{row.expectedSlots}</td>
                        <td className="is-right is-success">{row.presentSlots}</td>
                        <td className="is-right is-warning">{row.missingSlots}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section-card attendance-summary-page__table-section">
          <div className="section-card__bar" />
          <div className="section-card__content attendance-summary-page__table-block">
            <h3>Monthly Summary</h3>
            <div className="attendance-summary-page__table-shell">
              <table className="attendance-summary-page__table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Section</th>
                    <th>Grade</th>
                    <th className="is-right">Expected</th>
                    <th className="is-right">Present</th>
                    <th className="is-right">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="attendance-summary-page__empty">No monthly summary data.</td>
                    </tr>
                  ) : (
                    monthly.map((row, index) => (
                      <tr key={`${row.summaryMonth}-${row.sectionName}-${index}`}>
                        <td>{row.summaryMonth}</td>
                        <td className="is-strong">{row.sectionName}</td>
                        <td>{row.gradeLevel}</td>
                        <td className="is-right">{row.expectedSlots}</td>
                        <td className="is-right is-success">{row.presentSlots}</td>
                        <td className="is-right is-warning">{row.missingSlots}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default AttendanceSummaryPage;
