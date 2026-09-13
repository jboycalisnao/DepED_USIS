import { Link } from 'react-router-dom';

const actionCards = [
  {
    icon: 'note_add',
    title: 'Submit a ticket',
    description: 'Submit a new learner concern to the school helpdesk.',
    to: '/submit-ticket',
  },
  {
    icon: 'assignment',
    title: 'View tickets',
    description: 'Check ticket status through the learner portal help-ticket service.',
    to: 'https://portal.leonnhs.edu.ph/services/help-ticket',
    isExternal: true,
  },
];

const topArticles = [
  {
    title: 'How to submit a helpdesk ticket',
    category: 'Instructions',
    description: 'Open Submit a Ticket, enter the learner LRN, confirm the learner details, select the concern category, and describe the request clearly.',
  },
  {
    title: 'What information should be included',
    category: 'Ticket Preparation',
    description: 'Prepare the learner LRN, complete name, contact number, concern category, and a short explanation before sending the ticket.',
  },
  {
    title: 'How ticket follow-up works',
    category: 'Follow-up',
    description: 'Keep the generated reference number after submission. The school office may use it to locate the ticket during follow-up.',
  },
];

export function InformationPage() {
  return (
    <section className="section-shell school-help-portal-knowledgebase">
      <div className="school-help-portal-kb-hero">
        <p className="page-intro__eyebrow">School Helpdesk Portal</p>
        <h1>How can we help?</h1>
        <p>Find basic school helpdesk guidance or submit a learner concern using the learner LRN.</p>
      </div>

      <div className="school-help-portal-kb-actions" aria-label="Helpdesk actions">
        {actionCards.map((item) => (
          item.isExternal ? (
            <a key={item.title} className="school-help-portal-kb-action section-card" href={item.to} target="_blank" rel="noreferrer">
              <span className="school-help-portal-kb-action__icon material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
              <span className="school-help-portal-kb-action__body">
                <strong>
                  {item.title}
                  <span className="school-help-portal-kb-action__external-icon material-symbols-outlined" aria-hidden="true">
                    open_in_new
                  </span>
                </strong>
                <span>{item.description}</span>
              </span>
            </a>
          ) : (
          <Link key={item.title} className="school-help-portal-kb-action section-card" to={item.to}>
            <span className="school-help-portal-kb-action__icon material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span className="school-help-portal-kb-action__body">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </span>
          </Link>
          )
        ))}
      </div>

      <section className="school-help-portal-kb-section" id="knowledgebase" aria-labelledby="school-help-kb-title">
        <header className="school-help-portal-kb-heading">
          <span className="school-help-portal-kb-heading__icon material-symbols-outlined" aria-hidden="true">
            local_library
          </span>
          <div>
            <h2 id="school-help-kb-title">Knowledgebase & Announcements</h2>
            <p>Top articles for common learner helpdesk questions.</p>
          </div>
        </header>

        <div className="section-card school-help-portal-kb-article-panel">
          <div className="school-help-portal-kb-tab">Top articles</div>
          <div className="section-card__content school-help-portal-kb-articles">
            {topArticles.map((article) => (
              <article key={article.title} className="school-help-portal-kb-article">
                <span className="school-help-portal-kb-article__icon material-symbols-outlined" aria-hidden="true">
                  local_library
                </span>
                <div>
                  <h3>{article.title}</h3>
                  <p className="school-help-portal-kb-article__category">
                    Category: <span>{article.category}</span>
                  </p>
                  <p>{article.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="school-help-portal-kb-browse">
          <a className="secondary-button" href="#school-helpdesk-details">
            Browse Knowledgebase & Announcements
          </a>
        </div>
      </section>

    </section>
  );
}
