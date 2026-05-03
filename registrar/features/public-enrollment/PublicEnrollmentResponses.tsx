import { useState } from 'react';
import { getPublicEnrollmentResponses } from './storage';

export function PublicEnrollmentResponses() {
  const [copyState, setCopyState] = useState('Copy public link');
  const [responses, setResponses] = useState(() => getPublicEnrollmentResponses());
  const publicLink = `${window.location.origin}/public/enrollment`;

  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(publicLink);
    setCopyState('Link copied');
    window.setTimeout(() => setCopyState('Copy public link'), 1600);
  };

  return (
    <div className="section-card">
      <div className="section-card__content public-enrollment-responses">
        <div className="public-enrollment-responses__header">
          <div>
            <p className="section-card__eyebrow">Public Enrollment</p>
            <h3>Online Responses</h3>
          </div>
          <button className="secondary-button" type="button" onClick={copyPublicLink}>
            <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
            {copyState}
          </button>
          <button className="secondary-button" type="button" onClick={() => setResponses(getPublicEnrollmentResponses())}>
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            Refresh
          </button>
        </div>

        <div className="public-enrollment-responses__summary">
          <strong>{responses.length}</strong>
          <span>Total submitted responses</span>
        </div>

        {responses.length > 0 ? (
          <div className="public-enrollment-responses__list">
            {responses.slice(0, 6).map((response) => (
              <article key={response.id} className="public-enrollment-response">
                <div>
                  <h4>{response.lastName}, {response.firstName}</h4>
                  <p>{response.gradeLevelToEnroll} - {response.enrollmentType}</p>
                </div>
                <time dateTime={response.submittedAt}>
                  {new Date(response.submittedAt).toLocaleDateString()}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <div className="public-enrollment-responses__empty">
            <span className="material-symbols-outlined" aria-hidden="true">assignment</span>
            <p>No public enrollment responses yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
