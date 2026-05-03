import type { ContactDetails } from '../types';

type ContactHelpDeskProps = {
  contact: ContactDetails;
};

export function ContactHelpDesk({ contact }: ContactHelpDeskProps) {
  return (
    <section className="section-shell" id="contact">
      <div className="section-shell__header">
        <p className="section-shell__eyebrow">School Contact and Help Desk</p>
        <h2>For Admissions Concerns</h2>
      </div>
      <article className="info-card contact-card">
        <div className="info-card__bar" />
        <div className="info-card__content">
          <h3>{contact.office}</h3>
          <dl className="contact-grid">
            <div>
              <dt>Email Address</dt>
              <dd>{contact.email}</dd>
            </div>
            <div>
              <dt>Contact Number</dt>
              <dd>{contact.phone}</dd>
            </div>
            <div>
              <dt>Office Hours</dt>
              <dd>{contact.officeHours}</dd>
            </div>
            <div>
              <dt>School Address</dt>
              <dd>{contact.address}</dd>
            </div>
          </dl>
        </div>
      </article>
    </section>
  );
}
