export interface PrivacyClause {
  title: string;
  body: string;
}

export const LEON_NHS_PRIVACY_CONTRACT_INTRO =
  'Pursuant to Republic Act No. 10173 (Data Privacy Act of 2012), National Privacy Commission (NPC) Circulars, R.A. 10175 (Cybercrime Prevention Act of 2012), DepEd Order No. 40, s. 2012 (Child Protection Policy), and the Leon National High School (Leon NHS) USIS Data Privacy Policy, the Requesting Party and its organization agree to the following binding terms:';

export const LEON_NHS_PRIVACY_CLAUSES: PrivacyClause[] = [
  {
    title: 'Lawful Purpose & Official Use Only',
    body: 'The requested @leonnhs.edu.ph account shall be used strictly for official, school-sanctioned organization activities and educational communications. Personal, commercial, partisan, or unauthorized third-party use is strictly prohibited.',
  },
  {
    title: 'Protection of Personal & Learner Data',
    body: 'Any personal data, Learner Reference Numbers (LRNs), academic records, photos, or contact details processed or stored via the mailbox must comply with data minimization, documented consent, child protection rules, and purpose limitation.',
  },
  {
    title: 'Access Security & Breach Reporting',
    body: 'The Requesting Party and authorized executive officers shall safeguard login credentials, enable required multi-factor authentication, prevent unauthorized disclosure or forwarding of confidential data, and immediately report any suspected incident or breach to the Leon NHS Data Protection / ICT Coordinator.',
  },
  {
    title: 'Institutional Audit, Retention & Revocation',
    body: 'All @leonnhs.edu.ph accounts remain institutional property of Leon National High School and are subject to USIS security monitoring, archival retention controls, credential turnover upon officer transition, and suspension or revocation for policy violations.',
  },
];
