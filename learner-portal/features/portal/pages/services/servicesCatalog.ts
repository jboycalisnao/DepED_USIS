export type LearnerServiceItem = {
  disabledMessage?: string;
  isDisabled?: boolean;
  title: string;
  description: string;
  path: string;
  actionLabel: string;
};

const BASE_SERVICES: LearnerServiceItem[] = [
  {
    title: 'Attendance Service',
    description: 'View your recorded attendance entries from the RFID attendance subsystem.',
    path: '/services/attendance',
    actionLabel: 'View Attendance',
  },
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
    title: 'Help Ticket',
    description: 'Submit a learner help ticket using your registrar profile details.',
    path: '/services/help-ticket',
    actionLabel: 'Open Ticket',
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

const MERCH_CONTROL_SERVICE: LearnerServiceItem = {
  title: 'Merch Control',
  description: 'Manage class-section merchandise visibility and view learner order details.',
  path: '/services/merch-control',
  actionLabel: 'Open Merch Control',
};

const ID_SERVICE: LearnerServiceItem = {
  title: 'ID',
  description: 'Request a learner ID creation during an open order period.',
  path: '/services/id',
  actionLabel: 'Request ID',
};

export const buildLearnerServicesCatalog = (options: {
  canRequestId: boolean;
  hasMerchControl: boolean;
  isIdPublished: boolean;
}): LearnerServiceItem[] => {
  const services = [...BASE_SERVICES];
  services.push(
    !options.isIdPublished
      ? {
          ...ID_SERVICE,
          actionLabel: 'Unavailable',
          disabledMessage: 'ID service is not published yet.',
          isDisabled: true,
        }
      : options.canRequestId
      ? ID_SERVICE
      : {
          ...ID_SERVICE,
          actionLabel: 'Unavailable',
          disabledMessage: 'No valid order period is available.',
          isDisabled: true,
        },
  );
  if (options.hasMerchControl) {
    services.push(MERCH_CONTROL_SERVICE);
  }
  return services;
};
