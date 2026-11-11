import React, { useEffect, useState } from 'react';
import type { SccSession, SccOrganization, SccOfficer } from '../../../types';
import {
  fetchSccOrganizations,
  fetchSccOfficers,
  fetchSccOrganizationHierarchy,
  sortOfficersByHierarchy,
} from '../../../services/sccSupabase';
import { AddOfficerModal } from '../modals/AddOfficerModal';

interface SccOrgProfilePageProps {
  session: SccSession;
}

export function SccOrgProfilePage({ session }: SccOrgProfilePageProps) {
  const [org, setOrg] = useState<SccOrganization | null>(null);
  const [officers, setOfficers] = useState<SccOfficer[]>([]);
  const [hierarchy, setHierarchy] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOfficerOpen, setIsAddOfficerOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allOrgs, offList, orgHierarchy] = await Promise.all([
        fetchSccOrganizations(),
        fetchSccOfficers(session.organizationId, session.organizationAcronym, session.organizationName),
        fetchSccOrganizationHierarchy(session.organizationAcronym, session.organizationName),
      ]);
      const matched = allOrgs.find((o) => o.id === session.organizationId) || allOrgs[0];
      setOrg(matched);
      setOfficers(offList);
      setHierarchy(orgHierarchy);
    } catch (err) {
      console.warn('Failed to load org profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.organizationId, session.organizationAcronym]);

  return (
    <div className="scc-page-container">
      <div className="scc-page-header">
        <div>
          <h2 className="scc-page-title">Organization Profile & Roster</h2>
          <p className="scc-page-subtitle">
            Manage club details, designated teacher advisers, and the certified executive officer directory.
          </p>
        </div>
        <button
          type="button"
          className="scc-btn scc-btn--primary"
          onClick={() => setIsAddOfficerOpen(true)}
        >
          <span className="material-symbols-outlined">person_add</span>
          Add Officer
        </button>
      </div>

      {/* Organization Info Box */}
      <div className="scc-card">
        <div className="scc-card__header">
          <div>
            <div className="scc-header-tags">
              <span className="scc-pill scc-pill--accent">{org?.acronym || session.organizationAcronym}</span>
              <span className="scc-pill scc-pill--subtle">{org?.category || 'Student Organization'}</span>
              <span className="scc-badge scc-badge--success">Recognized Club (2026-2027)</span>
            </div>
            <h3 className="scc-card__title">
              {org?.name || session.organizationName}
            </h3>
            <p className="scc-card__desc">{org?.description}</p>
          </div>
        </div>

        <div className="scc-meta-grid" style={{ marginTop: '16px' }}>
          <div className="scc-meta-block">
            <span className="scc-meta-label">Teacher Adviser</span>
            <strong className="scc-meta-value">{org?.adviserName || session.adviserName}</strong>
            <small className="scc-meta-sub">{org?.adviserEmail || 'adviser@leonnhs.edu.ph'}</small>
          </div>
          <div className="scc-meta-block">
            <span className="scc-meta-label">Institutional Mailbox</span>
            <strong className="scc-meta-value scc-meta-value--mono">
              {org?.officialEmail ? org.officialEmail : 'Pending Request'}
            </strong>
            <small className="scc-meta-sub">
              {org?.officialEmail ? 'DepEd Google Workspace' : 'Submit request via catalog'}
            </small>
          </div>
          <div className="scc-meta-block">
            <span className="scc-meta-label">School Affiliation</span>
            <strong className="scc-meta-value">Leon National High School</strong>
            <small className="scc-meta-sub">DepEd School ID: 302522</small>
          </div>
          <div className="scc-meta-block">
            <span className="scc-meta-label">Active Officers</span>
            <strong className="scc-meta-value">{officers.length} Certified</strong>
            <small className="scc-meta-sub">SY 2026-2027 Term</small>
          </div>
        </div>
      </div>

      {/* Certified Officers Table */}
      <div className="scc-card">
        <div className="scc-card__header">
          <div>
            <h3 className="scc-card__title">Executive Officer Roster</h3>
            <p className="scc-card__desc">
              Tagged learners registered under {org?.acronym || session.organizationAcronym} in the Registrar Registry, arranged by organizational hierarchy.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="scc-empty-state">
            <span className="material-symbols-outlined scc-spin">sync</span>
            <p>Loading officer roster...</p>
          </div>
        ) : officers.length === 0 ? (
          <div className="scc-empty-state">
            <span className="material-symbols-outlined">group_off</span>
            <h4>No Tagged Learners Found</h4>
            <p>No learners are currently tagged under {org?.acronym || session.organizationAcronym} in the Registrar Registry.</p>
          </div>
        ) : (
          <div className="scc-table-responsive">
            <table className="scc-table">
              <thead>
                <tr>
                  <th>Officer Name</th>
                  <th>Position</th>
                  <th>LRN</th>
                  <th>Grade & Section</th>
                  <th>Contact Email</th>
                  <th>Signatory</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((off) => (
                  <tr key={off.id}>
                    <td>
                      <div className="scc-cell-stack">
                        <strong>{off.fullName}</strong>
                        <small className="scc-muted">{off.contactNumber || 'No phone'}</small>
                      </div>
                    </td>
                    <td>
                      <span className="scc-pill scc-pill--accent">{off.position}</span>
                    </td>
                    <td>
                      <code className="scc-code">{off.lrn || '—'}</code>
                    </td>
                    <td>
                      <span>{off.gradeLevel} - {off.section}</span>
                    </td>
                    <td>
                      <span className="scc-email-cell">{off.email || '—'}</span>
                    </td>
                    <td>
                      {off.isAuthorizedSignatory ? (
                        <span className="scc-badge scc-badge--info">Signatory</span>
                      ) : (
                        <span className="scc-muted">Member</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddOfficerModal
        isOpen={isAddOfficerOpen}
        session={session}
        onClose={() => setIsAddOfficerOpen(false)}
        onOfficerAdded={(newOff) => {
          setOfficers((prev) => sortOfficersByHierarchy([...prev, newOff], hierarchy));
        }}
      />
    </div>
  );
}
