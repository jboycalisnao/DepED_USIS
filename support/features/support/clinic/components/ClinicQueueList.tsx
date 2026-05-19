import type { ClinicQueueEntry } from '../types';
import { formatClinicDateTime } from '../utils/clinicFormatters';

type ClinicQueueListProps = {
  queue: ClinicQueueEntry[];
  selectedQueueId: string | null;
  onSelect: (queueId: string) => void;
};

export function ClinicQueueList({ queue, selectedQueueId, onSelect }: ClinicQueueListProps) {
  return (
    <article className="support-note-box clinic-flow-card">
      <strong>Step 2: Queue and triage</strong>
      {queue.length === 0 ? (
        <span>No learners currently queued for clinic assessment.</span>
      ) : (
        <ul className="clinic-queue-list">
          {queue.map((entry) => {
            const isActive = entry.id === selectedQueueId;
            return (
              <li key={entry.id}>
                <button type="button" className={`clinic-queue-item ${isActive ? 'clinic-queue-item--active' : ''}`} onClick={() => onSelect(entry.id)}>
                  <span className="clinic-queue-item__name">{entry.learnerName}</span>
                  <span>LRN: {entry.learnerLrn}</span>
                  <span>{entry.sex}, {entry.age} years old | {entry.gradeSection}</span>
                  <span>Referred by: {entry.referredBy}</span>
                  <span>{entry.concern}</span>
                  <span className="clinic-queue-item__time">Queued: {formatClinicDateTime(entry.queuedAt)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
