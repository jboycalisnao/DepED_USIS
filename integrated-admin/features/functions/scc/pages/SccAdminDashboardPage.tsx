import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import {
  loadIaSccOrganizations,
  loadIaSccRequests,
  loadTotalRegistrarTaggedCount,
} from '../services/iaSccService';
import type { IaSccOrganization, IaSccServiceRequest } from '../types';
import { SccRequestActionModal, type SccRequestModalMode } from '../modals/SccRequestActionModal';
import { SccCreateGoogleUserModal } from '../modals/SccCreateGoogleUserModal';
import {
  SccGoogleAccountSuccessModal,
  type SccGoogleAccountSuccessInfo,
} from '../modals/SccGoogleAccountSuccessModal';

type SccAdminDashboardPageProps = {
  coordinatorName: string;
};

export function SccAdminDashboardPage({ coordinatorName }: SccAdminDashboardPageProps) {
  const [orgs, setOrgs] = useState<IaSccOrganization[]>([]);
  const [requests, setRequests] = useState<IaSccServiceRequest[]>([]);
  const [taggedCount, setTaggedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalRequest, setModalRequest] = useState<IaSccServiceRequest | null>(null);
  const [modalMode, setModalMode] = useState<SccRequestModalMode>('view');
  const [isCreateGoogleUserOpen, setIsCreateGoogleUserOpen] = useState(false);
  const [googleSuccessInfo, setGoogleSuccessInfo] = useState<SccGoogleAccountSuccessInfo | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [orgList, reqList, totalTagged] = await Promise.all([
        loadIaSccOrganizations(),
        loadIaSccRequests(),
        loadTotalRegistrarTaggedCount(),
      ]);
      setOrgs(orgList);
      setRequests(reqList);
      setTaggedCount(totalTagged);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load SCC administration data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  if (isLoading) {
    return <UsisPageLoader message="Loading SCC Administration Dashboard..." variant="contained" />;
  }

  const activeOrgsCount = orgs.filter((o) => o.status === 'active').length;
  const pendingRequests = requests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review' || r.status === 'approved',
  );
  const provisionedCount = requests.filter((r) => r.status === 'provisioned').length;

  return (
    <div className="ia-scc-stack">
      {errorMsg ? (
        <div className="ia-scc-alert ia-scc-alert--danger" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <div className="ia-scc-kpi-grid">
        <article className="ia-scc-kpi-card">
          <span className="ia-scc-kpi-card__label">Recognized Clubs</span>
          <strong className="ia-scc-kpi-card__value">{activeOrgsCount}</strong>
          <small className="ia-scc-kpi-card__sub">{orgs.length} total registered</small>
        </article>

        <article className="ia-scc-kpi-card">
          <span className="ia-scc-kpi-card__label">Pending Review / Fulfillment</span>
          <strong className="ia-scc-kpi-card__value ia-scc-kpi-card__value--amber">
            {pendingRequests.length}
          </strong>
          <small className="ia-scc-kpi-card__sub">Service requests awaiting action</small>
        </article>

        <article className="ia-scc-kpi-card">
          <span className="ia-scc-kpi-card__label">Provisioned Services</span>
          <strong className="ia-scc-kpi-card__value ia-scc-kpi-card__value--green">
            {provisionedCount}
          </strong>
          <small className="ia-scc-kpi-card__sub">Mailboxes & digital passes active</small>
        </article>

        <article className="ia-scc-kpi-card">
          <span className="ia-scc-kpi-card__label">Registrar Tagged Officers</span>
          <strong className="ia-scc-kpi-card__value">{taggedCount}</strong>
          <small className="ia-scc-kpi-card__sub">Verified club officer taggings</small>
        </article>
      </div>

      <article className="ia-scc-panel">
        <header className="ia-scc-panel__header">
          <div>
            <h3>Pending Service Fulfillment Queue</h3>
            <p>Incoming requests from recognized organizations requiring review or provisioning.</p>
          </div>
          <div className="ia-scc-inline-tags">
            <button
              type="button"
              className="primary-btn"
              onClick={() => setIsCreateGoogleUserOpen(true)}
            >
              + Create Google User
            </button>
            <Link to="/functions/scc/google-accounts" className="secondary-btn">
              Manage Google Accounts
            </Link>
            <Link to="/functions/scc/requests" className="secondary-btn">
              Manage All Requests
            </Link>
          </div>
        </header>

        {pendingRequests.length === 0 ? (
          <div className="ia-scc-state-box">
            <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
            <h4>Queue Cleared</h4>
            <p>All submitted digital service requests have been processed.</p>
          </div>
        ) : (
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Organization</th>
                  <th>Service</th>
                  <th>Request Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.slice(0, 6).map((req) => (
                  <tr key={req.id}>
                    <td>
                      <code>{req.trackingNumber}</code>
                    </td>
                    <td>
                      <div className="ia-scc-cell-stack">
                        <strong>{req.organizationAcronym}</strong>
                        <small>{req.requesterName} ({req.requesterPosition})</small>
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
                      <span
                        className={`ia-status-tag ia-status-tag--${
                          req.status === 'approved'
                            ? 'info'
                            : req.status === 'under_review'
                              ? 'indigo'
                              : 'warning'
                        }`}
                      >
                        {req.status.replace('_', ' ')}
                      </span>
                    </td>
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
                          Inspect
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="ia-scc-panel">
        <header className="ia-scc-panel__header">
          <div>
            <h3>Recognized Organizations Overview</h3>
            <p>Active school clubs, teacher advisers, and @leonnhs.edu.ph institutional mailboxes.</p>
          </div>
          <Link to="/functions/scc/organizations" className="secondary-btn">
            Organizations & Rosters
          </Link>
        </header>

        <div className="ia-scc-org-cards">
          {orgs.slice(0, 6).map((org) => (
            <div key={org.id} className="ia-scc-org-card">
              <div className="ia-scc-org-card__top">
                <span className="ia-status-tag ia-status-tag--indigo">{org.acronym}</span>
                <span
                  className={`ia-status-tag ia-status-tag--${
                    org.status === 'active' ? 'success' : org.status === 'pending' ? 'warning' : 'neutral'
                  }`}
                >
                  {org.status}
                </span>
              </div>
              <h4>{org.name}</h4>
              <p className="ia-scc-org-card__meta">Adviser: {org.adviserName || 'Unassigned'}</p>
              <p className="ia-scc-org-card__meta">
                Mailbox:{' '}
                <code>{org.officialEmail ? org.officialEmail : 'Not yet provisioned'}</code>
              </p>
              <div className="ia-scc-org-card__footer">
                <span>{org.officerCount || 0} tagged officers</span>
                <span>{org.activeRequestsCount || 0} active requests</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <SccRequestActionModal
        request={modalRequest}
        mode={modalMode}
        reviewerName={coordinatorName}
        onClose={() => setModalRequest(null)}
        onUpdated={(updated) => {
          setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          void loadAll();
        }}
        onGoogleSuccess={(info) => setGoogleSuccessInfo(info)}
      />

      <SccCreateGoogleUserModal
        isOpen={isCreateGoogleUserOpen}
        organizations={orgs}
        onClose={() => setIsCreateGoogleUserOpen(false)}
        onCreated={() => {
          void loadAll();
        }}
        onSuccess={(info) => setGoogleSuccessInfo(info)}
      />

      <SccGoogleAccountSuccessModal
        info={googleSuccessInfo}
        onClose={() => setGoogleSuccessInfo(null)}
      />
    </div>
  );
}
