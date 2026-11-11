import React, { useEffect, useState } from 'react';
import type { SccSession, SccServiceRequest, SccOrganization, SccServiceKey } from '../../../types';
import { fetchSccRequests, fetchSccOrganizations, fetchSccOfficers } from '../../../services/sccSupabase';
import { SCC_DIGITAL_SERVICES } from '../../services/constants';
import { CreateServiceRequestModal } from '../../requests/modals/CreateServiceRequestModal';
import { ViewServiceRequestModal } from '../../requests/modals/ViewServiceRequestModal';

interface SccDashboardPageProps {
  session: SccSession;
  onNavigateToRequests: () => void;
  onNavigateToServices: () => void;
  onNavigateToRoster: () => void;
}

export function SccDashboardPage({
  session,
  onNavigateToRequests,
  onNavigateToServices,
  onNavigateToRoster,
}: SccDashboardPageProps) {
  const [requests, setRequests] = useState<SccServiceRequest[]>([]);
  const [org, setOrg] = useState<SccOrganization | null>(null);
  const [officerCount, setOfficerCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedServiceKey, setSelectedServiceKey] = useState<SccServiceKey>('email_account');
  const [viewRequest, setViewRequest] = useState<SccServiceRequest | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqData, orgData, offList] = await Promise.all([
        fetchSccRequests(session.isCoordinator ? undefined : session.organizationId),
        fetchSccOrganizations(),
        fetchSccOfficers(session.organizationId, session.organizationAcronym, session.organizationName),
      ]);
      setRequests(reqData);
      const matchedOrg = orgData.find((o) => o.id === session.organizationId) || null;
      setOrg(matchedOrg);
      setOfficerCount(offList.length);
    } catch (e) {
      console.warn('Dashboard data fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.organizationId, session.organizationAcronym]);

  const activeCount = requests.filter((r) => r.status === 'pending' || r.status === 'under_review').length;
  const provisionedCount = requests.filter((r) => r.status === 'provisioned').length;

  const handleLaunchRequest = (serviceKey: SccServiceKey) => {
    setSelectedServiceKey(serviceKey);
    setIsCreateOpen(true);
  };

  return (
    <div className="scc-dashboard">
      {/* Identity Banner */}
      <section className="scc-identity-banner">
        <div className="scc-identity-banner__content">
          <div className="scc-identity-banner__badge">
            <span className="material-symbols-outlined scc-identity-banner__icon">diversity_3</span>
          </div>
          <div className="scc-identity-banner__details">
            <div className="scc-identity-banner__tags">
              <span className="scc-pill scc-pill--accent">{session.organizationAcronym}</span>
              <span className="scc-pill scc-pill--subtle">School ID: {session.schoolId}</span>
              <span className="scc-pill scc-pill--subtle">SY 2026-2027</span>
            </div>
            <h2 className="scc-identity-banner__name">{session.organizationName}</h2>
            <p className="scc-identity-banner__sub">
              Logged in as: <strong>{session.fullName}</strong> ({session.role === 'club_president' ? 'President' : session.role === 'scc_coordinator' ? 'Council Coordinator' : 'Executive Officer'}) • Adviser: <strong>{org?.adviserName || session.adviserName}</strong>
            </p>
          </div>
        </div>

        <div className="scc-identity-banner__actions">
          <button
            type="button"
            className="scc-btn scc-btn--primary"
            onClick={() => handleLaunchRequest('email_account')}
          >
            <span className="material-symbols-outlined">mark_email_read</span>
            Request Official Email
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="scc-stats-grid">
        <div className="scc-stat-card">
          <div className="scc-stat-card__icon scc-stat-card__icon--blue">
            <span className="material-symbols-outlined">mail</span>
          </div>
          <div className="scc-stat-card__info">
            <span className="scc-stat-card__label">Institutional Email</span>
            <strong className="scc-stat-card__value scc-stat-card__value--sm">
              {org?.officialEmail ? org.officialEmail : 'Not Yet Provisioned'}
            </strong>
            <small className="scc-stat-card__hint">
              {org?.officialEmail ? 'Official DepEd Google Workspace Active' : 'Submit request to provision'}
            </small>
          </div>
        </div>

        <div className="scc-stat-card" onClick={onNavigateToRequests} style={{ cursor: 'pointer' }}>
          <div className="scc-stat-card__icon scc-stat-card__icon--amber">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div className="scc-stat-card__info">
            <span className="scc-stat-card__label">Active Service Requests</span>
            <strong className="scc-stat-card__value">{activeCount}</strong>
            <small className="scc-stat-card__hint">Awaiting coordinator review or fulfillment</small>
          </div>
        </div>

        <div className="scc-stat-card" onClick={onNavigateToRequests} style={{ cursor: 'pointer' }}>
          <div className="scc-stat-card__icon scc-stat-card__icon--green">
            <span className="material-symbols-outlined">verified</span>
          </div>
          <div className="scc-stat-card__info">
            <span className="scc-stat-card__label">Provisioned Services</span>
            <strong className="scc-stat-card__value">{provisionedCount}</strong>
            <small className="scc-stat-card__hint">Active digital accounts & tools</small>
          </div>
        </div>

        <div className="scc-stat-card" onClick={onNavigateToRoster} style={{ cursor: 'pointer' }}>
          <div className="scc-stat-card__icon scc-stat-card__icon--purple">
            <span className="material-symbols-outlined">badge</span>
          </div>
          <div className="scc-stat-card__info">
            <span className="scc-stat-card__label">Certified Officers</span>
            <strong className="scc-stat-card__value">{officerCount}</strong>
            <small className="scc-stat-card__hint">Executive board roster for SY 2026-2027</small>
          </div>
        </div>
      </section>

      {/* Available Digital Services Quick Selector */}
      <section className="scc-card">
        <div className="scc-card__header">
          <div>
            <h3 className="scc-card__title">Available Digital Services</h3>
            <p className="scc-card__desc">
              Request official DepEd digital resources for your school organization.
            </p>
          </div>
          <button type="button" className="scc-btn scc-btn--sm scc-btn--secondary" onClick={onNavigateToServices}>
            View Service Catalog
          </button>
        </div>

        <div className="scc-services-grid">
          {SCC_DIGITAL_SERVICES.slice(0, 4).map((service) => (
            <div key={service.key} className="scc-service-tile">
              <div className="scc-service-tile__icon">
                <span className="material-symbols-outlined">{service.icon}</span>
              </div>
              <div className="scc-service-tile__content">
                <h4 className="scc-service-tile__title">{service.title}</h4>
                <p className="scc-service-tile__desc">{service.subtitle}</p>
                <div className="scc-service-tile__meta">
                  <span className="scc-service-tile__sla">SLA: {service.slaTurnaround}</span>
                  <button
                    type="button"
                    className="scc-service-tile__btn"
                    onClick={() => handleLaunchRequest(service.key)}
                  >
                    Request
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity / Requests */}
      <section className="scc-card">
        <div className="scc-card__header">
          <div>
            <h3 className="scc-card__title">Recent Service Requests</h3>
            <p className="scc-card__desc">Latest requests submitted by your organization.</p>
          </div>
          <button type="button" className="scc-btn scc-btn--sm scc-btn--secondary" onClick={onNavigateToRequests}>
            View All Requests ({requests.length})
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="scc-empty-state">
            <span className="material-symbols-outlined">inbox</span>
            <h4>No requests submitted yet</h4>
            <p>Select a service above to submit your first digital service request.</p>
          </div>
        ) : (
          <div className="scc-table-responsive">
            <table className="scc-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Service</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 5).map((req) => (
                  <tr key={req.id}>
                    <td><strong className="scc-code">{req.trackingNumber}</strong></td>
                    <td>{req.serviceTitle}</td>
                    <td><span className="scc-title-cell" title={req.title}>{req.title}</span></td>
                    <td>
                      {req.status === 'provisioned' ? (
                        <span className="scc-badge scc-badge--success">Provisioned</span>
                      ) : req.status === 'approved' ? (
                        <span className="scc-badge scc-badge--info">Approved</span>
                      ) : req.status === 'under_review' ? (
                        <span className="scc-badge scc-badge--warning">Under Review</span>
                      ) : req.status === 'rejected' ? (
                        <span className="scc-badge scc-badge--danger">Rejected</span>
                      ) : (
                        <span className="scc-badge scc-badge--pending">Pending</span>
                      )}
                    </td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="scc-btn scc-btn--sm scc-btn--secondary"
                        onClick={() => setViewRequest(req)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreateServiceRequestModal
        isOpen={isCreateOpen}
        session={session}
        initialServiceKey={selectedServiceKey}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          loadData();
        }}
      />

      <ViewServiceRequestModal
        request={viewRequest}
        onClose={() => setViewRequest(null)}
      />
    </div>
  );
}
