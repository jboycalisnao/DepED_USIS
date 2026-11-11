import React, { useEffect, useMemo, useState } from 'react';
import type { SccSession, SccServiceRequest, SccRequestStatus } from '../../../types';
import { fetchSccRequests } from '../../../services/sccSupabase';
import { CreateServiceRequestModal } from '../modals/CreateServiceRequestModal';
import { ViewServiceRequestModal } from '../modals/ViewServiceRequestModal';
import { UsisSearchInput } from '../../../../common/components/ui/UsisSearchInput';

interface SccRequestsPageProps {
  session: SccSession;
}

export function SccRequestsPage({ session }: SccRequestsPageProps) {
  const [requests, setRequests] = useState<SccServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | SccRequestStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SccServiceRequest | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSccRequests(session.isCoordinator ? undefined : session.organizationId);
      setRequests(data);
    } catch (err) {
      console.warn('Failed to load requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [session.organizationId, session.isCoordinator]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.trackingNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.serviceTitle.toLowerCase().includes(q) ||
          r.organizationName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  const renderStatusBadge = (status: SccRequestStatus) => {
    switch (status) {
      case 'provisioned':
        return <span className="scc-badge scc-badge--success">Provisioned</span>;
      case 'approved':
        return <span className="scc-badge scc-badge--info">Approved</span>;
      case 'under_review':
        return <span className="scc-badge scc-badge--warning">Under Review</span>;
      case 'rejected':
        return <span className="scc-badge scc-badge--danger">Rejected</span>;
      default:
        return <span className="scc-badge scc-badge--pending">Pending</span>;
    }
  };

  return (
    <div className="scc-page-container">
      <div className="scc-page-header">
        <div>
          <h2 className="scc-page-title">Digital Service Requests</h2>
          <p className="scc-page-subtitle">
            Track institutional email provisioning, shared drives, event passes, and digital service tickets.
          </p>
        </div>
        <button
          type="button"
          className="scc-btn scc-btn--primary"
          onClick={() => setIsCreateOpen(true)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          New Service Request
        </button>
      </div>

      {/* Toolbar / Search / Filter */}
      <div className="scc-toolbar">
        <div className="scc-toolbar__search">
          <UsisSearchInput
            ariaLabel="Search by tracking number, title, or service"
            label="Search requests..."
            placeholder="Tracking #, title, or service"
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <div className="scc-filter-tabs">
          {(['all', 'pending', 'under_review', 'approved', 'provisioned', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`scc-filter-tab ${statusFilter === st ? 'scc-filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all'
                ? 'All Requests'
                : st.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="scc-card">
        {isLoading ? (
          <div className="scc-empty-state">
            <span className="material-symbols-outlined scc-spin">sync</span>
            <p>Loading digital service requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="scc-empty-state">
            <span className="material-symbols-outlined">inbox</span>
            <h4>No Service Requests Found</h4>
            <p>
              {searchQuery || statusFilter !== 'all'
                ? 'No requests match your current search and status filters.'
                : 'Your organization has not submitted any service requests yet.'}
            </p>
            <button
              type="button"
              className="scc-btn scc-btn--primary"
              onClick={() => setIsCreateOpen(true)}
            >
              Submit Your First Request
            </button>
          </div>
        ) : (
          <div className="scc-table-responsive">
            <table className="scc-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Service Requested</th>
                  <th>Title / Purpose</th>
                  {session.isCoordinator ? <th>Organization</th> : null}
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <strong className="scc-code">{req.trackingNumber}</strong>
                    </td>
                    <td>
                      <div className="scc-cell-stack">
                        <strong>{req.serviceTitle}</strong>
                        <small className="scc-muted">{req.requesterName} ({req.requesterPosition})</small>
                      </div>
                    </td>
                    <td>
                      <span className="scc-title-cell" title={req.title}>
                        {req.title}
                      </span>
                    </td>
                    {session.isCoordinator ? (
                      <td>
                        <span className="scc-pill scc-pill--subtle">{req.organizationAcronym}</span>
                      </td>
                    ) : null}
                    <td>
                      <span className={`scc-priority-pill scc-priority-pill--${req.priority}`}>
                        {req.priority.toUpperCase()}
                      </span>
                    </td>
                    <td>{renderStatusBadge(req.status)}</td>
                    <td>
                      <span className="scc-date-cell">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="scc-btn scc-btn--sm scc-btn--secondary"
                        onClick={() => setSelectedRequest(req)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateServiceRequestModal
        isOpen={isCreateOpen}
        session={session}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          loadRequests();
        }}
      />

      <ViewServiceRequestModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}
