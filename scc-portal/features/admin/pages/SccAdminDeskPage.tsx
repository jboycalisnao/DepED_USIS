import React, { useEffect, useMemo, useState } from 'react';
import type { SccSession, SccServiceRequest } from '../../../types';
import { fetchSccRequests, updateSccRequestStatus } from '../../../services/sccSupabase';
import { ProvisionServiceModal } from '../modals/ProvisionServiceModal';
import { ViewServiceRequestModal } from '../../requests/modals/ViewServiceRequestModal';
import { UsisSearchInput } from '../../../../common/components/ui/UsisSearchInput';

interface SccAdminDeskPageProps {
  session: SccSession;
}

export function SccAdminDeskPage({ session }: SccAdminDeskPageProps) {
  const [requests, setRequests] = useState<SccServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [provisionRequest, setProvisionRequest] = useState<SccServiceRequest | null>(null);
  const [viewRequest, setViewRequest] = useState<SccServiceRequest | null>(null);

  const loadAllRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSccRequests();
      setRequests(data);
    } catch (e) {
      console.warn('Failed to load coordinator requests:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter(
      (r) =>
        r.trackingNumber.toLowerCase().includes(q) ||
        r.organizationName.toLowerCase().includes(q) ||
        r.organizationAcronym.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q),
    );
  }, [requests, searchQuery]);

  const handleApprove = async (req: SccServiceRequest) => {
    try {
      const updated = await updateSccRequestStatus(req.id, {
        status: 'approved',
        reviewerRemarks: 'Endorsed and approved for ICT provisioning.',
        reviewedBy: session.fullName,
      });
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      console.warn('Failed to approve request:', e);
    }
  };

  const handleReject = async (req: SccServiceRequest) => {
    const reason = window.prompt('Please specify the reason for rejecting this request:');
    if (!reason) return;

    try {
      const updated = await updateSccRequestStatus(req.id, {
        status: 'rejected',
        reviewerRemarks: `Rejected: ${reason}`,
        reviewedBy: session.fullName,
      });
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      console.warn('Failed to reject request:', e);
    }
  };

  return (
    <div className="scc-page-container">
      <div className="scc-page-header">
        <div>
          <h2 className="scc-page-title">Coordinator Review & Provisioning Desk</h2>
          <p className="scc-page-subtitle">
            Review incoming requests from school clubs, endorse digital access, and provision institutional DepEd accounts.
          </p>
        </div>
      </div>

      <div className="scc-card">
        <div className="scc-card__header">
          <div>
            <h3 className="scc-card__title">All School Club & Organization Requests</h3>
            <p className="scc-card__desc">Review and provision incoming tickets across all registered organizations</p>
          </div>
          <span className="scc-badge scc-badge--info">{filteredRequests.length} Submissions</span>
        </div>

        <div className="scc-toolbar">
          <div className="scc-toolbar__search">
            <UsisSearchInput
              ariaLabel="Search all coordinator requests"
              label="Search requests by club or tracking #..."
              placeholder="Search club, tracking #, or title"
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="scc-empty-state">
            <span className="material-symbols-outlined scc-spin">sync</span>
            <p>Loading incoming requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="scc-empty-state">
            <span className="material-symbols-outlined">inbox</span>
            <h4>No Requests in Queue</h4>
            <p>{searchQuery ? 'No requests match your search criteria.' : 'No club has submitted a service request yet.'}</p>
          </div>
        ) : (
          <div className="scc-table-responsive">
            <table className="scc-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Club / Organization</th>
                  <th>Service Requested</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td><strong className="scc-code">{req.trackingNumber}</strong></td>
                    <td>
                      <div className="scc-cell-stack">
                        <strong>{req.organizationAcronym}</strong>
                        <small className="scc-muted">{req.requesterName}</small>
                      </div>
                    </td>
                    <td>{req.serviceTitle}</td>
                    <td><span className="scc-title-cell" title={req.title}>{req.title}</span></td>
                    <td>
                      {req.status === 'provisioned' ? (
                        <span className="scc-badge scc-badge--success">Provisioned</span>
                      ) : req.status === 'approved' ? (
                        <span className="scc-badge scc-badge--info">Approved</span>
                      ) : req.status === 'rejected' ? (
                        <span className="scc-badge scc-badge--danger">Rejected</span>
                      ) : (
                        <span className="scc-badge scc-badge--pending">Pending</span>
                      )}
                    </td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="scc-action-group">
                        <button
                          type="button"
                          className="scc-btn scc-btn--sm scc-btn--secondary"
                          onClick={() => setViewRequest(req)}
                        >
                          View
                        </button>
                        {req.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="scc-btn scc-btn--sm scc-btn--secondary"
                              onClick={() => handleApprove(req)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="scc-btn scc-btn--sm scc-btn--danger"
                              onClick={() => handleReject(req)}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {req.status === 'approved' || req.status === 'pending' ? (
                          <button
                            type="button"
                            className="scc-btn scc-btn--sm scc-btn--primary"
                            onClick={() => setProvisionRequest(req)}
                          >
                            Provision
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProvisionServiceModal
        request={provisionRequest}
        session={session}
        onClose={() => setProvisionRequest(null)}
        onUpdated={(updated) => {
          setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        }}
      />

      <ViewServiceRequestModal
        request={viewRequest}
        onClose={() => setViewRequest(null)}
      />
    </div>
  );
}
