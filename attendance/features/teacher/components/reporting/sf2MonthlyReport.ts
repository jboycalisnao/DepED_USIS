import type { AttendanceRecord, AttendanceScheduleConfig, Learner } from '../../../../types';
import { isAttendanceRecordLate } from '../../../../utils/attendanceSchedule';

type Sf2ReportDay = {
  day: number;
  dateKey: string;
  taps: AttendanceRecord[];
  isClassDay: boolean;
};

type Sf2ReportRow = {
  learner: Learner;
  name: string;
  monthRecords: AttendanceRecord[];
  stats: {
    presentDays: number;
    lateDays: number;
    absentDays: number;
  };
};

export type Sf2MonthlyAttendanceInput = {
  schoolId: string;
  schoolName: string;
  schoolYearLabel: string;
  sectionName: string;
  sectionGradeLevel: string;
  monthKey: string;
  monthLabel: string;
  days: Sf2ReportDay[];
  rows: Sf2ReportRow[];
  scheduleConfig: AttendanceScheduleConfig;
};

const MANILA_TIME_ZONE = 'Asia/Manila';
const DAYS_IN_TEMPLATE = 31;
const NAME_COL = 1;
const DAY_COL_START = 2;
const DAY_COL_END = 32;
const ABSENT_COL = 33;
const TARDY_COL = 34;
const REMARKS_START_COL = 35;
const REMARKS_END_COL = 37;

const formatAttendanceDate = (timestamp: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));

const formatWeekday = (dateKey: string) => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][parsed.getDay()];
};

const formatLearnerName = (learner: Learner) => {
  const parts = [learner.last_name, learner.first_name, learner.middle_name].filter(Boolean).map((value) => String(value).trim());
  return parts.join(', ').replace(/,\s+/g, ', ').trim() || 'Unnamed learner';
};

const normalizeGenderLabel = (gender: string | null | undefined) => {
  const normalized = String(gender || '').trim().toLowerCase();
  if (normalized === 'm' || normalized === 'male' || normalized.startsWith('male')) return 'Male';
  if (normalized === 'f' || normalized === 'female' || normalized.startsWith('female')) return 'Female';
  return 'Other / Unspecified';
};

const buildFilenamePart = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s{2,}/g, ' ');

const weekdayAbbreviation = (dateKey: string) => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  switch (parsed.getDay()) {
    case 0:
      return 'SU';
    case 1:
      return 'M';
    case 2:
      return 'T';
    case 3:
      return 'W';
    case 4:
      return 'TH';
    case 5:
      return 'F';
    case 6:
      return 'SA';
    default:
      return '';
  }
};

const getManilaDateKey = (value = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

const isFutureDateKey = (dateKey: string, referenceDateKey: string) => dateKey > referenceDateKey;

const formatTapTime = (tap?: AttendanceRecord) => {
  if (!tap) return '';
  return new Date(tap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const applyRangeBorder = (worksheet: any, startRow: number, endRow: number, startCol: number, endCol: number) => {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    }
  }
};

const columnLetter = (index: number) => {
  let current = index;
  let result = '';
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
};

const parseCellAddress = (address: string) => {
  const match = address.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const [, rawCol, rawRow] = match;
  const col = rawCol.toUpperCase().split('').reduce((total, char) => total * 26 + (char.charCodeAt(0) - 64), 0);
  const row = Number(rawRow);
  if (!Number.isFinite(col) || !Number.isFinite(row)) return null;
  return { row, col };
};

const parseRangeAddress = (range: string) => {
  const parts = range.split(':');
  if (parts.length !== 2) return null;
  const start = parseCellAddress(parts[0]);
  const end = parseCellAddress(parts[1]);
  if (!start || !end) return null;
  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endCol: Math.max(start.col, end.col),
  };
};

const rangesOverlap = (left: { startRow: number; endRow: number; startCol: number; endCol: number }, right: { startRow: number; endRow: number; startCol: number; endCol: number }) =>
  !(left.endRow < right.startRow || right.endRow < left.startRow || left.endCol < right.startCol || right.endCol < left.startCol);

const styleLabel = (
  worksheet: any,
  address: string,
  value: string,
  options?: { fontSize?: number; bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right' },
) => {
  const cell = worksheet.getCell(address);
  cell.value = value;
  cell.font = {
    name: 'Segoe UI',
    size: options?.fontSize ?? 10,
    bold: options?.bold ?? false,
    italic: options?.italic ?? false,
    color: { argb: 'FF000000' },
  };
  cell.alignment = { vertical: 'middle', horizontal: options?.align ?? 'right', wrapText: true };
};

const styleMergedField = (
  worksheet: any,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  value: string,
  options?: { fontSize?: number; bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right' },
  mergedRanges?: Array<{ startRow: number; endRow: number; startCol: number; endCol: number }>,
) => {
  const range = `${columnLetter(startCol)}${startRow}:${columnLetter(endCol)}${endRow}`;
  const nextRange = { startRow, endRow, startCol, endCol };
  const overlapsExisting = (mergedRanges || []).some((existing) => rangesOverlap(existing, nextRange));
  if (!overlapsExisting) {
    try {
      worksheet.mergeCells(range);
      mergedRanges?.push(nextRange);
    } catch (error: any) {
      const message = String(error?.message || error || '');
      if (!message.includes('already merged cells')) {
        throw error;
      }
    }
  }
  const cell = worksheet.getCell(startRow, startCol);
  cell.value = value;
  cell.font = {
    name: 'Segoe UI',
    size: options?.fontSize ?? 10,
    bold: options?.bold ?? false,
    italic: options?.italic ?? false,
    color: { argb: 'FF000000' },
  };
  cell.alignment = { vertical: 'middle', horizontal: options?.align ?? 'center', wrapText: true };
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const target = worksheet.getCell(row, col);
      target.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' },
      };
      setGridBorder(target);
    }
  }
};

const safeMerge = (worksheet: any, range: string) => {
  const mergedRangeRegistry = (worksheet.__sf2MergedRanges ||= []);
  const nextRange = parseRangeAddress(range);
  if (!nextRange) return;
  if (mergedRangeRegistry.some((existing: any) => rangesOverlap(existing, nextRange))) return;
  try {
    worksheet.mergeCells(range);
    mergedRangeRegistry.push(nextRange);
  } catch (error: any) {
    const message = String(error?.message || error || '');
    if (message.includes('already merged cells')) return;
    throw error;
  }
};

const buildGenderGroups = (rows: Sf2ReportRow[]) => {
  const grouped = new Map<string, Sf2ReportRow[]>();
  rows.forEach((row) => {
    const key = normalizeGenderLabel(row.learner.gender);
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  });

  const compareRows = (left: Sf2ReportRow, right: Sf2ReportRow) => {
    const leftName = left.name || formatLearnerName(left.learner);
    const rightName = right.name || formatLearnerName(right.learner);
    return leftName.localeCompare(rightName);
  };

  return [
    { key: 'Male', label: 'MALE', rows: (grouped.get('Male') || []).slice().sort(compareRows) },
    { key: 'Female', label: 'FEMALE', rows: (grouped.get('Female') || []).slice().sort(compareRows) },
    {
      key: 'Other / Unspecified',
      label: 'OTHER / UNSPECIFIED',
      rows: (grouped.get('Other / Unspecified') || []).slice().sort(compareRows),
    },
  ].filter((group) => group.rows.length > 0);
};

const setGridBorder = (cell: any) => {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
};

const buildTapBreakdownRows = (input: Sf2MonthlyAttendanceInput, referenceDateKey: string) => {
  const breakdownRows: Array<{
    learner: Learner;
    learnerName: string;
    learnerLrn: string;
    sectionName: string;
    gradeLevel: string;
    dateKey: string;
    day: number;
    amIn: string;
    amInLate: boolean;
    amOut: string;
    amOutLate: boolean;
    pmIn: string;
    pmInLate: boolean;
    pmOut: string;
    pmOutLate: boolean;
    totalTaps: number;
    lateTaps: number;
  }> = [];

  input.rows.forEach((row) => {
    input.days.forEach((day) => {
      const isFuture = isFutureDateKey(day.dateKey, referenceDateKey);
      const dayRecords = row.monthRecords
        .filter((record) => formatAttendanceDate(record.timestamp) === day.dateKey)
        .slice()
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

      const amIn = dayRecords.find((record) => record.type === 'AM_IN');
      const amOut = dayRecords.find((record) => record.type === 'AM_OUT');
      const pmIn = dayRecords.find((record) => record.type === 'PM_IN');
      const pmOut = dayRecords.find((record) => record.type === 'PM_OUT');

      breakdownRows.push({
        learner: row.learner,
        learnerName: row.name || formatLearnerName(row.learner),
        learnerLrn: String(row.learner.lrn || ''),
        sectionName: String(row.learner.section_name || ''),
        gradeLevel: String(row.learner.grade_level || ''),
        dateKey: day.dateKey,
        day: day.day,
        amIn: isFuture ? '' : formatTapTime(amIn),
        amInLate: isFuture ? false : Boolean(amIn && isAttendanceRecordLate(amIn, row.learner, input.scheduleConfig)),
        amOut: isFuture ? '' : formatTapTime(amOut),
        amOutLate: isFuture ? false : Boolean(amOut && isAttendanceRecordLate(amOut, row.learner, input.scheduleConfig)),
        pmIn: isFuture ? '' : formatTapTime(pmIn),
        pmInLate: isFuture ? false : Boolean(pmIn && isAttendanceRecordLate(pmIn, row.learner, input.scheduleConfig)),
        pmOut: isFuture ? '' : formatTapTime(pmOut),
        pmOutLate: isFuture ? false : Boolean(pmOut && isAttendanceRecordLate(pmOut, row.learner, input.scheduleConfig)),
        totalTaps: isFuture ? 0 : dayRecords.length,
        lateTaps: isFuture ? 0 : dayRecords.filter((record) => isAttendanceRecordLate(record, row.learner, input.scheduleConfig)).length,
      });
    });
  });

  return breakdownRows;
};

export async function buildSf2MonthlyAttendanceWorkbook(input: Sf2MonthlyAttendanceInput) {
  const fixedSchoolId = '302522';
  const generatedDateKey = getManilaDateKey();
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'DepED USIS Attendance Module';
  workbook.lastModifiedBy = 'DepED USIS Attendance Module';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  const worksheet = workbook.addWorksheet('SF2', {
    views: [{ state: 'frozen', ySplit: 10 }],
  });
  const mergedRanges: Array<{ startRow: number; endRow: number; startCol: number; endCol: number }> = [];

  worksheet.properties.defaultRowHeight = 18;
  worksheet.views = [{ showGridLines: false }];
  worksheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 5,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.15,
      footer: 0.15,
    },
  };

  worksheet.columns = [
    { width: 34 },
    ...Array.from({ length: DAYS_IN_TEMPLATE }, () => ({ width: 4.5 })),
    { width: 10 },
    { width: 10 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
  ];

  safeMerge(worksheet, 'C1:AB1');
  safeMerge(worksheet, 'C2:AB2');
  safeMerge(worksheet, 'A8:A10');
  safeMerge(worksheet, 'B8:AF8');
  safeMerge(worksheet, 'AG8:AH8');
  safeMerge(worksheet, 'AI8:AK10');

  const titleCell = worksheet.getCell('C1');
  titleCell.value = 'School Form 2 (SF2) Daily Attendance Report of Learners';
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const subtitleCell = worksheet.getCell('C2');
  subtitleCell.value = '(This replaced Form 1, Form 2 & STS Form 4 - Absenteeism and Dropout Profile)';
  subtitleCell.font = { name: 'Segoe UI', size: 10, italic: true };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 20;
  worksheet.getRow(4).height = 28;
  worksheet.getRow(5).height = 28;
  worksheet.getRow(8).height = 24;
  worksheet.getRow(9).height = 20;
  worksheet.getRow(10).height = 20;

  styleLabel(worksheet, 'B4', 'School ID', { align: 'right', fontSize: 10 });
  styleLabel(worksheet, 'F4', 'School Year', { align: 'right', fontSize: 10 });
  styleLabel(worksheet, 'L4', 'Report for the Month of', { align: 'right', fontSize: 10 });
  styleLabel(worksheet, 'B5', 'Name of School', { align: 'right', fontSize: 10 });
  styleLabel(worksheet, 'O5', 'Grade Level', { align: 'right', fontSize: 10 });
  styleLabel(worksheet, 'T5', 'Section', { align: 'right', fontSize: 10 });

  styleMergedField(worksheet, 4, 3, 4, 5, fixedSchoolId, { bold: true, fontSize: 10 }, mergedRanges);
  styleMergedField(worksheet, 4, 8, 4, 10, input.schoolYearLabel || '', { bold: true, fontSize: 10 }, mergedRanges);
  styleMergedField(worksheet, 4, 17, 4, 21, input.monthLabel || '', { bold: true, fontSize: 10 }, mergedRanges);
  styleMergedField(worksheet, 5, 3, 5, 11, input.schoolName || '', { bold: true, fontSize: 10, align: 'left' }, mergedRanges);
  styleMergedField(worksheet, 5, 16, 5, 17, input.sectionGradeLevel || '', { bold: true, fontSize: 10 }, mergedRanges);
  styleMergedField(worksheet, 5, 21, 5, 28, input.sectionName || '', { bold: true, fontSize: 10, align: 'left' }, mergedRanges);

  worksheet.getCell('A8').value = "LEARNER'S NAME (Last Name, First Name, Middle Name)";
  worksheet.getCell('A8').font = { name: 'Segoe UI', size: 10, bold: true };
  worksheet.getCell('A8').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  worksheet.getCell('A8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  worksheet.getCell('A8').border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  worksheet.getCell('B8').value = '(1st row for date, 2nd row for Day: M,T,W,TH,F)';
  worksheet.getCell('B8').font = { name: 'Segoe UI', size: 9, bold: true };
  worksheet.getCell('B8').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  worksheet.getCell('B8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  worksheet.getCell('B8').border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  styleMergedField(worksheet, 8, 33, 8, 34, 'Total for the Month', { bold: true, fontSize: 10 });
  styleMergedField(
    worksheet,
    8,
    35,
    10,
    37,
    'REMARKS (If DROPPED OUT, state reason, please refer to legend number 2. If TRANSFERRED IN/OUT, write the name of School.)',
    { bold: true, fontSize: 9 },
  );

  worksheet.getCell('AG9').value = 'ABSENT';
  worksheet.getCell('AH9').value = 'TARDY';
  ['AG9', 'AH9', 'B9', 'B10'].forEach((address) => {
    worksheet.getCell(address).font = { name: 'Segoe UI', size: 9, bold: true };
    worksheet.getCell(address).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  for (let day = 1; day <= DAYS_IN_TEMPLATE; day += 1) {
    const column = DAY_COL_START + day - 1;
    const headerCell = worksheet.getCell(9, column);
    const weekdayCell = worksheet.getCell(10, column);
    const dayInfo = input.days.find((entry) => entry.day === day);
    const isValidDay = Boolean(dayInfo);

    headerCell.value = isValidDay ? day : '';
    weekdayCell.value = isValidDay ? weekdayAbbreviation(dayInfo.dateKey) : '';

    const fillColor = isValidDay ? 'FFFFFFFF' : 'FFF3F4F6';
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    weekdayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };

    headerCell.font = { name: 'Segoe UI', size: 9, bold: true };
    weekdayCell.font = { name: 'Segoe UI', size: 9, bold: true };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    weekdayCell.alignment = { horizontal: 'center', vertical: 'middle' };

    headerCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
    weekdayCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }

  worksheet.getCell('AG10').value = '';
  worksheet.getCell('AH10').value = '';
  worksheet.getCell('AG9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  worksheet.getCell('AH9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  worksheet.getCell('AG10').border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
  worksheet.getCell('AH10').border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  const dataStartRow = 11;
  let currentRow = dataStartRow;
  const genderGroups = buildGenderGroups(input.rows);

  genderGroups.forEach((group) => {
    safeMerge(worksheet, `A${currentRow}:AK${currentRow}`);
    const groupCell = worksheet.getCell(`A${currentRow}`);
    groupCell.value = `${group.label} (${group.rows.length})`;
    groupCell.font = { name: 'Segoe UI', size: 10, bold: true };
    groupCell.alignment = { horizontal: 'left', vertical: 'middle' };
    groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    for (let col = 1; col <= 37; col += 1) {
      const cell = worksheet.getCell(currentRow, col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      setGridBorder(cell);
    }
    worksheet.getRow(currentRow).height = 20;
    currentRow += 1;

    group.rows.forEach((row) => {
      worksheet.getRow(currentRow).height = 18;

      const nameCell = worksheet.getCell(currentRow, NAME_COL);
      nameCell.value = row.name || formatLearnerName(row.learner);
      nameCell.font = { name: 'Segoe UI', size: 10, bold: false };
      nameCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      setGridBorder(nameCell);

      for (let day = 1; day <= DAYS_IN_TEMPLATE; day += 1) {
        const col = DAY_COL_START + day - 1;
        const cell = worksheet.getCell(currentRow, col);
        const dayInfo = input.days.find((entry) => entry.day === day);
        const dayRecords = dayInfo
          ? row.monthRecords.filter((record) => formatAttendanceDate(record.timestamp) === dayInfo.dateKey)
          : [];
        const isValidDay = Boolean(dayInfo);
        const isFuture = Boolean(dayInfo) && isFutureDateKey(dayInfo.dateKey, generatedDateKey);
        const isClassDay = Boolean(dayInfo?.isClassDay);
        const hasLate = dayRecords.some((record) => isAttendanceRecordLate(record, row.learner, input.scheduleConfig));
        const hasRecords = dayRecords.length > 0;

        if (!isValidDay) {
          cell.value = '';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        } else if (!isClassDay || isFuture) {
          cell.value = '';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        } else if (!hasRecords) {
          cell.value = 'A';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        } else {
          cell.value = hasLate ? 'T' : 'P';
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: hasLate ? 'FFFFF7CC' : 'FFE2F8E8' },
          };
        }

        cell.font = { name: 'Segoe UI', size: 9, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        setGridBorder(cell);
      }

      const validDays = input.days.filter((day) => day.isClassDay && !isFutureDateKey(day.dateKey, generatedDateKey));
      const absentCount = validDays.filter((day) => !row.monthRecords.some((record) => formatAttendanceDate(record.timestamp) === day.dateKey)).length;
      const tardyCount = validDays.filter((day) =>
        row.monthRecords
          .filter((record) => formatAttendanceDate(record.timestamp) === day.dateKey)
          .some((record) => isAttendanceRecordLate(record, row.learner, input.scheduleConfig)),
      ).length;

      const absentCell = worksheet.getCell(currentRow, ABSENT_COL);
      absentCell.value = { formula: `COUNTIF(B${currentRow}:AF${currentRow},"A")`, result: absentCount };
      absentCell.font = { name: 'Segoe UI', size: 9, bold: true };
      absentCell.alignment = { horizontal: 'center', vertical: 'middle' };
      setGridBorder(absentCell);

      const tardyCell = worksheet.getCell(currentRow, TARDY_COL);
      tardyCell.value = { formula: `COUNTIF(B${currentRow}:AF${currentRow},"T")`, result: tardyCount };
      tardyCell.font = { name: 'Segoe UI', size: 9, bold: true };
      tardyCell.alignment = { horizontal: 'center', vertical: 'middle' };
      setGridBorder(tardyCell);

      safeMerge(worksheet, `AI${currentRow}:AK${currentRow}`);
      const remarksCell = worksheet.getCell(currentRow, REMARKS_START_COL);
      remarksCell.value = '';
      remarksCell.font = { name: 'Segoe UI', size: 9 };
      remarksCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      for (let col = REMARKS_START_COL; col <= REMARKS_END_COL; col += 1) {
        const cell = worksheet.getCell(currentRow, col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        setGridBorder(cell);
      }

      currentRow += 1;
    });
  });

  if (genderGroups.length === 0) {
    safeMerge(worksheet, `A${currentRow}:AK${currentRow}`);
    const emptyCell = worksheet.getCell(`A${currentRow}`);
    emptyCell.value = 'No learners to report.';
    emptyCell.font = { name: 'Segoe UI', size: 10, italic: true };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let col = 1; col <= 37; col += 1) {
      setGridBorder(worksheet.getCell(currentRow, col));
    }
    currentRow += 1;
  }

  applyRangeBorder(worksheet, 8, 10, NAME_COL, REMARKS_END_COL);

  const footerRow = currentRow + 1;
  safeMerge(worksheet, `A${footerRow}:AK${footerRow}`);
  const footerCell = worksheet.getCell(`A${footerRow}`);
  footerCell.value = `Generated by DepED USIS Attendance for ${input.sectionName} - ${input.monthLabel}`;
  footerCell.font = { name: 'Segoe UI', size: 9, italic: true };
  footerCell.alignment = { horizontal: 'left', vertical: 'middle' };

  const breakdownSheet = workbook.addWorksheet('Tap Breakdown');
  breakdownSheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 5 }];
  breakdownSheet.properties.defaultRowHeight = 18;
  breakdownSheet.columns = [
    { width: 30 },
    { width: 18 },
    { width: 20 },
    { width: 16 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
  ];

  [
    'Learner',
    'LRN',
    'Section',
    'Grade Level',
    'Date',
    'Day',
    'AM_IN',
    'AM_OUT',
    'PM_IN',
    'PM_OUT',
    'Total Taps',
    'Late Taps',
  ].forEach((label, index) => {
    breakdownSheet.getCell(1, index + 1).value = label;
  });
  breakdownSheet.getRow(1).font = { name: 'Segoe UI', size: 10, bold: true };
  breakdownSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  breakdownSheet.getRow(1).height = 22;
  breakdownSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    setGridBorder(cell);
  });

  const breakdownRows = buildTapBreakdownRows(input, generatedDateKey);
  breakdownSheet.addRows(
    breakdownRows.map((row) => [
      row.learnerName,
      row.learnerLrn,
      row.sectionName,
      row.gradeLevel,
      row.dateKey,
      weekdayAbbreviation(row.dateKey),
      row.amIn,
      row.amOut,
      row.pmIn,
      row.pmOut,
      row.totalTaps,
      row.lateTaps,
    ]),
  );

  const breakdownLastRow = breakdownSheet.rowCount;
  for (let row = 2; row <= breakdownLastRow; row += 1) {
    breakdownSheet.getRow(row).height = 18;
    for (let col = 1; col <= 12; col += 1) {
      const cell = breakdownSheet.getCell(row, col);
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.alignment = { horizontal: col >= 11 ? 'center' : 'left', vertical: 'middle', wrapText: true };
      setGridBorder(cell);
    }
  }
  breakdownRows.forEach((row, index) => {
    const excelRow = index + 2;
    const lateFlags = [row.amInLate, row.amOutLate, row.pmInLate, row.pmOutLate];
    [7, 8, 9, 10].forEach((col, slotIndex) => {
      const cell = breakdownSheet.getCell(excelRow, col);
      if (!cell.value) return;
      if (!lateFlags[slotIndex]) return;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
      cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF9A3412' } };
    });
  });
  breakdownSheet.getColumn(11).alignment = { horizontal: 'center' };
  breakdownSheet.getColumn(12).alignment = { horizontal: 'center' };

  const legendStartRow = footerRow + 2;
  const legendTitleRow = legendStartRow;
  const legendDetailRow = legendStartRow + 1;
  const legendFootRow = legendStartRow + 2;

  worksheet.getRow(legendTitleRow).height = 20;
  worksheet.getRow(legendDetailRow).height = 22;
  worksheet.getRow(legendFootRow).height = 18;

  styleMergedField(worksheet, legendTitleRow, 1, legendTitleRow, 37, 'Legend', { bold: true, fontSize: 10, align: 'center' }, mergedRanges);
  const legendTitleCell = worksheet.getCell(legendTitleRow, 1);
  legendTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

  styleMergedField(worksheet, legendDetailRow, 1, legendDetailRow, 11, 'P = Present', { bold: true, fontSize: 9, align: 'center' }, mergedRanges);
  styleMergedField(worksheet, legendDetailRow, 12, legendDetailRow, 23, 'T = Tardy', { bold: true, fontSize: 9, align: 'center' }, mergedRanges);
  styleMergedField(worksheet, legendDetailRow, 24, legendDetailRow, 37, 'A = Absent', { bold: true, fontSize: 9, align: 'center' }, mergedRanges);

  const legendP = worksheet.getCell(legendDetailRow, 1);
  const legendT = worksheet.getCell(legendDetailRow, 12);
  const legendA = worksheet.getCell(legendDetailRow, 24);
  legendP.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F8E8' } };
  legendT.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  legendA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };

  styleMergedField(
    worksheet,
    legendFootRow,
    1,
    legendFootRow,
    37,
    'Symbols are used in the daily attendance grid and the Tap Breakdown sheet.',
    { italic: true, fontSize: 9, align: 'center' },
    mergedRanges,
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const safeSection = buildFilenamePart(input.sectionName);
  const safeMonth = buildFilenamePart(input.monthLabel || input.monthKey);
  const fileName = `SF2-USIS-${safeSection}-${safeMonth}.xlsx`;

  return {
    buffer,
    fileName,
  };
}
