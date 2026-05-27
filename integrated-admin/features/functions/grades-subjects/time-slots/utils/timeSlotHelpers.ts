import type { SubjectSchedulePresetRecord } from '../../services/subjectsManagementService';

export const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((value) => ({ label: value, value }));
export const gradeOptions = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((value) => ({ label: value, value }));

export const getGradeNumber = (value: string) => {
  const match = String(value || '').match(/\b(7|8|9|10|11|12)\b/);
  return match ? Number(match[1]) : null;
};

export const plusOneHour = (time: string) => {
  if (!/^\d{2}:\d{2}$/.test(time)) return '';
  const [h, m] = time.split(':').map((v) => Number(v));
  const nextH = (h + 1) % 24;
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const dayOrder: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const toMinutes = (value: string) => {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getProgramOrder = (value: string) => {
  if (value === 'Regular') return 0;
  if (value === 'SHS') return 2;
  return 1;
};

export const getProgramLabel = (row: SubjectSchedulePresetRecord) => {
  if (row.programScope === 'senior_high_school') return 'SHS';
  if (row.programScope === 'special_program_ste') return row.programName?.trim() || 'Special Program';
  return 'Regular';
};

export const sortByChronologicalTime = (rows: SubjectSchedulePresetRecord[]) => [...rows].sort((a, b) => {
  const startDelta = toMinutes(a.startTime) - toMinutes(b.startTime);
  if (startDelta !== 0) return startDelta;
  const endDelta = toMinutes(a.endTime) - toMinutes(b.endTime);
  if (endDelta !== 0) return endDelta;
  const dayDelta = (dayOrder[a.dayOfWeek] || 99) - (dayOrder[b.dayOfWeek] || 99);
  if (dayDelta !== 0) return dayDelta;
  return (a.label || '').localeCompare(b.label || '');
});

export const sortProgramLabels = (a: string, b: string) => getProgramOrder(a) - getProgramOrder(b) || a.localeCompare(b);
