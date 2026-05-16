import { ComingSoonModalCard } from '../components/ui/ComingSoonModalCard';

export function GradesPage() {
  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Grades</h2>
          <p>View published quarterly and semester grade summaries.</p>
        </header>
      </div>
      <ComingSoonModalCard message="Grade viewing is being connected to registrar-published records." />
    </section>
  );
}
