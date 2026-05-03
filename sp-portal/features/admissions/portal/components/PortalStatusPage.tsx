type PortalStatusPageProps = {
  eyebrow: string;
  title: string;
  message: string;
};

export function PortalStatusPage({ eyebrow, title, message }: PortalStatusPageProps) {
  return (
    <section className="portal-status info-card">
      <div className="info-card__bar" />
      <div className="info-card__content">
        <p className="info-card__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </section>
  );
}
