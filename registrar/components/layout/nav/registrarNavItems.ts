export type RegistrarNavItem = {
  icon: string;
  label: string;
  path: string;
};

export const registrarNavItems: RegistrarNavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'home' },
  { label: 'Learners', path: '/learners', icon: 'school' },
  { label: 'My Section Learners', path: '/my-section-learners', icon: 'groups' },
  { label: 'Enrollment', path: '/enroll', icon: 'widgets' },
  { label: 'Announcements', path: '/announcements', icon: 'campaign' },
  { label: 'Section/s', path: '/sections', icon: 'group' },
  { label: 'Bulk Import', path: '/import', icon: 'upload_file' },
  { label: 'Credentials', path: '/credentials', icon: 'badge' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];
