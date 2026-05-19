import { useMemo, useState } from 'react';
import { ClinicAssessmentForm } from './components/ClinicAssessmentForm';
import { ClinicQueueForm } from './components/ClinicQueueForm';
import { ClinicQueueList } from './components/ClinicQueueList';
import { ClinicRegistryFilters } from './components/ClinicRegistryFilters';
import { ClinicSummaryCards } from './components/ClinicSummaryCards';
import { ClinicVisitHistory } from './components/ClinicVisitHistory';
import { useClinicFlow } from './hooks/useClinicFlow';
import type { ClinicRegistryFilter } from './types';

const DEFAULT_FILTER: ClinicRegistryFilter = {
  query: '',
  disposition: 'All',
};

export function ClinicAdminPage() {
  const {
    queue,
    metrics,
    selectedQueueEntry,
    selectedQueueId,
    setSelectedQueueId,
    registerVisit,
    completeVisit,
    getFilteredHistory,
  } = useClinicFlow();

  const [filter, setFilter] = useState<ClinicRegistryFilter>(DEFAULT_FILTER);
  const filteredHistory = useMemo(() => getFilteredHistory(filter), [filter, getFilteredHistory]);

  return (
    <section className="support-page">
      <header className="support-page__header">
        <h2>Clinic Information System</h2>
        <p>
          End-to-end clinic records management for intake, vital signs, disposition tracking, and searchable visit registry.
        </p>
      </header>

      <ClinicSummaryCards metrics={metrics} />

      <div className="clinic-flow-grid">
        <ClinicQueueForm onSubmit={registerVisit} />
        <ClinicQueueList queue={queue} selectedQueueId={selectedQueueId} onSelect={setSelectedQueueId} />
        <ClinicAssessmentForm queueEntry={selectedQueueEntry} onComplete={completeVisit} />
      </div>

      <article className="support-note-box clinic-flow-card">
        <strong>Visit Registry Filters</strong>
        <ClinicRegistryFilters value={filter} onChange={setFilter} />
      </article>

      <ClinicVisitHistory visits={filteredHistory} />
    </section>
  );
}
