import { TimeSlotSettings } from '../../types';

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

export function getSessionInfo(now: Date, settings: TimeSlotSettings): SessionInfo {
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (timeStr >= settings.amIn.start && timeStr <= settings.amIn.end) {
    return {
      label: 'Morning Entry',
      range: formatSessionTimeRange(settings.amIn.start, settings.amIn.end),
      tone: 'success',
    };
  }

  if (timeStr >= settings.amOut.start && timeStr <= settings.amOut.end) {
    return {
      label: 'Morning Exit',
      range: formatSessionTimeRange(settings.amOut.start, settings.amOut.end),
      tone: 'warning',
    };
  }

  if (timeStr >= settings.pmIn.start && timeStr <= settings.pmIn.end) {
    return {
      label: 'Afternoon Entry',
      range: formatSessionTimeRange(settings.pmIn.start, settings.pmIn.end),
      tone: 'primary',
    };
  }

  if (timeStr >= settings.pmOut.start && timeStr <= settings.pmOut.end) {
    return {
      label: 'Afternoon Exit',
      range: formatSessionTimeRange(settings.pmOut.start, settings.pmOut.end),
      tone: 'primary',
    };
  }

  return {
    label: 'Out of Session',
    range: 'Not accepting timed entries',
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
