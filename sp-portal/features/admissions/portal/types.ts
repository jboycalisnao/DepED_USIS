export type PortalStatus = 'open' | 'closed' | 'inactive';

export type BulletinCategory =
  | 'Admission'
  | 'Examination'
  | 'Documents'
  | 'Results'
  | 'Interview'
  | 'Maintenance';

export type AdmissionTimeline = {
  applicationPeriod: string;
  entranceExamination: string;
  resultsPosting: string;
};

export type Bulletin = {
  id: string;
  datePosted: string;
  title: string;
  category: BulletinCategory;
  text: string;
  attachmentLabel?: string;
  attachmentUrl?: string;
};

export type ProgramOffering = {
  id: string;
  gradeLevel: string;
  programTrack: string;
  slots: number;
  status: 'Open' | 'Closed' | 'For announcement';
};

export type ContactDetails = {
  office: string;
  email: string;
  phone: string;
  officeHours: string;
  address: string;
};

export type AdmissionPortal = {
  id: string;
  schoolName: string;
  schoolId: string;
  regionName: string;
  regionSlug: string;
  divisionName: string;
  divisionSlug: string;
  status: PortalStatus;
  heroCopy: string;
  timeline: AdmissionTimeline;
  bulletins: Bulletin[];
  offerings: ProgramOffering[];
  requirements: string[];
  contact: ContactDetails;
  applicationUrl?: string;
};
