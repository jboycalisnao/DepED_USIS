import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LearnerAttendanceMonthRow, formatAttendanceTapType } from '../../../../services/attendanceService';
import { normalizeGradeBand, type LearnerAttendanceTapType } from '../../../../services/attendanceSchedule';

const DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

type MonthlyAttendanceTableProps = {
  months: LearnerAttendanceMonthRow[];
  gradeLevel: string;
};

type LearnerAttendanceTap = LearnerAttendanceMonthRow['days'][number]['taps'][number];

type MonthStatus = 'present' | 'late' | 'absent' | 'incomplete' | 'no_class';

type CalendarCell = {
  key: string;
  dayNumber: number | null;
  dateKey: string;
  taps: LearnerAttendanceTap[];
  status: MonthStatus;
  isWeekend: boolean;
  isCurrentMonth: boolean;
};

const formatMonthTitle = (monthKey: string) => {
  const candidate = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(candidate.getTime())) return monthKey;
  return candidate.toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });
};

const getMonthMeta = (monthKey: string) => {
  const candidate = new Date(`${monthKey}-01T00:00:00`);
  const year = candidate.getFullYear();
  const month = candidate.getMonth();
  const start = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return {
    start,
    daysInMonth,
  };
};

const REQUIRED_TAPS_BY_GRADE_BAND: Record<'grade7To10' | 'grade11' | 'grade12', LearnerAttendanceTapType[]> = {
  grade7To10: ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'],
  grade11: ['AM_IN', 'AM_OUT'],
  grade12: ['PM_IN', 'PM_OUT'],
};

const getRequiredTapTypes = (gradeLevel: string) => REQUIRED_TAPS_BY_GRADE_BAND[normalizeGradeBand(gradeLevel)];

const getCellStatus = (taps: LearnerAttendanceTap[], isWeekend: boolean, gradeLevel: string): MonthStatus => {
  if (isWeekend) return 'no_class';
  if (taps.length === 0) return 'absent';

  const requiredTapTypes = getRequiredTapTypes(gradeLevel);
  const tapTypes = new Set(taps.map((tap) => tap.type));
  const missingRequiredTap = requiredTapTypes.some((tapType) => !tapTypes.has(tapType));
  if (missingRequiredTap) return 'incomplete';

  if (taps.some((tap) => tap.isLate)) return 'late';
  return 'present';
};

const buildCsv = (rows: Array<{ date: string; day: string; status: string; taps: string }>) => {
  const header = ['Date', 'Day', 'Status', 'Taps'];
  const body = rows.map((row) => [row.date, row.day, row.status, row.taps].map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','));
  return [header.join(','), ...body].join('\r\n');
};

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const getStatusLabel = (status: MonthStatus) => {
  switch (status) {
    case 'present':
      return 'Present';
    case 'late':
      return 'Late';
    case 'absent':
      return 'Absent';
    case 'incomplete':
      return 'Incomplete';
    case 'no_class':
      return 'No Class';
    default:
      return status;
  }
};

const getStatusIcon = (status: MonthStatus) => {
  switch (status) {
    case 'present':
      return 'check_circle';
    case 'late':
      return 'schedule';
    case 'absent':
      return 'cancel';
    case 'incomplete':
      return 'error';
    case 'no_class':
      return 'do_not_disturb_on';
    default:
      return 'radio_button_unchecked';
  }
};

export function MonthlyAttendanceTable({ months, gradeLevel }: MonthlyAttendanceTableProps) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState('');
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  useEffect(() => {
    if (months.length === 0) {
      setSelectedMonthIndex(0);
      setSelectedDayKey('');
      setIsDayModalOpen(false);
      return;
    }

    setSelectedMonthIndex((current) => {
      if (current < 0) return 0;
      if (current >= months.length) return 0;
      return current;
    });
  }, [months]);

  useEffect(() => {
    setIsDayModalOpen(false);
  }, [selectedMonthIndex]);

  useEffect(() => {
    if (!isDayModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDayModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDayModalOpen]);

  const selectedMonth = months[selectedMonthIndex] || months[0] || null;

  const selectedMonthCalendar = useMemo(() => {
    if (!selectedMonth) return [];

    const { start, daysInMonth } = getMonthMeta(selectedMonth.monthKey);
    const dayMap = new Map<number, LearnerAttendanceTap[]>();
    selectedMonth.days.forEach((day) => {
      if (day.taps.length > 0) {
        dayMap.set(day.day, day.taps);
      }
    });

    const cells: CalendarCell[] = [];
    const leadingDays = start.getDay();
    for (let index = 0; index < leadingDays; index += 1) {
      cells.push({
        key: `leading-${selectedMonth.monthKey}-${index}`,
        dayNumber: null,
        dateKey: '',
        taps: [],
        status: 'no_class',
        isWeekend: index === 0 || index === 6,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${selectedMonth.monthKey}-${String(day).padStart(2, '0')}`;
      const taps = dayMap.get(day) || [];
      const weekday = new Date(`${dateKey}T00:00:00`).getDay();
      const isWeekend = weekday === 0 || weekday === 6;
      cells.push({
        key: `${selectedMonth.monthKey}-${day}`,
        dayNumber: day,
        dateKey,
        taps,
        status: getCellStatus(taps, isWeekend, gradeLevel),
        isWeekend,
        isCurrentMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      const trailingIndex = cells.length - leadingDays - daysInMonth;
      cells.push({
        key: `trailing-${selectedMonth.monthKey}-${trailingIndex}`,
        dayNumber: null,
        dateKey: '',
        taps: [],
        status: 'no_class',
        isWeekend: false,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [selectedMonth, gradeLevel]);

  const selectedDay = useMemo(
    () => selectedMonthCalendar.find((cell) => cell.dateKey === selectedDayKey && cell.isCurrentMonth) || null,
    [selectedDayKey, selectedMonthCalendar],
  );

  const summary = useMemo(() => {
    if (!selectedMonth) {
      return {
        schoolDays: 0,
        present: 0,
        late: 0,
        incomplete: 0,
        absent: 0,
        noClass: 0,
      };
    }

    let schoolDays = 0;
    let present = 0;
    let late = 0;
    let incomplete = 0;
    let absent = 0;
    let noClass = 0;

    selectedMonthCalendar.forEach((cell) => {
      if (!cell.isCurrentMonth) return;
      if (cell.status === 'no_class') {
        noClass += 1;
        return;
      }

      schoolDays += 1;
      if (cell.status === 'late') {
        late += 1;
      } else if (cell.status === 'incomplete') {
        incomplete += 1;
      } else if (cell.status === 'present') {
        present += 1;
      } else if (cell.status === 'absent') {
        absent += 1;
      }
    });

    return { schoolDays, present, late, incomplete, absent, noClass };
  }, [selectedMonth, selectedMonthCalendar]);

  const canGoBack = selectedMonthIndex < months.length - 1;
  const canGoForward = selectedMonthIndex > 0;
  const statusRows = ['present', 'late', 'incomplete', 'absent', 'no_class'] as const;

  const handleExport = () => {
    if (!selectedMonth) return;

    const rows = selectedMonthCalendar
      .filter((cell) => cell.isCurrentMonth)
      .map((cell) => ({
        date: cell.dateKey,
        day: cell.dayNumber ? String(cell.dayNumber) : '-',
        status: getStatusLabel(cell.status),
        taps: cell.taps.length > 0 ? cell.taps.map((tap) => `${formatAttendanceTapType(tap.type)} ${tap.displayTime || '-'}`).join(' | ') : '-',
      }));

    const monthLabel = selectedMonth.monthKey.replace('-', '_');
    downloadTextFile(`attendance_${monthLabel}.csv`, buildCsv(rows), 'text/csv;charset=utf-8');
  };

  const handleSelectDay = (cell: CalendarCell) => {
    if (!cell.isCurrentMonth || !cell.dayNumber) return;
    setSelectedDayKey(cell.dateKey);
    setIsDayModalOpen(true);
  };

  const selectedDayStatus = selectedDay ? getStatusLabel(selectedDay.status) : '';
  const selectedDayHasRecords = Boolean(selectedDay && selectedDay.taps.length > 0);

  const renderTapChip = (tap: LearnerAttendanceTap, dayKey: string, tapIndex: number) => (
    <span
      key={`${dayKey}-${tap.type}-${tap.loggedAt}-${tapIndex}`}
      className={`learner-attendance-records__tap-chip learner-attendance-records__tap-chip--${tap.type.toLowerCase()} ${tap.isLate ? 'learner-attendance-records__tap-chip--late' : ''}`}
    >
      {formatAttendanceTapType(tap.type)}
      <span className="learner-attendance-records__tap-time">{tap.displayTime || '-'}</span>
    </span>
  );

  return (
    <section className="learner-attendance-records" aria-label="Attendance records calendar">
      <header className="learner-attendance-records__header">
        <div className="learner-attendance-records__title-block">
          <h3 className="learner-attendance-records__title">
            <span className="learner-attendance-records__title-primary">ATTENDANCE</span>
            <span className="learner-attendance-records__title-accent">RECORDS</span>
          </h3>
          <p className="learner-attendance-records__description">View your daily attendance for the selected month.</p>
        </div>

        <div className="learner-attendance-records__actions">
          <button
            type="button"
            className="learner-attendance-records__icon-button learner-attendance-records__icon-button--mobile"
            aria-label="Attendance tools"
            title="Attendance tools"
            onClick={() => setMobileToolsOpen((current) => !current)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              filter_alt
            </span>
          </button>

          <button
            type="button"
            className="learner-attendance-records__export-button"
            onClick={handleExport}
            disabled={!selectedMonth}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              download
            </span>
            Export
          </button>
        </div>
      </header>

      {mobileToolsOpen ? (
        <div className="learner-attendance-records__mobile-tools" aria-label="Attendance tools">
          <span className="learner-attendance-records__mobile-tools-label">Quick actions</span>
          <button type="button" className="learner-attendance-records__mobile-tools-button" onClick={handleExport} disabled={!selectedMonth}>
            Export selected month
          </button>
        </div>
      ) : null}

      <div className="learner-attendance-records__controls">
        <button
          type="button"
          className="learner-attendance-records__nav-button"
          onClick={() => setSelectedMonthIndex((current) => Math.min(months.length - 1, current + 1))}
          disabled={!canGoBack}
          aria-label="Previous month"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_left
          </span>
        </button>

        <div className="learner-attendance-records__month-pill" aria-live="polite">
          <span className="material-symbols-outlined learner-attendance-records__month-icon" aria-hidden="true">
            calendar_month
          </span>
          <span>{selectedMonth ? formatMonthTitle(selectedMonth.monthKey) : 'No records available'}</span>
        </div>

        <button
          type="button"
          className="learner-attendance-records__nav-button"
          onClick={() => setSelectedMonthIndex((current) => Math.max(0, current - 1))}
          disabled={!canGoForward}
          aria-label="Next month"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_right
          </span>
        </button>
      </div>

      {selectedMonth ? (
        <>
          <div className="learner-attendance-records__calendar-wrap">
            <div className="learner-attendance-records__calendar-head" role="row">
              {DAY_HEADERS.map((day) => (
                <div key={day} className={`learner-attendance-records__calendar-head-cell ${day === 'SUN' || day === 'SAT' ? 'learner-attendance-records__calendar-head-cell--weekend' : ''}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="learner-attendance-records__calendar-grid" role="grid" aria-label={`${selectedMonth.monthLabel} attendance calendar`}>
              {selectedMonthCalendar.map((cell) => {
                const hasRecords = cell.taps.length > 0;
                const isSelected = selectedDayKey === cell.dateKey && cell.isCurrentMonth;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={[
                      'learner-attendance-records__calendar-cell',
                      'learner-attendance-records__calendar-cell-button',
                      cell.isCurrentMonth ? 'learner-attendance-records__calendar-cell--active' : 'learner-attendance-records__calendar-cell--empty',
                      cell.status === 'present' ? 'learner-attendance-records__calendar-cell--present' : '',
                      cell.status === 'late' ? 'learner-attendance-records__calendar-cell--late' : '',
                      cell.status === 'incomplete' ? 'learner-attendance-records__calendar-cell--incomplete' : '',
                      cell.status === 'absent' ? 'learner-attendance-records__calendar-cell--absent' : '',
                      cell.status === 'no_class' ? 'learner-attendance-records__calendar-cell--no-class' : '',
                      isSelected ? 'learner-attendance-records__calendar-cell--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectDay(cell)}
                    aria-label={
                      cell.isCurrentMonth && cell.dayNumber
                        ? `${selectedMonth.monthLabel} ${cell.dayNumber}, ${getStatusLabel(cell.status)}`
                        : 'No class'
                    }
                  >
                    {cell.isCurrentMonth && cell.dayNumber ? (
                      <>
                        <span className={`learner-attendance-records__day-number ${cell.isWeekend ? 'learner-attendance-records__day-number--weekend' : ''}`}>
                          {cell.dayNumber}
                        </span>

                        {cell.status !== 'no_class' ? (
                          <div className={`learner-attendance-records__status learner-attendance-records__status--${cell.status}`}>
                            <span className="material-symbols-outlined learner-attendance-records__status-icon" aria-hidden="true">
                              {getStatusIcon(cell.status)}
                            </span>
                            <span className="learner-attendance-records__status-label">{getStatusLabel(cell.status)}</span>
                          </div>
                        ) : null}

                        {hasRecords ? (
                          <div className="learner-attendance-records__tap-list">
                            {cell.taps.slice(0, 2).map((tap, tapIndex) => renderTapChip(tap, cell.dateKey, tapIndex))}
                            {cell.taps.length > 2 ? <span className="learner-attendance-records__tap-more">+{cell.taps.length - 2} more</span> : null}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="learner-attendance-records__legend" aria-label="Attendance legend">
            <div className="learner-attendance-records__legend-title">Legend</div>
            <div className="learner-attendance-records__legend-items">
              {statusRows.map((status) => (
                <div key={status} className="learner-attendance-records__legend-item">
                  <span className={`learner-attendance-records__legend-swatch learner-attendance-records__legend-swatch--${status}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {getStatusIcon(status)}
                    </span>
                  </span>
                  <span className="learner-attendance-records__legend-label">{getStatusLabel(status)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="learner-attendance-records__summary-grid" aria-label="Attendance summary metrics">
            <article className="learner-attendance-records__summary-card learner-attendance-records__summary-card--school-days">
              <div className="learner-attendance-records__summary-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  calendar_month
                </span>
              </div>
              <div>
                <div className="learner-attendance-records__summary-label">School Days</div>
                <strong className="learner-attendance-records__summary-value">{summary.schoolDays}</strong>
              </div>
            </article>

            <article className="learner-attendance-records__summary-card learner-attendance-records__summary-card--present">
              <div className="learner-attendance-records__summary-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  check_circle
                </span>
              </div>
              <div>
                <div className="learner-attendance-records__summary-label">Present</div>
                <strong className="learner-attendance-records__summary-value">{summary.present}</strong>
                <div className="learner-attendance-records__summary-rate">
                  {summary.schoolDays > 0 ? `${Math.round((summary.present / summary.schoolDays) * 100)}%` : '0%'}
                </div>
              </div>
            </article>

            <article className="learner-attendance-records__summary-card learner-attendance-records__summary-card--late">
              <div className="learner-attendance-records__summary-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  schedule
                </span>
              </div>
              <div>
                <div className="learner-attendance-records__summary-label">Late</div>
                <strong className="learner-attendance-records__summary-value">{summary.late}</strong>
                <div className="learner-attendance-records__summary-rate">
                  {summary.schoolDays > 0 ? `${Math.round((summary.late / summary.schoolDays) * 100)}%` : '0%'}
                </div>
              </div>
            </article>

            <article className="learner-attendance-records__summary-card learner-attendance-records__summary-card--incomplete">
              <div className="learner-attendance-records__summary-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  error
                </span>
              </div>
              <div>
                <div className="learner-attendance-records__summary-label">Incomplete</div>
                <strong className="learner-attendance-records__summary-value">{summary.incomplete}</strong>
                <div className="learner-attendance-records__summary-rate">
                  {summary.schoolDays > 0 ? `${Math.round((summary.incomplete / summary.schoolDays) * 100)}%` : '0%'}
                </div>
              </div>
            </article>

            <article className="learner-attendance-records__summary-card learner-attendance-records__summary-card--absent">
              <div className="learner-attendance-records__summary-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  cancel
                </span>
              </div>
              <div>
                <div className="learner-attendance-records__summary-label">Absent</div>
                <strong className="learner-attendance-records__summary-value">{summary.absent}</strong>
                <div className="learner-attendance-records__summary-rate">
                  {summary.schoolDays > 0 ? `${Math.round((summary.absent / summary.schoolDays) * 100)}%` : '0%'}
                </div>
              </div>
            </article>
          </div>
        </>
      ) : (
        <p className="learner-attendance-records__empty">No consolidated attendance history yet.</p>
      )}

      {isDayModalOpen && selectedDay && selectedDay.dayNumber
        ? createPortal(
            <div className="modal-overlay modal-overlay--high" role="presentation">
              <div className="modal-backdrop" onClick={() => setIsDayModalOpen(false)} />
              <div className="modal-dialog modal-dialog--wide learner-attendance-day-modal" role="dialog" aria-modal="true" aria-label="Attendance day details">
                <div className="modal-dialog__header">
                  <div className="modal-dialog__title-group">
                    <p className="modal-dialog__eyebrow">Attendance Details</p>
                    <h3>
                      Day {selectedDay.dayNumber} - {formatMonthTitle(selectedMonth?.monthKey || '')}
                    </h3>
                  </div>
                  <button type="button" className="modal-dialog__close" onClick={() => setIsDayModalOpen(false)} aria-label="Close day details">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-dialog__body learner-attendance-day-modal__body">
                  <div className={`learner-attendance-day-modal__summary learner-attendance-day-modal__summary--${selectedDay.status}`}>
                    <span className="learner-attendance-day-modal__summary-label">Status</span>
                    <strong>{selectedDayStatus}</strong>
                  </div>

                  {selectedDayHasRecords ? (
                    <div className="learner-attendance-day-modal__list">
                      {selectedDay.taps.map((tap, tapIndex) => (
                        <article key={`${selectedDay.dateKey}-${tap.type}-${tap.loggedAt}-${tapIndex}`} className="learner-attendance-day-modal__item">
                          <span className="learner-attendance-day-modal__item-label">{formatAttendanceTapType(tap.type)}</span>
                          <strong className="learner-attendance-day-modal__item-time">{tap.displayTime || '-'}</strong>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="learner-attendance-day-modal__empty">
                      {selectedDay.status === 'no_class'
                        ? 'No class was scheduled on this day.'
                        : 'No attendance taps were recorded for this day.'}
                    </p>
                  )}
                </div>
                <div className="modal-dialog__actions">
                  <button type="button" className="modal-dialog__blue" onClick={() => setIsDayModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
