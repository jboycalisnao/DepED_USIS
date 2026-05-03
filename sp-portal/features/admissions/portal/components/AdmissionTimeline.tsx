import type { AdmissionTimeline as Timeline } from '../types';

type AdmissionTimelineProps = {
  timeline: Timeline;
  isClosed: boolean;
};

export function AdmissionTimeline({ timeline, isClosed }: AdmissionTimelineProps) {
  return (
    <section className="section-shell">
      <div className="section-shell__header">
        <p className="section-shell__eyebrow">Admission Period Notice</p>
        <h2>Important Dates</h2>
      </div>
      {isClosed ? (
        <div className="notice-box notice-box--closed">
          <strong>Closed Admission</strong>
          <span>
            The application period for this school is currently closed. You may still view announcements and
            requirements.
          </span>
        </div>
      ) : null}
      <div className="timeline-grid">
        <article className="info-card">
          <div className="info-card__content">
            <p className="info-card__eyebrow">Application Period</p>
            <h3>{timeline.applicationPeriod}</h3>
          </div>
        </article>
        <article className="info-card">
          <div className="info-card__content">
            <p className="info-card__eyebrow">Entrance Examination</p>
            <h3>{timeline.entranceExamination}</h3>
          </div>
        </article>
        <article className="info-card">
          <div className="info-card__content">
            <p className="info-card__eyebrow">Results Posting</p>
            <h3>{timeline.resultsPosting}</h3>
          </div>
        </article>
      </div>
      <p className="section-note">Applications submitted outside the official period may not be accepted by the school.</p>
    </section>
  );
}
