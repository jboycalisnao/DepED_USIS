export type CoordinatorNavItem = {
  icon: string;
  label: string;
  path: string;
};

export const coordinatorNavItems: CoordinatorNavItem[] = [
  { label: 'Credentials', path: '/admin/credentials', icon: 'badge' },
  { label: 'Registry', path: '/admin/registry', icon: 'groups' },
];
