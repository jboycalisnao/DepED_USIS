import { FeeItem, SystemConfig, UserRole } from '../types';

export const DEFAULT_FEE_SCHEDULE: FeeItem[] = [
  { name: 'PTA MEMBERSHIP', amount: 100.0, type: 'Base' },
  { name: 'PTA PROJECTS', amount: 150.0, type: 'Base' },
  { name: 'GIRL SCOUT/BOY SCOUT SUSTAINING MEMBERSHIP', amount: 50.0, type: 'Base' },
  { name: 'RED CROSS', amount: 50.0, type: 'Base' },
  { name: 'SCHOOL PUBLICATION', amount: 90.0, type: 'Base' },
  { name: 'CULTURAL/SPORTS', amount: 105.0, type: 'Base' },
  { name: 'ANTI TB', amount: 5.0, type: 'Base' },
  { name: 'SCHOOL ORGANIZATIONS', amount: 200.0, type: 'Base' },
  { name: 'SCHOOL UTILITY', amount: 70.0, type: 'Base' },
  { name: 'COLLECTING/DISBURSING OFFICER', amount: 50.0, type: 'Base' },
  { name: 'DEVELOPMENTAL FEE', amount: 500.0, type: 'STE_SPA_Only' },
  { name: 'DEVELOPMENTAL FEE', amount: 100.0, type: 'SHS_Only' },
];

export const LOCAL_FALLBACK_USER = {
  id: 'local-admin-1',
  username: 'admin',
  password: 'leonnhs123',
  fullName: 'Local Administrator',
  role: 'Admin' as UserRole,
  status: 'Active'
};

export const UPDATED_CONTRIBUTION_CATEGORIES = DEFAULT_FEE_SCHEDULE
  .filter((fee, index, list) => list.findIndex(candidate => candidate.name === fee.name) === index)
  .map(fee => fee.name);

export const normalizeSchoolName = (value?: string) => {
  if (!value || value.trim() === '' || value === 'National High School') {
    return 'Leon National High School';
  }
  return value;
};

export const applyUpdatedFinanceConfig = (config: SystemConfig): SystemConfig => ({
  ...config,
  schoolName: normalizeSchoolName(config.schoolName),
  schoolYear: config.schoolYear || '2025-2026',
  feeSchedule: DEFAULT_FEE_SCHEDULE,
  contributionCategories: UPDATED_CONTRIBUTION_CATEGORIES,
  defaultContributionAmount: 100
});

export const DEFAULT_CONFIG: SystemConfig = {
  appName: 'SPTA System',
  themeColor: '#2563eb',
  schoolName: 'Leon National High School',
  schoolId: '300123',
  schoolHeadName: 'School Principal',
  ptaPresidentName: 'PTA President',
  ptaTreasurerName: 'PTA Staff',
  schoolYear: '2025-2026',
  feeSchedule: DEFAULT_FEE_SCHEDULE,
  contributionCategories: UPDATED_CONTRIBUTION_CATEGORIES,
  defaultContributionAmount: 100,
  financeSettings: {
    voucher: {
      prepared: { name: 'PTA Staff', title: 'PTA Staff' },
      certified: { name: 'PTA Auditor', title: 'Auditor' },
      approved: { name: 'PTA President', title: 'President' }
    },
    liquidation: {
      checked: { name: 'PTA Staff', title: 'PTA Staff' },
      noted: { name: 'School Head', title: 'Principal' }
    },
    audit: {
      examined: { name: 'PTA Auditor', title: 'Auditor' },
      noted: { name: 'PTA President', title: 'President' }
    },
    daily: {
      prepared: { name: 'PTA Staff', title: 'PTA Staff' },
      certified: { name: 'PTA Auditor', title: 'Auditor' },
      noted: { name: 'PTA President', title: 'President' }
    }
  }
};
