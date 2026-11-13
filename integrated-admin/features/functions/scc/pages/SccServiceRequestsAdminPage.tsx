import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import { loadIaSccOrganizations, loadIaSccRequests } from '../services/iaSccService';
import type {
  IaSccOrganization,
  IaSccRequestStatus,
  IaSccServiceRequest,
} from '../types';
import { SccRequestActionModal, type SccRequestModalMode } from '../modals/SccRequestActionModal';
import { SccDeleteRequestModal } from '../modals/SccDeleteRequestModal';
import {
  SccGoogleAccountSuccessModal,
  type SccGoogleAccountSuccessInfo,
} from '../modals/SccGoogleAccountSuccessModal';

type SccServiceRequestsAdminPageProps = {
  coordinatorName: string;
};

const STATUS_FILTERS: Array<{ label: string; value: 'all' | IaSccRequestStatus }> = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Provisioned', value: 'provisioned' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_LABELS: Record<IaSccRequestStatus, { label: string; tone: string }> = {
  pending: { label: 'Pending', tone: 'warning' },
  under_review: { label: 'Under Review', tone: 'indigo' },
  approved: { label: 'Approved', tone: 'info' },
  provisioned: { label: 'Provisioned', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export function SccServiceRequestsAdminPage({ coordinatorName }: SccServiceRequestsAdminPageProps) {
  const [requests, setRequests] = useState<IaSccServiceRequest[]>([]);
  const [organizations, setOrganizations] = useState<IaSccOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | IaSccRequestStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalRequest, setModalRequest] = useState<IaSccServiceRequest | null>(null);
  const [modalMode, setModalMode] = useState<SccRequestModalMode>('view');
  const [deleteTarget, setDeleteTarget] = useState<IaSccServiceRequest | null>(null);
  const [googleSuccessInfo, setGoogleSuccessInfo] = useState<SccGoogleAccountSuccessInfo | null>(null);
  const [notifyAlert, setNotifyAlert] = useState<{
    open: boolean;
    title: string;
    message: string;
    tone: 'success' | 'warning';
  }>({ open: false, title: '', message: '', tone: 'success' });

  const fetchRequests = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [data, orgs] = await Promise.all([
        loadIaSccRequests(),
        loadIaSccOrganizations().catch(() => [] as IaSccOrganization[]),
      ]);
      setRequests(data);
      setOrganizations(orgs);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load SCC service requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (!q) return true;
      return [
        req.trackingNumber,
        req.organizationName,
        req.organizationAcronym,
        req.requesterName,
        req.serviceTitle,
        req.title,
      ]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [requests, searchQuery, statusFilter]);

  if (isLoading) {
    return <UsisPageLoader message="Loading SCC Service Requests..." variant="contained" />;
  }

  return (
    <div className="ia-scc-stack">
      <article className="ia-scc-panel">
        <header className="ia-scc-panel__header">
          <div>
            <h3>Digital Service Requests Queue</h3>
            <p>
              Review incoming requests from student organizations, verify adviser endorsements, and
              provision official <code>@leonnhs.edu.ph</code> mailboxes and digital tools.
            </p>
          </div>
          <span className="ia-status-tag ia-status-tag--info">
            {filteredRequests.length} {filteredRequests.length === 1 ? 'Request' : 'Requests'}
          </span>
        </header>

        {errorMsg ? (
          <div className="ia-scc-alert ia-scc-alert--danger" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <span>{errorMsg}</span>
          </div>
        ) : null}

        <div className="ia-scc-toolbar">
          <label className="floating-field ia-scc-toolbar__search">
            <input
              type="search"
              placeholder=" "
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span>Search tracking #, club, requester, or title</span>
          </label>

          <UsisSearchableSelect
            ariaLabel="Filter by Status"
            className="ia-scc-toolbar__select"
            floatingLabel
            label="Filter by Status"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as 'all' | IaSccRequestStatus)}
            options={STATUS_FILTERS}
          />

          <button type="button" className="secondary-btn" onClick={() => void fetchRequests()}>
            Refresh
          </button>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="ia-scc-state-box">
            <span className="material-symbols-outlined" aria-hidden="true">inbox</span>
            <h4>No Matching Service Requests</h4>
            <p>
              {searchQuery || statusFilter !== 'all'
                ? 'Adjust your search query or status filter to view more submissions.'
                : 'No club has submitted a digital service request yet.'}
            </p>
          </div>
        ) : (
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Organization & Requester</th>
                  <th>Service</th>
                  <th>Purpose / Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const statusMeta = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
                  return (
                    <tr key={req.id}>
                      <td>
                        <code>{req.trackingNumber}</code>
                      </td>
                      <td>
                        <div className="ia-scc-cell-stack">
                          <strong>{req.organizationAcronym}</strong>
                          <small>
                            {req.requesterName} ({req.requesterPosition})
                          </small>
                        </div>
                      </td>
                      <td>{req.serviceTitle}</td>
                      <td>{req.title}</td>
                      <td>
                        <span className="ia-status-tag ia-status-tag--neutral">
                          {req.priority.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`ia-status-tag ia-status-tag--${statusMeta.tone}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="ia-scc-table-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setModalRequest(req);
                              setModalMode('view');
                            }}
                          >
                            Details
                          </button>
                          {req.status !== 'provisioned' && req.status !== 'rejected' ? (
                            <button
                              type="button"
                              className="primary-btn"
                              onClick={() => {
                                setModalRequest(req);
                                setModalMode('provision');
                              }}
                            >
                              Provision
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="secondary-btn ia-scc-btn--danger"
                            onClick={() => setDeleteTarget(req)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <SccRequestActionModal
        request={modalRequest}
        mode={modalMode}
        reviewerName={coordinatorName}
        organizations={organizations}
        onClose={() => setModalRequest(null)}
        onUpdated={(updated) => {
          setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }}
        onRequestDelete={(target) => setDeleteTarget(target)}
        onGoogleSuccess={(info) => setGoogleSuccessInfo(info)}
        onNotifyOutcome={(outcome) => {
          setNotifyAlert({
            open: true,
            title: outcome.error
              ? `Request ${outcome.trackingNumber} Updated (Email Warning)`
              : `Officer Notification Sent (${outcome.trackingNumber})`,
            message: outcome.error
              ? `Request updated to ${outcome.statusLabel}, but email delivery reported: ${outcome.error}`
              : `Email notification for ${outcome.statusLabel} status was sent to: ${outcome.sentTo.join(', ')}${
                  outcome.ccSent && outcome.ccSent.length > 0
                    ? ` (CC: ${outcome.ccSent.join(', ')})`
                    : ''
                }.`,
            tone: outcome.error ? 'warning' : 'success',
          });
        }}
      />

      <SccDeleteRequestModal
        request={deleteTarget}
        coordinatorName={coordinatorName}
        onClose={() => setDeleteTarget(null)}
        onDeleted={({ request: deletedReq, deletedEmail, removedFromGoogleAdmin }) => {
          setRequests((prev) => prev.filter((item) => item.id !== deletedReq.id));
          setNotifyAlert({
            open: true,
            title: `Request ${deletedReq.trackingNumber} Deleted`,
            message: deletedEmail
              ? `Service request ${deletedReq.trackingNumber} was permanently deleted${
                  removedFromGoogleAdmin
                    ? `, and associated Google Workspace account ${deletedEmail} was removed from Google Admin and organization records.`
                    : `, and associated mailbox ${deletedEmail} was cleared from system organization records.`
                }`
              : `Service request ${deletedReq.trackingNumber} was permanently deleted from system records.`,
            tone: 'success',
          });
        }}
      />

      <SccGoogleAccountSuccessModal
        info={googleSuccessInfo}
        onClose={() => setGoogleSuccessInfo(null)}
      />

      <UsisAlertModal
        open={notifyAlert.open}
        title={notifyAlert.title}
        message={notifyAlert.message}
        tone={notifyAlert.tone}
        confirmLabel="OK"
        onClose={() => setNotifyAlert((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
