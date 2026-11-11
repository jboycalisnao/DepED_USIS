import type { UsisSideNavItem } from '../../../common/components/UsisSideNav';

export const sccNavItems: UsisSideNavItem[] = [
  {
    icon: 'dashboard',
    label: 'Dashboard',
    path: '/',
  },
  {
    icon: 'apps',
    label: 'Service Catalog',
    path: '/catalog',
  },
  {
    icon: 'mark_email_read',
    label: 'Digital Requests',
    path: '/requests',
  },
  {
    icon: 'group',
    label: 'Club Roster',
    path: '/roster',
  },
  {
    icon: 'admin_panel_settings',
    label: 'Coordinator Desk',
    path: '/admin-desk',
  },
];
