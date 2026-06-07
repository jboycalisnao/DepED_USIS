import { LearnerAttendanceMonthRow, formatAttendanceTapType } from '../../../../services/attendanceService';

const DAY_HEADERS = Array.from({ length: 31 }, (_, index) => index + 1);

type MonthlyAttendanceTableProps = {
  months: LearnerAttendanceMonthRow[];
};

export function MonthlyAttendanceTable({ months }: MonthlyAttendanceTableProps) {
  return (
    <div className="pta-fee-table-scroll learner-attendance-table-scroll">
      <table className="pta-fee-table pta-fee-table--ledger learner-attendance-table">
        <colgroup>
          <col className="learner-attendance-table__month-col" />
          {DAY_HEADERS.map((day) => (
            <col key={day} className="learner-attendance-table__day-col" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="learner-attendance-table__month-head">
              <span>Month</span>
            </th>
            {DAY_HEADERS.map((day) => (
              <th key={day} className="learner-attendance-table__day-head" title={`Day ${day}`}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.length === 0 ? (
            <tr>
              <td colSpan={32} className="learner-attendance-table__empty">
                No consolidated attendance history yet.
              </td>
            </tr>
          ) : (
            months.map((month, index) => (
              <tr key={month.monthKey} className={index % 2 === 0 ? 'learner-attendance-table__row' : 'learner-attendance-table__row learner-attendance-table__row--alt'}>
                <td className="learner-attendance-table__month-cell">
                  <div className="learner-attendance-table__month-name">{month.monthLabel}</div>
                  <div className="learner-attendance-table__month-key">{month.monthKey}</div>
                </td>
                {month.days.map((day) => (
                  <td key={day.dateKey} className="learner-attendance-table__day-cell">
                    <div className="learner-attendance-table__day-number">{day.day}</div>
                    <div className="learner-attendance-table__tap-list learner-attendance-table__tap-list--stacked">
                      {day.taps.length > 0 ? (
                        day.taps.map((tap, tapIndex) => (
                          <div
                            key={`${day.dateKey}-${tap.type}-${tap.loggedAt}-${tapIndex}`}
                            className={`learner-attendance-table__tap-item ${tap.type === 'UNSCHEDULED' ? 'learner-attendance-table__tap-item--unscheduled' : ''}`}
                          >
                            <span className="learner-attendance-table__tap-type">{formatAttendanceTapType(tap.type)}</span>
                            <span className="learner-attendance-table__tap-time">{tap.displayTime || '-'}</span>
                          </div>
                        ))
                      ) : (
                        <span className="learner-attendance-table__tap-empty">-</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
