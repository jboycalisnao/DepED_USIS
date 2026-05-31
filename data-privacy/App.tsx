import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisPortalGate } from '../common/components/UsisPortalGate';

const coreLaws = [
  {
    title: '1. Data Privacy Act of 2012',
    summary: 'Primary legal basis for handling personal data in school systems.',
    points: [
      'Collection of learner, parent, and personnel information',
      'Purpose limitation and data minimization',
      'Data retention and disposal controls',
      'Consent handling and lawful processing',
      'Data subject rights and security safeguards',
      'Breach reporting and third-party sharing controls',
    ],
  },
  {
    title: '2. National Privacy Commission Circulars and Advisories',
    summary: 'Operational guidance for privacy governance and controls.',
    points: [
      'NPC Circular No. 16-01 Security of Personal Data',
      'NPC Circular No. 16-03 Data Privacy Impact Assessment',
      'NPC Circular No. 17-01 Registration of Data Processing Systems',
      'NPC Circular No. 2022-01 Guidelines on Consent',
      'Encryption, access control, audit logs, and incident response',
    ],
  },
  {
    title: '3. Cybercrime Prevention Act of 2012',
    summary: 'Covers unauthorized access, misuse, and digital evidence handling.',
    points: ['Unauthorized access prevention', 'System misuse provisions', 'Cybersecurity response and evidence handling'],
  },
  {
    title: '4. Electronic Commerce Act',
    summary: 'Supports legal treatment of electronic transactions and records.',
    points: ['Digital forms', 'Electronic signatures', 'Online enrollment records', 'Digital certifications/documents'],
  },
  {
    title: '5. Freedom of Information Executive Order',
    summary: 'Balances transparency with confidentiality of learner records.',
    points: ['Define confidential records', 'Define public-access school information'],
  },
];

const depedPolicies = [
  {
    title: '6. DepEd Order No. 28, s. 2016',
    subtitle: 'Basic Education Research Ethics Guidelines',
    points: ['Confidentiality in learner research data', 'Child protection standards', 'Ethical handling of analytics and surveys'],
  },
  {
    title: '7. DepEd Order No. 40, s. 2012',
    subtitle: 'Child Protection Policy',
    points: ['Protection of child-sensitive data', 'Parent/guardian consent', 'Confidential incident records'],
  },
  {
    title: '8. DepEd LIS Handling Practices',
    subtitle: 'Learner Information System Alignment',
    points: ['LRN confidentiality', 'Authorized personnel access only', 'Record correction procedures'],
  },
  {
    title: '9. DepEd Computerization Program Policies',
    subtitle: 'ICT and Security Standards',
    points: ['Infrastructure compliance', 'Network usage controls', 'User accountability'],
  },
  {
    title: '10. DICT Policies',
    subtitle: 'Cloud and Cybersecurity Standards',
    points: ['Government Cloud First direction', 'Cybersecurity baselines', 'ICT accessibility requirements'],
  },
];

const requiredSections = [
  {
    title: 'A. Privacy Notice',
    points: [
      'What data are collected',
      'Why they are collected',
      'How data are used',
      'Who can access data',
      'Retention period',
      'Security measures',
    ],
  },
  {
    title: 'B. Consent and Declaration',
    quote:
      'I hereby certify that the information provided is true and correct. I authorize the school and the Department of Education to process my personal information and I understand my rights under the Data Privacy Act of 2012.',
  },
  {
    title: 'C. Data Subject Rights',
    points: [
      'Right to be informed',
      'Right to access',
      'Right to correct',
      'Right to object',
      'Right to erasure or blocking',
      'Right to damages',
    ],
  },
  {
    title: 'D. Security Statement',
    points: ['Encryption', 'Authentication', 'Role-based access', 'Audit logging', 'Backup and recovery procedures'],
  },
  {
    title: 'E. Contact Information',
    points: ['Data Protection Officer (if designated)', 'ICT Coordinator or System Administrator', 'Official school email/contact channels'],
  },
];

const recommendedPages = [
  'Privacy Policy',
  'Terms of Use',
  'Consent and Declaration',
  'Acceptable Use Policy',
  'Cookie Policy (if analytics are used)',
  'Data Retention Policy',
  'Incident/Breach Response Policy',
  'User Access Policy',
  'Parent Consent Form',
  'Research Ethics Notice (if applicable)',
];

export default function App() {
  return (
    <div className="privacy-app">
      <UsisPortalGate moduleKey="data_privacy" />
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader />
          <nav className="kit-nav" aria-label="Data privacy sections">
            <div className="kit-nav__grid">
              <a className="kit-nav__link kit-nav__link--active" href="#overview">Overview</a>
              <a className="kit-nav__link" href="#core-laws">Core Laws</a>
              <a className="kit-nav__link" href="#deped">DepEd Issuances</a>
              <a className="kit-nav__link" href="#required">Required Pages</a>
            </div>
          </nav>
        </div>
      </header>

      <main className="page-frame privacy-main">
        <div className="content-width">
          <section id="overview" className="section-shell privacy-hero">
            <h1>Data Privacy and Legal Compliance Framework</h1>
            <p>
              This subsystem consolidates the legal and policy references required for a DepEd-aligned school information system
              covering privacy notice, consent, declaration, data protection controls, and governance requirements.
            </p>
          </section>

          <section id="core-laws" className="section-shell">
            <h2>Core Philippine Laws and National Policies</h2>
            <div className="privacy-grid">
              {coreLaws.map((law) => (
                <article key={law.title} className="privacy-card">
                  <h3>{law.title}</h3>
                  <p>{law.summary}</p>
                  <ul>
                    {law.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section id="deped" className="section-shell">
            <h2>DepEd-Specific Policies and Issuances</h2>
            <div className="privacy-grid">
              {depedPolicies.map((item) => (
                <article key={item.title} className="privacy-card">
                  <h3>{item.title}</h3>
                  <p className="privacy-subtitle">{item.subtitle}</p>
                  <ul>
                    {item.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="section-shell">
            <h2>Module-Specific Compliance Notes</h2>
            <div className="privacy-card">
              <h3>Health, HR, and Financial Data Considerations</h3>
              <ul>
                <li>Health/clinic records must observe sensitive personal information safeguards under applicable health privacy policies.</li>
                <li>HR and employee records should align with Civil Service Commission and records management rules.</li>
                <li>Payment and collection modules should comply with COA retention and financial documentation requirements.</li>
              </ul>
            </div>
          </section>

          <section id="required" className="section-shell">
            <h2>Required Sections for Privacy and Declaration Pages</h2>
            <div className="privacy-grid">
              {requiredSections.map((section) => (
                <article key={section.title} className="privacy-card">
                  <h3>{section.title}</h3>
                  {section.quote ? <blockquote>{section.quote}</blockquote> : null}
                  {section.points ? (
                    <ul>
                      {section.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="section-shell">
            <h2>Strongly Recommended SIS Controls</h2>
            <div className="privacy-grid privacy-grid--three">
              <article className="privacy-card">
                <h3>Role-Based Access Control (RBAC)</h3>
                <ul>
                  <li>Registrar</li>
                  <li>Adviser</li>
                  <li>Guidance</li>
                  <li>Clinic</li>
                  <li>SSLG</li>
                  <li>Principal</li>
                  <li>Parents</li>
                  <li>Learners</li>
                </ul>
              </article>
              <article className="privacy-card">
                <h3>Audit Logging</h3>
                <ul>
                  <li>Record edits</li>
                  <li>Logins</li>
                  <li>Downloads</li>
                  <li>Enrollment changes</li>
                </ul>
              </article>
              <article className="privacy-card">
                <h3>Retention, Archiving, and Minor Consent</h3>
                <ul>
                  <li>Retention period by record type</li>
                  <li>Archiving and deletion triggers</li>
                  <li>Parent/guardian consent process for minors</li>
                </ul>
              </article>
            </div>
          </section>

          <section className="section-shell">
            <h2>Recommended Legal Footer Statement</h2>
            <article className="privacy-card">
              <blockquote>
                This system complies with the provisions of Republic Act No. 10173 (Data Privacy Act of 2012), relevant issuances
                of the National Privacy Commission, and applicable policies of the Department of Education regarding the protection
                and processing of learner and personnel information.
              </blockquote>
            </article>
          </section>

          <section className="section-shell">
            <h2>Recommended Additional Pages for a Full SIS</h2>
            <article className="privacy-card">
              <ul>
                {recommendedPages.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>
        </div>
      </main>

      <UsisGlobalFooter />
    </div>
  );
}
