import { ComingSoonModalCard } from '../../components/ui/ComingSoonModalCard';

export function DocumentRequestsServicePage() {
  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Document Requests</h2>
          <p>Request registrar-issued documents and monitor processing status.</p>
        </header>
      </div>
      <ComingSoonModalCard message="Document request filing and tracking will be available on this page." />
    </section>
  );
}
