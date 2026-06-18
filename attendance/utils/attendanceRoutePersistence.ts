export const ATTENDANCE_BASENAME = '/attendance';
export const ATTENDANCE_LAST_PATH_KEY = 'attendance:last-path';
export const ATTENDANCE_LAST_NON_KIOSK_PATH_KEY = 'attendance:last-non-kiosk-path';
export const ATTENDANCE_DEFAULT_PATH = '/registrar';
export const ATTENDANCE_KIOSK_PATH = '/kiosk';

export function resolveAttendancePath(pathname: string, fallback: string = ATTENDANCE_DEFAULT_PATH) {
  const value = pathname.trim();
  if (!value) return fallback;

  const route = value.startsWith(ATTENDANCE_BASENAME)
    ? value.slice(ATTENDANCE_BASENAME.length) || '/'
    : value;

  if (route.startsWith('/registrar')) return '/registrar' + route.slice('/registrar'.length);
  if (route.startsWith('/records')) return '/records' + route.slice('/records'.length);
  if (route.startsWith('/summary')) return '/summary' + route.slice('/summary'.length);
  if (route.startsWith('/settings')) return '/settings' + route.slice('/settings'.length);
  if (route.startsWith('/kiosk')) return '/kiosk' + route.slice('/kiosk'.length);
  return fallback;
}
