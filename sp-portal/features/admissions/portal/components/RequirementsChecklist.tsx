type RequirementsChecklistProps = {
  requirements: string[];
};

export function RequirementsChecklist({ requirements }: RequirementsChecklistProps) {
  return (
    <section className="section-shell" id="requirements">
      <div className="section-shell__header">
        <p className="section-shell__eyebrow">Requirements Checklist</p>
        <h2>General Requirements</h2>
      </div>
      <article className="info-card">
        <div className="info-card__bar" />
        <div className="info-card__content">
          <ul className="checklist">
            {requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
          <p>The school may request original copies for verification during screening.</p>
        </div>
      </article>
    </section>
  );
}
