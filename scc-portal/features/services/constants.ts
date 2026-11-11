import type { SccDigitalService } from '../../types';

export const SCC_DIGITAL_SERVICES: SccDigitalService[] = [
  {
    key: 'email_account',
    title: 'Institutional Club Email Account',
    subtitle: 'Official DepEd Google Workspace mailbox for student organizations and executive officers.',
    category: 'Communication',
    description:
      'Provides an official institutional mailbox (e.g. sslg@leonnhs.edu.ph) equipped with official DepEd signature branding, unlimited Google Drive access, and administrative email protection for council and club operations.',
    requirements: [
      'Current School Year (2026-2027) Club Recognition Certificate',
      'Endorsement from the designated Club / Organization Teacher Adviser',
      'Certified Roster of the Executive Board / Authorized Signatories',
    ],
    slaTurnaround: '1-2 School Days',
    icon: 'mail',
    isActive: true,
    sampleDeliverable: 'sslg@leonnhs.edu.ph (Google Workspace with 2FA protection)',
  },
  {
    key: 'cloud_storage',
    title: 'Club Shared Cloud Drive & Storage',
    subtitle: 'Institutional Google Shared Drive with managed permission tiers for organization files.',
    category: 'Storage & Archival',
    description:
      'Allocates a dedicated DepEd Workspace Shared Drive for organizational activity reports, project proposals, resolution drafts, minutes of the meeting, and high-definition event media archives.',
    requirements: [
      'Active Club Institutional Email or designated Adviser DepEd account',
      'Estimated annual archival storage tier (25GB / 50GB / 100GB)',
      'Designated Student Secretary & Adviser as Drive Content Managers',
    ],
    slaTurnaround: '1 School Day',
    icon: 'cloud_sync',
    isActive: true,
    sampleDeliverable: 'Google Workspace Shared Drive: [Leon NHS - YES-O Archives 2026-2027]',
  },
  {
    key: 'digital_id_pass',
    title: 'Digital Event QR & Entry Passes',
    subtitle: 'Automated QR code issuance and gate scanning integration for school club gatherings.',
    category: 'Event Tech',
    description:
      'Generates dynamic QR codes linked to DepEd USIS Learner IDs for general assemblies, club inductions, leadership summits, and student elections with attendance gate check-in verification.',
    requirements: [
      'Approved Activity Permit signed by the School Principal / Head Teacher',
      'Target participant grade levels or section scope',
      'Event schedule, venue, and designated officer scanners',
    ],
    slaTurnaround: '2-3 School Days',
    icon: 'qr_code_scanner',
    isActive: true,
    sampleDeliverable: 'USIS Event Gate Check-In QR Pass with live Attendance Monitoring',
  },
  {
    key: 'broadcast_notice',
    title: 'School Portal Bulletin Broadcast',
    subtitle: 'Publish official club notices and memos across the USIS Learner Portal and Mobile App.',
    category: 'Broadcast & Media',
    description:
      'Broadcasts approved club announcements, campaign advisories, application deadlines, and emergency meeting notices directly to the USIS Learner Portal dashboard and USIS Mobile feeds.',
    requirements: [
      'Signed Memorandum / Circular from Club President and Teacher Adviser',
      'Publication draft conforming to DepEd Child Protection & Privacy rules',
      'Target dissemination window (Publish Date to Archive Date)',
    ],
    slaTurnaround: 'Same-day or next school day',
    icon: 'campaign',
    isActive: true,
    sampleDeliverable: 'Official Learner Portal Dashboard Banner & Push Notification Alert',
  },
  {
    key: 'meeting_license',
    title: 'Virtual Conference & Livestream Room',
    subtitle: 'Enterprise Google Meet / Zoom institutional rooms for school-wide virtual summits.',
    category: 'Communication',
    description:
      'Provisions extended-capacity virtual conference rooms (up to 500 participants) with cloud recording, automated breakout rooms, and live YouTube/DepEd streaming links for council webinars.',
    requirements: [
      'Activity proposal detailing agenda and program flow',
      'Designated moderator/host DepEd email account',
      'Advance notice of at least 48 hours prior to the virtual gathering',
    ],
    slaTurnaround: '1 School Day',
    icon: 'video_call',
    isActive: true,
    sampleDeliverable: 'Google Meet Enterprise Link with Cloud Recording to Club Drive',
  },
  {
    key: 'portal_subpage',
    title: 'Club Repository Space & Microsite',
    subtitle: 'Dedicated public organization showcase within the DepEd USIS Academic Repository.',
    category: 'Web & Space',
    description:
      'Creates a dedicated public showcase page in the USIS School Repository featuring the club constitution, officer directory, accomplishment reports, awards, and downloadable membership forms.',
    requirements: [
      'Approved Club Constitution & By-Laws (CBL)',
      'High-resolution Club Logo / Seal (White outline PNG preferred)',
      'Editorial sign-off from the School Information Coordinator (SIC)',
    ],
    slaTurnaround: '3-4 School Days',
    icon: 'public',
    isActive: true,
    sampleDeliverable: 'leonnhs.edu.ph/repository/clubs/[acronym]',
  },
];
