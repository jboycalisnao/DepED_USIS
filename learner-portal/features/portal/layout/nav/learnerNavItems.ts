export type LearnerNavItem = {
  icon: string;
  label: string;
  path: string;
};

export const learnerNavItems: LearnerNavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'home' },
  { label: 'Grades', path: '/grades', icon: 'grading' },
  { label: 'Services', path: '/services', icon: 'widgets' },
  { label: 'Profile', path: '/profile', icon: 'person' },
];
