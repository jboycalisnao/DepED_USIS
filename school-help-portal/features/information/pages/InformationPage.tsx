import { Link } from 'react-router-dom';
import { helpTicketCategories, schoolHelpTopics, schoolProfile, supportSteps } from '../../shared/data/schoolProfile';

export function InformationPage() {
  return (
    <section className="section-shell">
      <div className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <p className="page-intro__eyebrow">School Help Portal</p>
          <h1 className="school-help-portal-hero-title">Basic school information and learner assistance in one place.</h1>
          <p>
            Use this portal to read important school details, understand the most common support pathways, and submit a help ticket using your learner LRN.
          </p>
          <div className="school-help-portal-topic-pills">
            {helpTicketCategories.map((item) => (
              <span key={item} className="school-help-portal-topic-pill">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="section-grid">
        {schoolHelpTopics.map((topic) => (
          <article key={topic.title} className="section-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="school-help-portal-two-column">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <h3>School Details</h3>
            <p>
              <strong>{schoolProfile.name}</strong>
            </p>
            <p>{schoolProfile.address}</p>
            <p>Office Hours: {schoolProfile.officeHours}</p>
            <p>Contact No.: {schoolProfile.contactNo}</p>
            <p>Email: {schoolProfile.email}</p>
            <p>Help Window: {schoolProfile.helpWindow}</p>
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <h3>Before You Submit</h3>
            <ul>
              {supportSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <div className="form-actions school-help-portal-actions school-help-portal-actions--start">
              <Link className="primary-button" to="/submit-ticket">
                Submit a Ticket
              </Link>
              <Link className="secondary-button" to="/admin">
                Admin Access
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
