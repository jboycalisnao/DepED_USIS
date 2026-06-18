import { AttendanceScheduleConfig } from '../../types';

export type SessionTone = 'success' | 'warning' | 'primary' | 'neutral';

export interface SessionInfo {
  label: string;
  range: string;
  tone: SessionTone;
}

export function formatSessionTimeRange(start: string, end: string) {
  return `${start} - ${end}`;
}

export function getCurrentTimeString(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const timeToMinutes = (value: string) => {
  const [hours, minutes] = String(value || '')
    .split(':')
    .map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const isWithin = (current: string, start: string, end: string) => {
  const currentMinutes = timeToMinutes(current);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (currentMinutes == null || startMinutes == null || endMinutes == null) return false;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

export function getSessionInfo(now: Date, settings: AttendanceScheduleConfig): SessionInfo {
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const windows: Array<{ label: string; range: string; tone: SessionTone; start: string; end: string }> = [
    { label: 'Grades 7-10 AM In', range: formatSessionTimeRange(settings.grade7To10.amIn.in.start, settings.grade7To10.amIn.in.end), tone: 'success', start: settings.grade7To10.amIn.in.start, end: settings.grade7To10.amIn.in.end },
    { label: 'Grades 7-10 AM Out', range: formatSessionTimeRange(settings.grade7To10.amOut.in.start, settings.grade7To10.amOut.in.end), tone: 'warning', start: settings.grade7To10.amOut.in.start, end: settings.grade7To10.amOut.in.end },
    { label: 'Grades 7-10 PM In', range: formatSessionTimeRange(settings.grade7To10.pmIn.in.start, settings.grade7To10.pmIn.in.end), tone: 'primary', start: settings.grade7To10.pmIn.in.start, end: settings.grade7To10.pmIn.in.end },
    { label: 'Grades 7-10 PM Out', range: formatSessionTimeRange(settings.grade7To10.pmOut.in.start, settings.grade7To10.pmOut.in.end), tone: 'primary', start: settings.grade7To10.pmOut.in.start, end: settings.grade7To10.pmOut.in.end },
    { label: 'Grade 11 AM In', range: formatSessionTimeRange(settings.grade11.amIn.in.start, settings.grade11.amIn.in.end), tone: 'success', start: settings.grade11.amIn.in.start, end: settings.grade11.amIn.in.end },
    { label: 'Grade 11 AM Out', range: `${settings.grade11.amOut.in.start} onwards`, tone: 'warning', start: settings.grade11.amOut.in.start, end: '23:59' },
    { label: 'Grade 12 PM In', range: formatSessionTimeRange(settings.grade12.pmIn.in.start, settings.grade12.pmIn.in.end), tone: 'primary', start: settings.grade12.pmIn.in.start, end: settings.grade12.pmIn.in.end },
    { label: 'Grade 12 PM Out', range: `${settings.grade12.pmOut.in.start} onwards`, tone: 'primary', start: settings.grade12.pmOut.in.start, end: '23:59' },
  ];

  const active = windows.find((window) => isWithin(timeStr, window.start, window.end));
  if (active) {
    return {
      label: active.label,
      range: active.range,
      tone: active.tone,
    };
  }

  return {
    label: 'Outside Scheduled Windows',
    range: 'Grade-based attendance policy loaded',
    tone: 'neutral',
  };
}

export function getSessionToneClasses(tone: SessionTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'primary':
      return 'border-primary-200 bg-primary-50 text-primary-800';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

export function getScanToneClasses(isDuplicate: boolean, type: string) {
  if (isDuplicate) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  switch (type) {
    case 'AM_IN':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'AM_OUT':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'PM_IN':
    case 'PM_OUT':
      return 'border-primary-200 bg-primary-50 text-primary-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}
