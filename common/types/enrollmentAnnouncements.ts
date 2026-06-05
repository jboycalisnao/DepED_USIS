export type EnrollmentAnnouncement = {
  id: string;
  announcementKey: string;
  title: string;
  message: string;
  audience: 'enrollment';
  isActive: boolean;
  isPinned: boolean;
  isHighlighted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
