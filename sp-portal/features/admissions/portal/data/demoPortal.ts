import type { AdmissionPortal } from '../types';

export const demoAdmissionPortals: AdmissionPortal[] = [
  {
    id: 'lnhs-302345',
    schoolName: 'Leon National High School',
    schoolId: '302345',
    regionName: 'Region VI',
    regionSlug: 'region-vi',
    divisionName: 'Schools Division of Iloilo',
    divisionSlug: 'iloilo',
    status: 'open',
    heroCopy:
      'Submit applications, view admission notices, and check school-specific requirements for special program offerings and grade-level admission.',
    timeline: {
      applicationPeriod: 'April 15-30, 2026',
      entranceExamination: 'May 8, 2026',
      resultsPosting: 'May 15, 2026',
    },
    bulletins: [
      {
        id: 'opening-2026',
        datePosted: 'April 15, 2026',
        title: 'Application for Special Program Admission is Now Open',
        category: 'Admission',
        text:
          'Incoming learners may submit their application through this portal until April 30, 2026. Applicants are advised to prepare the required documents before proceeding.',
      },
      {
        id: 'exam-schedule-2026',
        datePosted: 'April 18, 2026',
        title: 'Entrance Examination Schedule',
        category: 'Examination',
        text:
          'Qualified applicants will be scheduled for the entrance or aptitude examination on May 8, 2026. Room assignments will be announced by the school.',
      },
      {
        id: 'document-reminder-2026',
        datePosted: 'April 20, 2026',
        title: 'Document Submission Reminder',
        category: 'Documents',
        text:
          'Applicants must keep original copies of submitted documents ready for verification during school screening.',
      },
    ],
    offerings: [
      {
        id: 'grade-7-sps',
        gradeLevel: 'Grade 7',
        programTrack: 'Special Program in Science',
        slots: 35,
        status: 'Open',
      },
      {
        id: 'grade-7-spa',
        gradeLevel: 'Grade 7',
        programTrack: 'Special Program in the Arts',
        slots: 25,
        status: 'Open',
      },
      {
        id: 'grade-11-stem',
        gradeLevel: 'Grade 11',
        programTrack: 'STEM Strand',
        slots: 80,
        status: 'Open',
      },
    ],
    requirements: [
      'Report Card / SF9',
      'PSA Birth Certificate',
      'Certificate of Good Moral Character',
      '2x2 ID picture',
      'Additional program-specific requirements, if applicable',
    ],
    contact: {
      office: 'Registrar / Admissions Office',
      email: 'admissions@leonnationalhs.edu.ph',
      phone: '(033) 000-0000',
      officeHours: 'Monday-Friday, 8:00 AM-5:00 PM',
      address: 'Leon National High School, Leon, Iloilo',
    },
    applicationUrl: '/admissions/region-vi/iloilo/302345/application',
  },
];
