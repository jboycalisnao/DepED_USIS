import type { Bulletin } from '../types';

type BulletinBoardProps = {
  bulletins: Bulletin[];
};

export function BulletinBoard({ bulletins }: BulletinBoardProps) {
  return (
    <section className="section-shell" id="bulletins">
      <div className="section-shell__header">
        <p className="section-shell__eyebrow">Official Bulletin Board</p>
        <h2>School Notices</h2>
      </div>
      <div className="bulletin-list">
        {bulletins.map((bulletin) => (
          <article className="info-card bulletin-card" key={bulletin.id}>
            <div className="info-card__bar" />
            <div className="info-card__content">
              <div className="bulletin-card__meta">
                <span>{bulletin.datePosted}</span>
                <span>{bulletin.category}</span>
              </div>
              <h3>{bulletin.title}</h3>
              <p>{bulletin.text}</p>
              {bulletin.attachmentUrl ? (
                <a className="portal-link" href={bulletin.attachmentUrl}>
                  {bulletin.attachmentLabel || 'Download attachment'}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
