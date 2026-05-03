const NAVIGATION_EVENT = 'usis:navigation';

const normalizePath = (value: string) => {
  if (!value) return '/';
  const normalized = value.startsWith('/') ? value : `/${value}`;
  if (normalized === '/login') return '/';
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
};

export const normalizeElectionPath = (value: string) => normalizePath(value);

export const getCurrentElectionPath = () => normalizePath(window.location.pathname);

export const navigateToElectionPath = (value: string, replace = false) => {
  const target = normalizePath(value);
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', target);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
};

export const openElectionPathInNewTab = (value: string) => {
  const target = normalizePath(value);
  window.open(target, '_blank');
};

export const getElectionAbsoluteUrl = (value: string) => {
  const target = normalizePath(value);
  return `${window.location.origin}${target}`;
};

export const getElectionNavigationEvent = () => NAVIGATION_EVENT;
