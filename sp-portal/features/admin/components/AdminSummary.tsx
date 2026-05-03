type AdminSummaryProps = {
  stats: {
    accepted: number;
    closedPortals: number;
    openPortals: number;
    reviewed: number;
    submitted: number;
    totalApplications: number;
    totalPortals: number;
  };
};

export function AdminSummary({ stats }: AdminSummaryProps) {
  const items = [
    { label: 'Applications', value: stats.totalApplications },
    { label: 'Submitted', value: stats.submitted },
    { label: 'Reviewed', value: stats.reviewed },
    { label: 'Accepted', value: stats.accepted },
    { label: 'Open Portals', value: stats.openPortals },
    { label: 'Closed Portals', value: stats.closedPortals },
  ];

  return (
    <div className="admin-summary-grid">
      {items.map((item) => (
        <article className="info-card admin-summary-card" key={item.label}>
          <div className="info-card__content">
            <p className="info-card__eyebrow">{item.label}</p>
            <strong>{item.value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}
