export type LearnerServiceItem = {
  title: string;
  description: string;
  path: string;
  actionLabel: string;
};

export const learnerServicesCatalog: LearnerServiceItem[] = [
  {
    title: 'Enrollment History',
    description: 'View your yearly enrollment records, class sections, and latest enrollment status.',
    path: '/services/enrollment-history',
    actionLabel: 'View History',
  },
  {
    title: 'Document Requests',
    description: 'Request school documents and monitor request progress.',
    path: '/services/document-requests',
    actionLabel: 'View Requests',
  },
  {
    title: 'Student Support',
    description: 'Access guidance and referral services when available.',
    path: '/services/student-support',
    actionLabel: 'Open Support',
  },
  {
    title: 'PTA Fee',
    description: 'View your PTA transaction history, fee breakdown, and current balance.',
    path: '/services/pta-fee',
    actionLabel: 'Open PTA Fee',
  },
  {
    title: 'Merch',
    description: 'Browse school merchandise and place your order request.',
    path: '/services/merch',
    actionLabel: 'Open Merch',
  },
];
