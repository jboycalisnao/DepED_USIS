import { useEffect, useMemo, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  fetchLearnerIdRequests,
  loadActiveIdOrderPeriod,
  loadLearnerIdServiceAvailability,
  placeLearnerIdRequest,
  type LearnerIdOrderPeriodRecord,
  type LearnerIdRequestRecord,
} from '../../services/learnerIdService';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';

type IdServicePageProps = {
  session: LearnerPortalAccessRecord;
};

const normalizeStatus = (value: string) => String(value || '').trim().toLowerCase();

const formatStatusLabel = (value: string) =>
  String(value || '')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Pending';

const getStatusClassName = (value: string) => {
  const normalized = normalizeStatus(value);
  if (normalized === 'done') return 'learner-id-status-chip learner-id-status-chip--done';
  if (normalized === 'released') return 'learner-id-status-chip learner-id-status-chip--released';
  if (normalized === 'for correction') return 'learner-id-status-chip learner-id-status-chip--correction';
  return 'learner-id-status-chip learner-id-status-chip--pending';
};

export function IdServicePage({ session }: IdServicePageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<LearnerIdOrderPeriodRecord | null>(null);
  const [requests, setRequests] = useState<LearnerIdRequestRecord[]>([]);
  const [notes, setNotes] = useState('');
  const [isIdPublished, setIsIdPublished] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextActivePeriod, nextRequests, availability] = await Promise.all([
        loadActiveIdOrderPeriod(),
        fetchLearnerIdRequests({
          learnerId: session.learnerId,
          learnerLrn: session.lrn,
        }),
        loadLearnerIdServiceAvailability(),
      ]);
      setActivePeriod(nextActivePeriod);
      setRequests(nextRequests);
      setIsIdPublished(Boolean(availability.isPublished));
    } catch (loadError: any) {
      console.error('Learner portal ID service load failed:', loadError);
      setError(loadError?.message || 'Unable to load ID orders.');
      setIsIdPublished(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [session.learnerId, session.lrn]);

  const currentRequest = useMemo(
    () => requests.find((request) => request.orderPeriodId && activePeriod?.id && request.orderPeriodId === activePeriod.id) || null,
    [activePeriod?.id, requests],
  );

  const canRequest = Boolean(activePeriod?.id) && isIdPublished && !currentRequest;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isIdPublished) {
      setAlert({ title: 'Unavailable', message: 'The ID service is not published yet in Merch Control.', tone: 'danger' });
      return;
    }
    if (!activePeriod) {
      setAlert({ title: 'No Valid Period', message: 'There is no valid ID order period right now.', tone: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      await placeLearnerIdRequest({
        learnerId: session.learnerId,
        learnerLrn: session.lrn,
        learnerName: session.learnerName,
        notes,
      });
      setNotes('');
      await refresh();
      setAlert({ title: 'Order Sent', message: 'Your ID order has been submitted.', tone: 'success' });
    } catch (submitError: any) {
      setAlert({ title: 'Order Failed', message: submitError?.message || 'Unable to submit your ID order.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <UsisPageLoader message="Loading ID order service..." />;

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>ID</h2>
          <p>Place a learner ID order during a valid order period.</p>
        </header>
      </div>

      {error ? <p className="learner-services-history__state">{error}</p> : null}
      {!error && !isIdPublished ? (
        <p className="learner-services-history__state">The ID service is not published yet in Merch Control.</p>
      ) : null}

      {!error ? (
        <section className="learner-services-history">
          <header className="learner-services-history__header">
            <h3>Order Form</h3>
            <p>
              {!isIdPublished
                ? 'This service is currently unavailable.'
                : activePeriod
                ? `Valid order period: ${activePeriod.label}`
                : 'No valid order period is available right now.'}
            </p>
          </header>

          {currentRequest ? (
            <p className="learner-services-history__state">
              You already have an ID order for {activePeriod?.label || 'the active period'} with status{' '}
              <span className={getStatusClassName(currentRequest.orderStatus)}>
                {formatStatusLabel(currentRequest.orderStatus)}
              </span>
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="registry-form">
            <label className="floating-field">
              <div className="floating-field__control">
                <textarea
                  placeholder=" "
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={!canRequest || isSubmitting}
                  aria-label="ID order notes"
                />
                <span>Notes or special instructions (optional)</span>
              </div>
            </label>

            <div className="modal-dialog__actions" style={{ justifyContent: 'flex-start', padding: 0 }}>
              <button type="submit" className="primary-button" disabled={!canRequest || isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Place ID Order'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!error ? (
        <section className="learner-services-history">
          <header className="learner-services-history__header">
            <h3>Order History</h3>
            <p>Your ID orders and their current processing status.</p>
          </header>
          {requests.length === 0 ? (
            <p className="learner-services-history__state">No ID orders found yet.</p>
          ) : (
            <div className="learner-merch-orders-table-wrap">
              <table className="learner-merch-orders-table" aria-label="ID order history">
                <thead>
                  <tr>
                    <th>Reference No.</th>
                    <th>Order Period</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.referenceNo || '-'}</td>
                      <td>{request.orderPeriodLabel || '-'}</td>
                      <td>
                        <span className={getStatusClassName(request.orderStatus)}>
                          {formatStatusLabel(request.orderStatus)}
                        </span>
                      </td>
                      <td>{request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}</td>
                      <td>{request.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
