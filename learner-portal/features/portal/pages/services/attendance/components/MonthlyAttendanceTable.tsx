import { LearnerAttendanceMonthRow, formatAttendanceTapType } from '../../../../services/attendanceService';

const DAY_HEADERS = Array.from({ length: 31 }, (_, index) => index + 1);
const TAP_ROW_TYPES = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'] as const;

type MonthlyAttendanceTableProps = {
  months: LearnerAttendanceMonthRow[];
};

type LearnerAttendanceTap = LearnerAttendanceMonthRow['days'][number]['taps'][number];

const rowLabelMap: Record<(typeof TAP_ROW_TYPES)[number], string> = {
  AM_IN: 'AM In',
  AM_OUT: 'AM Out',
  PM_IN: 'PM In',
  PM_OUT: 'PM Out',
};

const formatMobileDate = (dateKey: string) => {
  const candidate = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(candidate.getTime())) return dateKey;
  return candidate.toLocaleDateString('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

export function MonthlyAttendanceTable({ months }: MonthlyAttendanceTableProps) {
  const renderTapChip = (tap: LearnerAttendanceTap, dayKey: string, tapIndex: number) => (
    <div
      key={`${dayKey}-${tap.type}-${tap.loggedAt}-${tapIndex}`}
      className={`learner-attendance-table__tap-item ${
        tap.type === 'UNSCHEDULED' ? 'learner-attendance-table__tap-item--unscheduled' : ''
      } ${tap.isLate ? 'learner-attendance-table__tap-item--late' : ''} learner-attendance-table__tap-item--${tap.type.toLowerCase()}`}
    >
      <span className="learner-attendance-table__tap-meta">
        <span className="learner-attendance-table__tap-type">{formatAttendanceTapType(tap.type)}</span>
        {tap.isLate ? <span className="learner-attendance-table__tap-late-pill">Late</span> : null}
      </span>
      <span className="learner-attendance-table__tap-time">{tap.displayTime || '-'}</span>
    </div>
  );

  const renderDayRow = (day: (typeof months)[number]['days'][number], tapType: (typeof TAP_ROW_TYPES)[number]) => {
    const taps = day.taps.filter((tap) => tap.type === tapType);
    const hasLate = taps.some((tap) => tap.isLate);
    const hasValue = taps.length > 0;

    return (
      <div
        key={`${day.dateKey}-${tapType}`}
        className={`learner-attendance-table-mobile__row learner-attendance-table-mobile__row--${tapType.toLowerCase()} ${hasLate ? 'learner-attendance-table-mobile__row--late' : ''} ${hasValue ? 'learner-attendance-table-mobile__row--filled' : ''}`}
      >
        <span className="learner-attendance-table-mobile__label">{formatAttendanceTapType(tapType)}</span>
        <span className="learner-attendance-table-mobile__value">
          {hasValue ? (
            taps.map((tap, tapIndex) => renderTapChip(tap, day.dateKey, tapIndex))
          ) : (
            <span className="learner-attendance-table__tap-empty">-</span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="learner-attendance-table-shell">
      <div className="pta-fee-table-scroll learner-attendance-table-scroll learner-attendance-table-scroll--desktop">
        <table className="pta-fee-table pta-fee-table--ledger learner-attendance-table">
        <colgroup>
          <col className="learner-attendance-table__month-col" />
          <col className="learner-attendance-table__type-col" />
          {DAY_HEADERS.map((day) => (
            <col key={day} className="learner-attendance-table__day-col" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="learner-attendance-table__month-head">
              <span>Month</span>
            </th>
            <th className="learner-attendance-table__type-head">
              <span>Type</span>
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
              <td colSpan={33} className="learner-attendance-table__empty">
                No consolidated attendance history yet.
              </td>
            </tr>
          ) : (
            months.flatMap((month, monthIndex) => {
              const monthCell = (
                <td key={`${month.monthKey}-month`} className="learner-attendance-table__month-cell" rowSpan={TAP_ROW_TYPES.length}>
                  <div className="learner-attendance-table__month-name">{month.monthLabel}</div>
                  <div className="learner-attendance-table__month-key">{month.monthKey}</div>
                </td>
              );

              return TAP_ROW_TYPES.map((tapType, tapRowIndex) => {
                const rowClassName =
                  monthIndex % 2 === 0
                    ? `learner-attendance-table__row learner-attendance-table__row--${tapType.toLowerCase()}`
                    : `learner-attendance-table__row learner-attendance-table__row--${tapType.toLowerCase()} learner-attendance-table__row--alt`;
                const filteredDays = month.days.map((day) => ({
                  ...day,
                  taps: day.taps.filter((tap) => tap.type === tapType),
                }));

                return (
                  <tr key={`${month.monthKey}-${tapType}`} className={rowClassName}>
                    {tapRowIndex === 0 ? monthCell : null}
                    <td className={`learner-attendance-table__type-cell learner-attendance-table__type-cell--${tapType.toLowerCase()}`}>
                      <span className="learner-attendance-table__type-label">{rowLabelMap[tapType]}</span>
                    </td>
                    {filteredDays.map((day) => {
                      const hasLate = day.taps.some((tap) => tap.isLate);
                      return (
                        <td
                          key={`${day.dateKey}-${tapType}`}
                          className={`learner-attendance-table__day-cell learner-attendance-table__day-cell--${tapType.toLowerCase()} ${hasLate ? 'learner-attendance-table__day-cell--late' : ''}`}
                        >
                          <div className="learner-attendance-table__tap-list learner-attendance-table__tap-list--stacked">
                            {day.taps.length > 0 ? (
                              day.taps.map((tap, tapIndex) => renderTapChip(tap, day.dateKey, tapIndex))
                            ) : (
                              <span className="learner-attendance-table__tap-empty">-</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            })
          )}
        </tbody>
        </table>
      </div>

      <div className="learner-attendance-table-mobile" aria-label="Mobile attendance cards">
        {months.length === 0 ? (
          <p className="learner-attendance-table-mobile__empty">No consolidated attendance history yet.</p>
        ) : (
          months.map((month) => (
            <details key={month.monthKey} className="learner-attendance-table-mobile__month-card">
              <summary className="learner-attendance-table-mobile__month-header">
                <div className="learner-attendance-table-mobile__month-summary-text">
                  <div className="learner-attendance-table-mobile__month-name">{month.monthLabel}</div>
                  <div className="learner-attendance-table-mobile__month-key">{month.monthKey}</div>
                </div>
                <span className="learner-attendance-table-mobile__month-badge">{month.days.length} days</span>
              </summary>

              <div className="learner-attendance-table-mobile__days">
                {month.days.map((day) => {
                  const dayHasLate = day.taps.some((tap) => tap.isLate);
                  return (
                    <section
                      key={day.dateKey}
                      className={`learner-attendance-table-mobile__day-card ${dayHasLate ? 'learner-attendance-table-mobile__day-card--late' : ''}`}
                    >
                      <div className="learner-attendance-table-mobile__day-title">
                        <div className="learner-attendance-table-mobile__day-title-text">
                          <span className="learner-attendance-table-mobile__day-number">Day {day.day}</span>
                          <span className="learner-attendance-table-mobile__day-date">{formatMobileDate(day.dateKey)}</span>
                        </div>
                        {dayHasLate ? <span className="learner-attendance-table__tap-late-pill">Late</span> : null}
                      </div>

                      <div className="learner-attendance-table-mobile__rows">
                        {TAP_ROW_TYPES.map((tapType) => renderDayRow(day, tapType))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
