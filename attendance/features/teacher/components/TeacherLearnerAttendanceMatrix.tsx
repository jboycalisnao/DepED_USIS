import { useEffect, useMemo, useState } from 'react';
import { AttendanceClassDayConfig, AttendanceRecord, AttendanceScheduleConfig, Learner } from '../../../types';
import {
  isAttendanceClassDay,
  isAttendanceRecordLate,
  isAttendanceNoClassDate,
  normalizeGradeBand,
} from '../../../utils/attendanceSchedule';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import { UsisDateTimePicker } from '../../../../common/components/ui/UsisDateTimePicker';
import {
  buildDailyAttendanceReportHtml,
  buildDailyAttendanceRows,
} from './reporting/teacherAttendanceReports';
import { buildSf2MonthlyAttendanceWorkbook } from './reporting/sf2MonthlyReport';
import type { TeacherAttendanceAccessRecord } from '../../auth/utils/teacherAttendanceAccess';

type Props = {
  access: TeacherAttendanceAccessRecord;
  schoolYearLabel: string;
  learners: Learner[];
  scheduleConfig: AttendanceScheduleConfig;
  classDayConfig: AttendanceClassDayConfig;
  noClassDates: string[];
  queryAttendanceRecordsByRange: (fromDate: string, toDate: string, learnerIds?: string[]) => Promise<AttendanceRecord[]>;
  onLogout: () => void;
};

const SLOT_TYPES = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'] as const;
const MANILA_TIME_ZONE = 'Asia/Manila';

type LearnerMatrixDay = {
  day: number;
  dateKey: string;
  taps: AttendanceRecord[];
  isClassDay: boolean;
};

type LearnerMatrixMonth = {
  monthKey: string;
  monthLabel: string;
  days: LearnerMatrixDay[];
};

type LearnerMonthStats = {
  presentDays: number;
  lateDays: number;
  absentDays: number;
};

type LearnerAttendanceAlertState = {
  hasAlert: boolean;
  consecutiveCount: number;
  label: string;
  detail: string;
  tone: 'danger' | 'warning';
};

type LearnerAttendanceAlertBundle = {
  absent: LearnerAttendanceAlertState;
  late: LearnerAttendanceAlertState;
};

type LearnerReportRow = {
  learner: Learner;
  name: string;
  monthRecords: AttendanceRecord[];
  stats: LearnerMonthStats;
  alerts: LearnerAttendanceAlertBundle;
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentYearStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
};

const getMonthEnd = (monthKey: string) => {
  const monthEnd = new Date(`${monthKey}-01T00:00:00`);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  return `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${monthKey}-01T00:00:00`));

const formatAttendanceDate = (timestamp: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));

const formatAttendanceMonth = (timestamp: string) => formatAttendanceDate(timestamp).slice(0, 7);

const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getManilaDateKey = (value = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

const monthLabelFromKey = (monthKey: string) => {
  const parsed = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return monthKey;
  return formatMonthLabel(monthKey);
};

const todayIso = () => {
  return getManilaDateKey();
};

const isFutureDateKey = (dateKey: string, referenceDateKey: string) => dateKey > referenceDateKey;

const toManilaDate = (dateKey: string) => new Date(`${dateKey}T00:00:00+08:00`);

const diffInDays = (leftDateKey: string, rightDateKey: string) =>
  Math.abs(Math.round((toManilaDate(rightDateKey).getTime() - toManilaDate(leftDateKey).getTime()) / 86400000));

const getLearnerMonthDayStatus = (
  dayRecords: AttendanceRecord[],
  learner: Learner,
  scheduleConfig: AttendanceScheduleConfig,
) => {
  if (dayRecords.length === 0) return 'absent' as const;

  const gradeBand = normalizeGradeBand(String(learner.grade_level || ''));
  const requiredSlotTypes =
    gradeBand === 'grade11' ? (['AM_IN', 'AM_OUT'] as const) : gradeBand === 'grade12' ? (['PM_IN', 'PM_OUT'] as const) : SLOT_TYPES;
  const hasLate = dayRecords.some((record) => isAttendanceRecordLate(record, learner, scheduleConfig));
  const hasCompleteInOut = requiredSlotTypes.every((slotType) => dayRecords.some((record) => record.type === slotType));

  if (hasLate) return 'late' as const;
  if (!hasCompleteInOut) return 'incomplete' as const;
  return 'present' as const;
};

const calculateAttendanceAlert = (
  monthDays: LearnerMatrixDay[],
  learnerMonthRecords: AttendanceRecord[],
  learner: Learner,
  scheduleConfig: AttendanceScheduleConfig,
  targetStatus: 'absent' | 'late',
  label: string,
  tone: 'danger' | 'warning',
): LearnerAttendanceAlertState => {
  const byDay = new Map<string, AttendanceRecord[]>();
  learnerMonthRecords.forEach((record) => {
    const dayKey = formatAttendanceDate(record.timestamp);
    const list = byDay.get(dayKey) || [];
    list.push(record);
    byDay.set(dayKey, list);
  });

  const currentDateKey = todayIso();
  const orderedDays = monthDays
    .filter((day) => day.isClassDay && !isFutureDateKey(day.dateKey, currentDateKey))
    .slice()
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));

  let consecutiveCount = 0;
  let lastAttendanceEvidence: string | null = null;

  for (const day of orderedDays) {
    const dayRecords = byDay.get(day.dateKey) || [];
    const hasRecords = dayRecords.length > 0;
    const status = getLearnerMonthDayStatus(dayRecords, learner, scheduleConfig);
    const isAlertDay = status === targetStatus;

    if (hasRecords) {
      lastAttendanceEvidence = day.dateKey;
    }

    if (!isAlertDay) {
      if (status === 'present') {
        consecutiveCount = 0;
      }
      continue;
    }

    if (!lastAttendanceEvidence) {
      consecutiveCount = 0;
      continue;
    }

    if (diffInDays(lastAttendanceEvidence, day.dateKey) > 7) {
      consecutiveCount = 0;
      continue;
    }

    consecutiveCount += 1;
    if (consecutiveCount >= 3) {
      return {
        hasAlert: true,
        consecutiveCount,
        label,
        detail: `${consecutiveCount} consecutive ${targetStatus} days`,
        tone,
      };
    }
  }

  return {
    hasAlert: false,
    consecutiveCount: 0,
    label: '',
    detail: '',
    tone,
  };
};

const calculateAttendanceAlerts = (
  monthDays: LearnerMatrixDay[],
  learnerMonthRecords: AttendanceRecord[],
  learner: Learner,
  scheduleConfig: AttendanceScheduleConfig,
): LearnerAttendanceAlertBundle => ({
  absent: calculateAttendanceAlert(monthDays, learnerMonthRecords, learner, scheduleConfig, 'absent', 'Absent Alert', 'danger'),
  late: calculateAttendanceAlert(monthDays, learnerMonthRecords, learner, scheduleConfig, 'late', 'Tardy Alert', 'warning'),
});

const buildMonthMatrix = (
  monthKey: string,
  records: AttendanceRecord[],
  classDayConfig: AttendanceClassDayConfig,
  noClassDates: string[],
): LearnerMatrixMonth => {
  const daysByKey = new Map<string, AttendanceRecord[]>();
  records
    .filter((record) => formatAttendanceMonth(record.timestamp) === monthKey)
    .forEach((record) => {
      const dayKey = formatAttendanceDate(record.timestamp);
      const list = daysByKey.get(dayKey) || [];
      list.push(record);
      daysByKey.set(dayKey, list);
    });

  const monthStart = new Date(`${monthKey}-01T00:00:00`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);

  const days: LearnerMatrixDay[] = [];
  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const isClassDay = isAttendanceClassDay(dateKey, classDayConfig) && !isAttendanceNoClassDate(dateKey, noClassDates);
    days.push({
      day: cursor.getDate(),
      dateKey,
      isClassDay,
      taps: (daysByKey.get(dateKey) || []).slice().sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    monthKey,
    monthLabel: monthLabelFromKey(monthKey),
    days,
  };
};

const buildAvailableMonths = (records: AttendanceRecord[]) =>
  Array.from(new Set(records.map((record) => formatAttendanceMonth(record.timestamp)).filter(Boolean))).sort((left, right) => right.localeCompare(left));

const buildMonthOptions = (months: string[]) =>
  months.map((monthKey) => ({
    value: monthKey,
    label: formatMonthLabel(monthKey),
  }));

const normalizeGenderLabel = (gender: string | null | undefined) => {
  const normalized = String(gender || '').trim().toLowerCase();
  if (!normalized) return 'Other / Unspecified';
  if (normalized === 'm' || normalized === 'male' || normalized.startsWith('male')) return 'Male';
  if (normalized === 'f' || normalized === 'female' || normalized.startsWith('female')) return 'Female';
  return 'Other / Unspecified';
};

const buildLearnerMonthStats = (
  learnerMonthRecords: AttendanceRecord[],
  learner: Learner,
  scheduleConfig: AttendanceScheduleConfig,
  monthDays: LearnerMatrixDay[],
): LearnerMonthStats => {
  const gradeBand = normalizeGradeBand(String(learner.grade_level || ''));
  const requiredSlotTypes =
    gradeBand === 'grade11' ? (['AM_IN', 'AM_OUT'] as const) : gradeBand === 'grade12' ? (['PM_IN', 'PM_OUT'] as const) : SLOT_TYPES;
  const byDay = new Map<string, AttendanceRecord[]>();
  learnerMonthRecords.forEach((record) => {
    const dayKey = formatAttendanceDate(record.timestamp);
    const list = byDay.get(dayKey) || [];
    list.push(record);
    byDay.set(dayKey, list);
  });

  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  const currentDateKey = todayIso();

  monthDays.forEach((day) => {
    if (!day.isClassDay || isFutureDateKey(day.dateKey, currentDateKey)) {
      return;
    }

    const dayRecords = byDay.get(day.dateKey) || [];
    const hasAnyRecords = dayRecords.length > 0;
    const hasCompleteInOut = requiredSlotTypes.every((slotType) => dayRecords.some((record) => record.type === slotType));
    const hasLate = dayRecords.some((record) => isAttendanceRecordLate(record, learner, scheduleConfig));

    if (hasCompleteInOut) presentDays += 1;
    if (hasLate) lateDays += 1;
    if (!hasAnyRecords) absentDays += 1;
  });

  return { presentDays, lateDays, absentDays };
};

const groupLearnersByGender = (learners: Learner[]) => {
  const groups = new Map<string, Learner[]>();
  learners.forEach((learner) => {
    const key = normalizeGenderLabel(learner.gender);
    const list = groups.get(key) || [];
    list.push(learner);
    groups.set(key, list);
  });

  return [
    { key: 'Male', label: 'Male', learners: groups.get('Male') || [] },
    { key: 'Female', label: 'Female', learners: groups.get('Female') || [] },
    {
      key: 'Other / Unspecified',
      label: 'Other / Unspecified',
      learners: groups.get('Other / Unspecified') || [],
    },
  ].filter((group) => group.learners.length > 0);
};

export default function TeacherLearnerAttendanceMatrix({
  access,
  schoolYearLabel,
  learners,
  scheduleConfig,
  classDayConfig,
  noClassDates,
  queryAttendanceRecordsByRange,
  onLogout,
}: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [selectedDailyDate, setSelectedDailyDate] = useState(() => todayIso());
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintingDailyReport, setIsPrintingDailyReport] = useState(false);
  const [isDownloadingSf2, setIsDownloadingSf2] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const sectionLearners = useMemo(
    () =>
      learners
        .slice()
        .sort((left, right) => {
          const leftName = `${left.last_name || ''} ${left.first_name || ''}`.trim();
          const rightName = `${right.last_name || ''} ${right.first_name || ''}`.trim();
          return leftName.localeCompare(rightName);
        }),
    [learners],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fromDate = getCurrentYearStart();
        const toDate = getMonthEnd(getCurrentMonthKey());
        const nextRecords = await queryAttendanceRecordsByRange(
          fromDate,
          toDate,
          sectionLearners.map((learner) => String(learner.id)),
        );
        if (!cancelled) {
          setRecords(nextRecords);
          const months = buildAvailableMonths(nextRecords);
          if (months.length > 0) {
            setSelectedMonth((current) => (months.includes(current) ? current : months[0]));
          }
        }
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || 'Unable to load attendance records.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [queryAttendanceRecordsByRange, sectionLearners]);

  const availableMonths = useMemo(() => buildAvailableMonths(records), [records]);
  const monthOptions = useMemo(
    () => (availableMonths.length > 0 ? buildMonthOptions(availableMonths) : [{ value: selectedMonth, label: formatMonthLabel(selectedMonth) }]),
    [availableMonths, selectedMonth],
  );
  const selectedMonthMatrix = useMemo(
    () => buildMonthMatrix(selectedMonth, records, classDayConfig, noClassDates),
    [classDayConfig, noClassDates, records, selectedMonth],
  );
  const learnerIds = useMemo(() => new Set(sectionLearners.map((learner) => String(learner.id))), [sectionLearners]);
  const filteredLearners = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return sectionLearners;

    return sectionLearners.filter((learner) => {
      const fullName = `${learner.last_name || ''} ${learner.first_name || ''} ${learner.middle_name || ''}`.toLowerCase();
      const lrn = String(learner.lrn || '').toLowerCase();
      const section = String(learner.section_name || '').toLowerCase();
      const grade = String(learner.grade_level || '').toLowerCase();
      return fullName.includes(query) || lrn.includes(query) || section.includes(query) || grade.includes(query);
    });
  }, [sectionLearners, searchValue]);

  const learnerCards = useMemo(() => {
    const grouped = new Map<string, AttendanceRecord[]>();
    records.forEach((record) => {
      if (!learnerIds.has(String(record.learnerId))) return;
      const list = grouped.get(record.learnerId) || [];
      list.push(record);
      grouped.set(record.learnerId, list);
    });
    return grouped;
  }, [learnerIds, records]);

  const genderGroups = useMemo(() => groupLearnersByGender(filteredLearners), [filteredLearners]);

  const reportRows = useMemo<LearnerReportRow[]>(
    () =>
      sectionLearners.map((learner) => {
        const learnerRecords = learnerCards.get(String(learner.id)) || [];
        const learnerMonthRecords = learnerRecords.filter((record) => formatAttendanceMonth(record.timestamp) === selectedMonth);
        const name = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();
        const stats = buildLearnerMonthStats(learnerMonthRecords, learner, scheduleConfig, selectedMonthMatrix.days);
        return {
          learner,
          name,
          monthRecords: learnerMonthRecords,
          stats,
          alerts: calculateAttendanceAlerts(selectedMonthMatrix.days, learnerMonthRecords, learner, scheduleConfig),
        };
      }),
    [learnerCards, scheduleConfig, sectionLearners, selectedMonth, selectedMonthMatrix.days],
  );

  const triggerPrint = (html: string, title: string) => {
    const iframe = document.createElement('iframe');
    iframe.title = title;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.srcdoc = html;

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    iframe.onload = () => {
      const printTarget = iframe.contentWindow;
      if (!printTarget) {
        cleanup();
        return;
      }

      printTarget.focus();
      window.setTimeout(() => {
        printTarget.print();
        cleanup();
      }, 150);
    };

    document.body.appendChild(iframe);
  };

  const handleCreateMonthlyReport = async () => {
    setIsDownloadingSf2(true);
    setReportError(null);
    try {
      const output = await buildSf2MonthlyAttendanceWorkbook({
        schoolId: access.schoolId || '',
        schoolName: access.schoolName || '',
        schoolYearLabel: schoolYearLabel || '',
        sectionName: access.sectionName || sectionLearners[0]?.section_name || 'Section',
        sectionGradeLevel: access.sectionGradeLevel || sectionLearners[0]?.grade_level || '',
        monthKey: selectedMonth,
        monthLabel: selectedMonthMatrix.monthLabel,
        days: selectedMonthMatrix.days,
        rows: reportRows,
        scheduleConfig,
      });

      const blob = new Blob([output.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = output.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError: any) {
      setReportError(downloadError?.message || 'Unable to generate the SF2 workbook.');
    } finally {
      setIsDownloadingSf2(false);
    }
  };

  const handleCreateDailyReport = async () => {
    if (!selectedDailyDate) return;
    setIsPrintingDailyReport(true);
    try {
      const isNoClassDay = noClassDates.includes(selectedDailyDate);
      const dailyRecords = await queryAttendanceRecordsByRange(
        selectedDailyDate,
        selectedDailyDate,
        sectionLearners.map((learner) => String(learner.id)),
      );
      const dailyRows = buildDailyAttendanceRows(sectionLearners, dailyRecords, selectedDailyDate, scheduleConfig, noClassDates);
      const html = buildDailyAttendanceReportHtml(
        sectionLearners[0]?.section_name || access.sectionName,
        selectedDailyDate,
        dailyRows,
        scheduleConfig,
        { noClassDay: isNoClassDay },
      );
      triggerPrint(html, `${selectedDailyDate} attendance report`);
    } finally {
      setIsPrintingDailyReport(false);
    }
  };

  const renderTapChip = (tap: AttendanceRecord, dayKey: string, tapIndex: number) => {
    const learner = sectionLearners.find((row) => String(row.id) === String(tap.learnerId));
    const isLate = isAttendanceRecordLate(tap, learner, scheduleConfig);

    return (
      <div
        key={`${dayKey}-${tap.type}-${tap.timestamp}-${tapIndex}`}
        className={`attendance-teacher-matrix__tap-item ${isLate ? 'attendance-teacher-matrix__tap-item--late' : ''} attendance-teacher-matrix__tap-item--${tap.type.toLowerCase()}`}
      >
        <span className="attendance-teacher-matrix__tap-meta">
          <span className="attendance-teacher-matrix__tap-type">{tap.type.replace('_', ' ')}</span>
          {isLate ? <span className="attendance-teacher-matrix__tap-badge">Late</span> : null}
        </span>
        <span className="attendance-teacher-matrix__tap-time">{formatTime(tap.timestamp) || '-'}</span>
      </div>
    );
  };

  return (
    <section className="section-card attendance-teacher-matrix attendance-teacher-matrix--full rounded-md">
      <div className="section-card__bar" />
      <div className="section-card__content">
        <div className="attendance-teacher-matrix__header">
          <div className="attendance-teacher-matrix__title-block">
            <div className="attendance-teacher-matrix__title-copy">
              <p className="attendance-teacher-matrix__eyebrow">Teacher Access</p>
              <h1>{access.sectionName} attendance matrix</h1>
              <p>Learners are listed individually. Expanding a learner shows the monthly attendance matrix.</p>
            </div>
            <div className="attendance-teacher-matrix__title-actions">
              <button
                type="button"
                className="secondary-button rounded-md attendance-teacher-matrix__report-btn"
                onClick={() => void handleCreateMonthlyReport()}
                disabled={isDownloadingSf2}
              >
                {isDownloadingSf2 ? 'Preparing SF2...' : 'Download SF2'}
              </button>
              <UsisDateTimePicker
                ariaLabel="Report Date"
                className="attendance-teacher-matrix__date-control"
                label="Report Date"
                mode="date"
                onChange={setSelectedDailyDate}
                showLabel={false}
                value={selectedDailyDate}
              />
              <button
                type="button"
                className="secondary-button rounded-md attendance-teacher-matrix__report-btn"
                onClick={() => void handleCreateDailyReport()}
                disabled={isPrintingDailyReport || !selectedDailyDate}
              >
                {isPrintingDailyReport ? 'Preparing Daily Report...' : 'Print Daily Report'}
              </button>
              <button type="button" className="secondary-button rounded-md attendance-teacher-matrix__logout" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          </div>
          <div className="attendance-teacher-matrix__controls">
            <label
              className="floating-field attendance-teacher-matrix__search-field"
              data-has-value={searchValue.trim().length > 0 ? 'true' : 'false'}
            >
              <div className="floating-field__control attendance-teacher-matrix__search-control">
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder=" "
                  className="attendance-teacher-matrix__search-input rounded-md"
                  aria-label="Search learners"
                />
                <span>Search learners by name, LRN, section, or grade</span>
              </div>
            </label>
            <UsisSearchableSelect
              ariaLabel="Attendance month"
              className="attendance-teacher-matrix__month-select-wrap"
              floatingLabel
              label="Attendance month"
              allowTyping={false}
              forcePortalMenu
              options={monthOptions}
              onChange={setSelectedMonth}
              value={selectedMonth}
            />
          </div>
        </div>

        <div className="attendance-teacher-matrix__status-row">
          <p>
            Showing <strong>{selectedMonthMatrix.monthLabel}</strong> for {filteredLearners.length} of {sectionLearners.length} learners.
          </p>
        </div>

        {isLoading ? <p className="attendance-teacher-matrix__state">Loading attendance records.</p> : null}
        {error ? <p className="attendance-teacher-matrix__state attendance-teacher-matrix__state--error">{error}</p> : null}
        {reportError ? <p className="attendance-teacher-matrix__state attendance-teacher-matrix__state--error">{reportError}</p> : null}

        <div className="attendance-teacher-matrix__learner-list">
          {sectionLearners.length === 0 ? (
            <div className="attendance-teacher-matrix__empty rounded-md">
              <span className="material-symbols-outlined">folder_open</span>
              <p>No learners are assigned to this teacher section.</p>
            </div>
          ) : filteredLearners.length === 0 ? (
            <div className="attendance-teacher-matrix__empty rounded-md">
              <span className="material-symbols-outlined">search_off</span>
              <p>No learners match your search.</p>
            </div>
          ) : (
            genderGroups.map((group) => (
              <section key={group.key} className="attendance-teacher-matrix__gender-group">
                <div className="attendance-teacher-matrix__gender-group-header">
                  <h2>{group.label}</h2>
                  <span className="attendance-teacher-matrix__gender-group-count">{group.learners.length} learners</span>
                </div>

                <div className="attendance-teacher-matrix__gender-group-list">
                  {group.learners.map((learner) => {
                    const learnerRecords = learnerCards.get(String(learner.id)) || [];
                    const learnerMonthRecords = learnerRecords.filter((record) => formatAttendanceMonth(record.timestamp) === selectedMonth);
                    const fullName = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();
                    const stats = buildLearnerMonthStats(learnerMonthRecords, learner, scheduleConfig, selectedMonthMatrix.days);
                    const alerts = calculateAttendanceAlerts(selectedMonthMatrix.days, learnerMonthRecords, learner, scheduleConfig);

                    return (
                      <details key={learner.id} className="attendance-teacher-matrix__learner-card rounded-md">
                        <summary className="attendance-teacher-matrix__learner-summary">
                          <div className="attendance-teacher-matrix__learner-summary-main">
                            <strong>{fullName || 'Unnamed learner'}</strong>
                            <span>
                              {learner.lrn || 'No LRN'} | {learner.section_name || 'No Section'} | {normalizeGenderLabel(learner.gender)}
                            </span>
                          </div>
                          <div className="attendance-teacher-matrix__learner-summary-meta">
                            {alerts.absent.hasAlert ? (
                              <span
                                className="attendance-teacher-matrix__alert-card attendance-teacher-matrix__alert-card--danger"
                                title={alerts.absent.detail}
                              >
                                <span className="material-symbols-outlined attendance-teacher-matrix__alert-icon" aria-hidden="true">
                                  warning
                                </span>
                                <span className="attendance-teacher-matrix__alert-copy">
                                  <strong>{alerts.absent.label}</strong>
                                  <span>{alerts.absent.detail}</span>
                                </span>
                              </span>
                            ) : null}
                            {alerts.late.hasAlert ? (
                              <span
                                className="attendance-teacher-matrix__alert-card attendance-teacher-matrix__alert-card--warning"
                                title={alerts.late.detail}
                              >
                                <span className="material-symbols-outlined attendance-teacher-matrix__alert-icon" aria-hidden="true">
                                  schedule
                                </span>
                                <span className="attendance-teacher-matrix__alert-copy">
                                  <strong>{alerts.late.label}</strong>
                                  <span>{alerts.late.detail}</span>
                                </span>
                              </span>
                            ) : null}
                            <span className="attendance-teacher-matrix__meta-pill">Present: {stats.presentDays}</span>
                            <span className="attendance-teacher-matrix__meta-pill">Late: {stats.lateDays}</span>
                            <span className="attendance-teacher-matrix__meta-pill">Absent: {stats.absentDays}</span>
                            <span className="material-symbols-outlined attendance-teacher-matrix__expand-icon">expand_more</span>
                          </div>
                        </summary>

                        <div className="attendance-teacher-matrix__learner-panel">
                          <div className="attendance-teacher-matrix__table-shell rounded-md">
                            <table className="attendance-teacher-matrix__table">
                              <colgroup>
                                <col className="attendance-teacher-matrix__month-col" />
                                <col className="attendance-teacher-matrix__type-col" />
                                {selectedMonthMatrix.days.map((day) => (
                                  <col key={day.dateKey} className="attendance-teacher-matrix__day-col" />
                                ))}
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>Month</th>
                                  <th>Type</th>
                                  {selectedMonthMatrix.days.map((day) => (
                                    <th
                                      key={day.dateKey}
                                      title={`Day ${day.day}`}
                                      className={day.isClassDay ? 'attendance-teacher-matrix__day-head' : 'attendance-teacher-matrix__day-head attendance-teacher-matrix__day-head--no-class'}
                                    >
                                      {day.day}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {SLOT_TYPES.map((slotType, rowIndex) => {
                                  const monthCell =
                                    rowIndex === 0 ? (
                                      <td className="attendance-teacher-matrix__month-cell" rowSpan={SLOT_TYPES.length}>
                                        <div className="attendance-teacher-matrix__month-name">{selectedMonthMatrix.monthLabel}</div>
                                        <div className="attendance-teacher-matrix__month-key">{selectedMonth}</div>
                                      </td>
                                    ) : null;

                                  return (
                                    <tr key={`${learner.id}-${selectedMonth}-${slotType}`}>
                                      {monthCell}
                                      <td className={`attendance-teacher-matrix__type-cell attendance-teacher-matrix__type-cell--${slotType.toLowerCase()}`}>
                                        <span>{slotType.replace('_', ' ')}</span>
                                      </td>
                                      {selectedMonthMatrix.days.map((day) => {
                                        const taps = learnerMonthRecords.filter(
                                          (record) =>
                                            formatAttendanceDate(record.timestamp) === day.dateKey &&
                                            record.type === slotType,
                                        );
                                        const hasLate = taps.some((tap) => isAttendanceRecordLate(tap, learner, scheduleConfig));
                                        return (
                                          <td
                                            key={`${learner.id}-${selectedMonth}-${day.dateKey}-${slotType}`}
                                            className={`attendance-teacher-matrix__day-cell attendance-teacher-matrix__day-cell--${slotType.toLowerCase()} ${day.isClassDay ? '' : 'attendance-teacher-matrix__day-cell--no-class'} ${hasLate ? 'attendance-teacher-matrix__day-cell--late' : ''}`}
                                          >
                                            <div className="attendance-teacher-matrix__tap-list">
                                              {!day.isClassDay ? (
                                                <span className="attendance-teacher-matrix__tap-empty">No Class</span>
                                              ) : taps.length > 0 ? (
                                                taps.map((tap, tapIndex) => renderTapChip(tap, day.dateKey, tapIndex))
                                              ) : (
                                                <span className="attendance-teacher-matrix__tap-empty">-</span>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
