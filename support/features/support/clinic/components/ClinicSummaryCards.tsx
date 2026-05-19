import type { ClinicDisposition } from '../types';

type ClinicSummaryCardsProps = {
  metrics: {
    queued: number;
    completedToday: number;
    totalRecords: number;
    referredCount: number;
  };
};

export const CLINIC_DISPOSITIONS: ClinicDisposition[] = [
  'Returned to Class',
  'Sent Home',
  'Referred to Hospital',
  'For Follow-up',
];

export function ClinicSummaryCards({ metrics }: ClinicSummaryCardsProps) {
  return (
    <div className="support-card-grid">
      <article className="support-card">
        <h3>Queue Today</h3>
        <p>{metrics.queued} learner(s) awaiting assessment.</p>
      </article>
      <article className="support-card">
        <h3>Completed Today</h3>
        <p>{metrics.completedToday} clinic visit(s) completed today.</p>
      </article>
      <article className="support-card">
        <h3>Total Records</h3>
        <p>{metrics.totalRecords} visit record(s) in registry.</p>
      </article>
      <article className="support-card">
        <h3>Hospital Referrals</h3>
        <p>{metrics.referredCount} learner(s) referred to hospital.</p>
      </article>
    </div>
  );
}
