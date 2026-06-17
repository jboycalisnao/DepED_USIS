import { useEffect, useMemo, useState } from 'react';
import { AttendanceDailySummaryRow, AttendanceRecord, Learner } from '../../../types';
import { UsisGlobalFooter } from '../../../../common/footer/UsisGlobalFooter';
import { UsisUnifiedHeader } from '../../../../common/header/UsisUnifiedHeader';
import type { TeacherAttendanceAccessRecord } from '../../auth/utils/teacherAttendanceAccess';

type Props = {
  access: TeacherAttendanceAccessRecord;
  learners: Learner[];
  logs: AttendanceRecord[];
  onLogout: () => void;
  refreshAttendanceStatusByRange: (fromDate: string, toDate: string) => Promise<Set<string>>;
  queryDailySummariesByMonth: (summaryMonth: string) => Promise<AttendanceDailySummaryRow[]>;
};

const MANILA_TIME_ZONE = 'Asia/Manila';
const ATTENDANCE_SLOT_ORDER = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'] as const;
const SLOT_LABELS: Record<(typeof ATTENDANCE_SLOT_ORDER)[number], string> = {
  AM_IN: 'AM In',
  AM_OUT: 'AM Out',
  PM_IN: 'PM In',
  PM_OUT: 'PM Out',
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${monthKey}-01T00:00:00`));

const formatDayHeader = (dayKey: string) => {
  const date = new Date(`${dayKey}T00:00:00`);
  return {
    day: new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(date),
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).slice(0, 1),
  };
};

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatAttendanceDate = (timestamp: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));

const formatAttendanceMonth = (timestamp: string) => formatAttendanceDate(timestamp).slice(0, 7);

const makeSummaryRecordId = (learnerId: string, attendanceDate: string, slot: string) =>
  `summary-${learnerId}-${attendanceDate}-${slot}`;

const getMonthDateRange = (monthKey: string) => {
  const monthStart = `${monthKey}-01`;
  const monthEnd = new Date(`${monthStart}T00:00:00`);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  const yyyy = monthEnd.getFullYear();
  const mm = String(monthEnd.getMonth() + 1).padStart(2, '0');
  const dd = String(monthEnd.getDate()).padStart(2, '0');

  return {
    fromDate: monthStart,
    toDate: `${yyyy}-${mm}-${dd}`,
  };
};

const getDaysInMonth = (monthKey: string) => {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return [];
  const monthStart = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(monthStart.getTime())) return [];
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);

  const days: string[] = [];
  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    days.push(`${yyyy}-${mm}-${dd}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

export default function TeacherSectionAttendancePage({
  access,
  learners,
  logs,
  onLogout,
  refreshAttendanceStatusByRange,
  queryDailySummariesByMonth,
}: Props) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [expandedLearners, setExpandedLearners] = useState<Set<string>>(new Set());
  const [cloudLogs, setCloudLogs] = useState<AttendanceRecord[]>([]);

  const sectionLearners = useMemo(
    () =>
      learners
        .filter((learner) => String(learner.section_id || '').trim() === access.sectionId)
        .slice()
        .sort((left, right) => {
          const leftName = `${left.last_name || ''} ${left.first_name || ''}`.trim();
          const rightName = `${right.last_name || ''} ${right.first_name || ''}`.trim();
          return leftName.localeCompare(rightName);
        }),
    [access.sectionId, learners],
  );

  const filteredSectionLearners = useMemo(() => {
    const raw = searchValue.trim().toLowerCase();
    if (!raw) return sectionLearners;

    const tokens = raw.split(/\s+/).filter(Boolean);
    return sectionLearners.filter((learner) => {
      const fullName = `${learner.last_name || ''} ${learner.first_name || ''} ${learner.middle_name || ''}`.toLowerCase();
      const lrn = String(learner.lrn || '').toLowerCase();
      const sectionName = String(learner.section_name || '').toLowerCase();
      const grade = String(learner.grade_level || '').toLowerCase();
      return tokens.every((token) => `${fullName} ${lrn} ${sectionName} ${grade}`.includes(token));
    });
  }, [searchValue, sectionLearners]);

  const sectionLearnerIds = useMemo(() => new Set(sectionLearners.map((learner) => String(learner.id))), [sectionLearners]);

  const sectionLogs = useMemo(
    () =>
      logs.filter((record) => {
        if (!sectionLearnerIds.has(String(record.learnerId))) return false;
        return formatAttendanceMonth(record.timestamp) === selectedMonth;
      }),
    [logs, sectionLearnerIds, selectedMonth],
  );

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    [...logs, ...cloudLogs].forEach((record) => {
      if (!sectionLearnerIds.has(String(record.learnerId))) return;
      months.add(formatAttendanceMonth(record.timestamp));
    });
    return Array.from(months).sort((left, right) => right.localeCompare(left));
  }, [cloudLogs, logs, sectionLearnerIds]);

  useEffect(() => {
    if (availableMonths.length === 0) return;
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    const { fromDate, toDate } = getMonthDateRange(selectedMonth);
    if (!fromDate || !toDate) return;
    void (async () => {
      try {
        await refreshAttendanceStatusByRange(fromDate, toDate);
      } catch (error) {
        console.error('Failed to refresh teacher attendance month view:', error);
      }
    })();
  }, [refreshAttendanceStatusByRange, selectedMonth]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const rows = await queryDailySummariesByMonth(selectedMonth);
        if (cancelled) return;

        const nextCloudLogs = rows
          .filter((row) => sectionLearnerIds.has(String(row.learnerId)))
          .flatMap<AttendanceRecord>((row) => {
            const attendanceDate = String(row.attendanceDate || '');
            const slots: Array<[string, string | null]> = [
              ['AM_IN', row.amIn],
              ['AM_OUT', row.amOut],
              ['PM_IN', row.pmIn],
              ['PM_OUT', row.pmOut],
            ];

            return slots
              .filter(([, timestamp]) => !!timestamp)
              .map(([slot, timestamp]) => ({
                id: makeSummaryRecordId(String(row.learnerId), attendanceDate, slot),
                learnerId: String(row.learnerId),
                type: slot as AttendanceRecord['type'],
                timestamp: String(timestamp),
                synced: true,
              }));
          });

        setCloudLogs(nextCloudLogs);
      } catch (error) {
        console.error('Failed to load teacher attendance summaries:', error);
        setCloudLogs([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryDailySummariesByMonth, sectionLearnerIds, selectedMonth]);

  const monthDays = useMemo(() => getDaysInMonth(selectedMonth), [selectedMonth]);

  const mergedLogs = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    [...logs, ...cloudLogs].forEach((record) => {
      const key = `${record.learnerId}|${record.timestamp}|${record.type}`;
      if (!map.has(key)) {
        map.set(key, record);
      }
    });
    return Array.from(map.values());
  }, [cloudLogs, logs]);

  const recordsByLearnerDay = useMemo(() => {
    const map = new Map<string, Record<string, AttendanceRecord>>();
    sectionLogs.forEach((record) => {
      const key = `${record.learnerId}|${formatAttendanceDate(record.timestamp)}`;
      const daySlots = map.get(key) || {};
      const slot = record.type as keyof typeof daySlots;
      if (!daySlots[slot]) {
        daySlots[slot] = record;
      }
      map.set(key, daySlots);
    });

    return map;
  }, [sectionLogs]);

  const syncedCount = sectionLogs.filter((record) => record.synced).length;
  const pendingCount = sectionLogs.length - syncedCount;
  const presentDays = new Set(sectionLogs.map((record) => `${record.learnerId}|${formatAttendanceDate(record.timestamp)}`)).size;

  const toggleLearner = (learnerId: string) => {
    setExpandedLearners((prev) => {
      const next = new Set(prev);
      if (next.has(learnerId)) next.delete(learnerId);
      else next.add(learnerId);
      return next;
    });
  };

  return (
    <>
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader
            searchId="teacher-section-attendance-search"
            searchLabel="Search learners"
            searchPlaceholder="Search learner, LRN, grade, or section"
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSearchSubmit={(event) => event.preventDefault()}
          />
          <nav className="kit-nav" aria-label="Teacher attendance sections">
            <div className="kit-nav__grid">
              <span className="kit-nav__link kit-nav__link--active">My Section</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="page-frame attendance-login-page">
        <div className="content-width">
          <section className="section-shell attendance-login">
            <div className="section-card attendance-section-month-view">
              <div className="section-card__bar" />
              <div className="section-card__content">
                <div className="attendance-section-month-view__header">
                  <div className="attendance-section-month-view__title-block">
                    <p className="attendance-section-month-view__eyebrow">Teacher Access</p>
                    <h1>{access.sectionName}</h1>
                    <p>Grade {access.sectionGradeLevel} attendance is grouped by learner and day for the selected month.</p>
                    <div className="attendance-section-month-view__meta">
                      <span className="attendance-section-month-view__meta-pill">{filteredSectionLearners.length} learners</span>
                      <span className="attendance-section-month-view__meta-pill">{sectionLogs.length} taps</span>
                      <span className="attendance-section-month-view__meta-pill">{presentDays} active learner days</span>
                    </div>
                  </div>

                  <div className="attendance-section-month-view__controls">
                    <label className="attendance-section-month-view__month-field floating-field__control" data-has-value={selectedMonth ? 'true' : 'false'}>
                      <select
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                        className="attendance-section-month-view__month-select"
                        aria-label="Select attendance month"
                      >
                        {availableMonths.length > 0 ? (
                          availableMonths.map((monthKey) => (
                            <option key={monthKey} value={monthKey}>
                              {formatMonthLabel(monthKey)}
                            </option>
                          ))
                        ) : (
                          <option value={selectedMonth}>{formatMonthLabel(selectedMonth)}</option>
                        )}
                      </select>
                      <span className="attendance-section-month-view__month-label">Attendance month</span>
                      <span className="material-symbols-outlined attendance-section-month-view__select-icon">expand_more</span>
                    </label>

                    <button type="button" className="secondary-button" onClick={onLogout}>
                      Sign Out
                    </button>
                  </div>
                </div>

                <div className="attendance-section-month-view__status-row">
                  <p>Showing {formatMonthLabel(selectedMonth)} records for {access.displayName}.</p>
                  <div className="attendance-section-month-view__status-pills">
                    <span className="attendance-section-month-view__status-pill attendance-section-month-view__status-pill--success">
                      Synced {syncedCount}
                    </span>
                    <span className="attendance-section-month-view__status-pill attendance-section-month-view__status-pill--warning">
                      Pending {pendingCount}
                    </span>
                  </div>
                </div>

                <div className="attendance-section-month-view__learner-search">
                  <label
                    className="attendance-section-month-view__learner-search-field floating-field__control"
                    data-has-value={searchValue.trim().length > 0 ? 'true' : 'false'}
                  >
                    <input
                      type="search"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder=" "
                      className="attendance-section-month-view__learner-search-input"
                      aria-label="Search learners in this section"
                    />
                    <span className="attendance-section-month-view__month-label">Search learners</span>
                    <span className="material-symbols-outlined attendance-section-month-view__select-icon">search</span>
                  </label>
                  <p className="attendance-section-month-view__learner-search-copy">Search by learner name, LRN, grade level, or section.</p>
                </div>

                <div className="attendance-section-month-view__learner-list">
                  {filteredSectionLearners.length === 0 ? (
                    <div className="attendance-section-month-view__empty">
                      <span className="material-symbols-outlined">folder_open</span>
                      <p>No learners match this search.</p>
                    </div>
                  ) : (
                    filteredSectionLearners.map((learner) => {
                      const learnerOpen = expandedLearners.has(learner.id);
                      const fullName = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();

                      return (
                        <article key={learner.id} className="attendance-section-month-view__learner-card">
                          <button
                            type="button"
                            className="attendance-section-month-view__learner-summary"
                            onClick={() => toggleLearner(learner.id)}
                            aria-expanded={learnerOpen}
                          >
                            <div className="attendance-section-month-view__learner-summary-main">
                              <strong>{fullName || 'Unnamed learner'}</strong>
                              <span>{learner.section_name || access.sectionName}</span>
                            </div>
                            <div className="attendance-section-month-view__learner-summary-meta">
                              <span className="attendance-section-month-view__meta-pill">{learner.lrn || '-'}</span>
                              <span className="attendance-section-month-view__meta-pill">{learnerOpen ? 'Expanded' : 'Collapsed'}</span>
                              <span className="material-symbols-outlined attendance-section-month-view__expand-icon">
                                {learnerOpen ? 'expand_less' : 'expand_more'}
                              </span>
                            </div>
                          </button>

                          {learnerOpen ? (
                            <div className="attendance-section-month-view__learner-panel">
                              <div className="attendance-section-month-view__day-strip">
                                {monthDays.map((dayKey) => {
                                  const label = formatDayHeader(dayKey);
                                  const cellRecords = recordsByLearnerDay.get(`${learner.id}|${dayKey}`) || {};

                                  return (
                                    <div key={`${learner.id}-${dayKey}`} className="attendance-section-month-view__day-card">
                                      <div className="attendance-section-month-view__day-card-head">
                                        <span>{label.weekday}</span>
                                        <strong>{label.day}</strong>
                                      </div>
                                      <div className="attendance-section-month-view__slot-list">
                                        {ATTENDANCE_SLOT_ORDER.map((slot) => {
                                          const record = cellRecords[slot];
                                          return (
                                            <div
                                              key={`${learner.id}-${dayKey}-${slot}`}
                                              className={`attendance-section-month-view__slot-row ${
                                                record
                                                  ? `attendance-section-month-view__slot-row--${slot.toLowerCase()}`
                                                  : 'is-empty'
                                              }`}
                                              title={record ? `${record.type.replace('_', ' ')} at ${formatTime(record.timestamp)}` : 'No attendance logged'}
                                            >
                                              {record ? (
                                                <>
                                                  <div className="attendance-section-month-view__slot-row-main">
                                                    <strong>{SLOT_LABELS[slot]}</strong>
                                                    <span>{formatTime(record.timestamp)}</span>
                                                  </div>
                                                  <span className={`attendance-section-month-view__slot-status attendance-section-month-view__slot-status--${record.synced ? 'synced' : 'pending'}`}>
                                                    {record.synced ? 'Synced' : 'Pending'}
                                                  </span>
                                                </>
                                              ) : (
                                                <>
                                                  <div className="attendance-section-month-view__slot-row-main">
                                                    <strong>{SLOT_LABELS[slot]}</strong>
                                                    <span>No record</span>
                                                  </div>
                                                  <span className="attendance-section-month-view__slot-status attendance-section-month-view__slot-status--empty">
                                                    Empty
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <UsisGlobalFooter />
    </>
  );
}
