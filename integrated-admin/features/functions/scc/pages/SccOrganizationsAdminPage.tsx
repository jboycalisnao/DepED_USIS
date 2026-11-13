import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import { deleteIaSccOrganization, loadIaSccOrganizations } from '../services/iaSccService';
import type { IaSccOrganization, IaSccOrgStatus } from '../types';
import { SccOrganizationFormModal } from '../modals/SccOrganizationFormModal';
import { SccOrgRosterModal } from '../modals/SccOrgRosterModal';
import { SccCreateGoogleUserModal } from '../modals/SccCreateGoogleUserModal';
import { SccNotifyOfficersModal } from '../modals/SccNotifyOfficersModal';
import {
  SccGoogleAccountSuccessModal,
  type SccGoogleAccountSuccessInfo,
} from '../modals/SccGoogleAccountSuccessModal';

export function SccOrganizationsAdminPage() {
  const [organizations, setOrganizations] = useState<IaSccOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IaSccOrgStatus>('all');
  const [editingOrg, setEditingOrg] = useState<IaSccOrganization | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rosterOrg, setRosterOrg] = useState<IaSccOrganization | null>(null);
  const [notifyOrg, setNotifyOrg] = useState<IaSccOrganization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IaSccOrganization | null>(null);
  const [isCreateGoogleUserOpen, setIsCreateGoogleUserOpen] = useState(false);
  const [googleSuccessInfo, setGoogleSuccessInfo] = useState<SccGoogleAccountSuccessInfo | null>(null);
  const [notifyNotice, setNotifyNotice] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: '', message: '' });

  const loadOrganizations = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await loadIaSccOrganizations();
      setOrganizations(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load SCC organizations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrganizations();
  }, []);

  const handleConfirmDeleteOrg = async () => {
    if (!deleteTarget) return;
    try {
      setErrorMsg(null);
      await deleteIaSccOrganization(deleteTarget.id);
      if (rosterOrg?.id === deleteTarget.id) setRosterOrg(null);
      await loadOrganizations();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to delete organization.');
    }
  };

  const filteredOrgs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return organizations.filter((org) => {
      if (statusFilter !== 'all' && org.status !== statusFilter) return false;
      if (!q) return true;
      return [org.name, org.acronym, org.category, org.adviserName, org.officialEmail]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [organizations, searchQuery, statusFilter]);

  if (isLoading) {
    return <UsisPageLoader message="Loading Organizations & Registrar Rosters..." variant="contained" />;
  }

  return (
    <div className="ia-scc-stack">
      <article className="ia-scc-panel">
        <header className="ia-scc-panel__header">
          <div>
            <h3>Recognized Organizations & Registrar Officer Rosters</h3>
            <p>
              Synced with active Club & Organization tags from the Registrar Tagging Registry.
              Manage teacher advisers, official <code>@leonnhs.edu.ph</code> mailboxes, and live
              Registrar-tagged officer rosters ordered by hierarchy.
            </p>
          </div>
          <div className="ia-scc-inline-tags">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setIsCreateGoogleUserOpen(true)}
            >
              + Create Google User
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setEditingOrg(null);
                setIsFormOpen(true);
              }}
            >
              + Register Organization
            </button>
          </div>
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
            <span>Search organization name, acronym, adviser, or mailbox</span>
          </label>

          <UsisSearchableSelect
            ariaLabel="Filter by Status"
            className="ia-scc-toolbar__select"
            floatingLabel
            label="Filter by Status"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as 'all' | IaSccOrgStatus)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />

          <button type="button" className="secondary-btn" onClick={() => void loadOrganizations()}>
            Refresh
          </button>
        </div>

        {filteredOrgs.length === 0 ? (
          <div className="ia-scc-state-box">
            <span className="material-symbols-outlined" aria-hidden="true">groups</span>
            <h4>No Matching Organizations</h4>
            <p>Adjust your filters or register a new recognized student organization.</p>
          </div>
        ) : (
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Category</th>
                  <th>Teacher Adviser</th>
                  <th>Institutional Mailbox</th>
                  <th>Tagged Officers</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <div className="ia-scc-cell-stack">
                        <strong>{org.name}</strong>
                        <small>Tag Code: {org.acronym}</small>
                      </div>
                    </td>
                    <td>{org.category}</td>
                    <td>
                      <div className="ia-scc-cell-stack">
                        <strong>{org.adviserName || 'Unassigned'}</strong>
                        <small>{org.adviserEmail || 'No email'}</small>
                      </div>
                    </td>
                    <td>
                      {org.officialEmail ? (
                        <code>{org.officialEmail}</code>
                      ) : (
                        <span className="ia-scc-muted">Pending provisioning</span>
                      )}
                    </td>
                    <td>
                      <span className="ia-status-tag ia-status-tag--indigo">
                        {org.officerCount || 0} Officers
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ia-status-tag ia-status-tag--${
                          org.status === 'active'
                            ? 'success'
                            : org.status === 'pending'
                              ? 'warning'
                              : 'neutral'
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="ia-scc-table-actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setRosterOrg(org)}
                        >
                          View Roster
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setNotifyOrg(org)}
                        >
                          Notify Officers
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => {
                            setEditingOrg(org);
                            setIsFormOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="secondary-btn ia-scc-btn--danger"
                          onClick={() => setDeleteTarget(org)}
                        >
                          Delete
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

      <SccOrganizationFormModal
        organization={editingOrg}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => {
          void loadOrganizations();
        }}
      />

      <SccOrgRosterModal
        organization={rosterOrg}
        onClose={() => setRosterOrg(null)}
        onRosterChanged={() => {
          void loadOrganizations();
        }}
        onNotifyOfficers={() => {
          if (rosterOrg) setNotifyOrg(rosterOrg);
        }}
      />

      <UsisAlertModal
        open={Boolean(deleteTarget)}
        title="Delete Organization"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}" (${deleteTarget.acronym})? Any linked manual roster rows and service requests in scc_organizations will also be removed.`
            : ''
        }
        tone="danger"
        confirmLabel="Delete Organization"
        cancelLabel="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          void handleConfirmDeleteOrg();
        }}
      />

      <SccCreateGoogleUserModal
        isOpen={isCreateGoogleUserOpen}
        organizations={organizations}
        onClose={() => setIsCreateGoogleUserOpen(false)}
        onCreated={() => {
          void loadOrganizations();
        }}
        onSuccess={(info) => setGoogleSuccessInfo(info)}
      />

      <SccGoogleAccountSuccessModal
        info={googleSuccessInfo}
        onClose={() => setGoogleSuccessInfo(null)}
      />

      <SccNotifyOfficersModal
        organization={notifyOrg}
        onClose={() => setNotifyOrg(null)}
        onSent={(sentTo, ccSent) => {
          setNotifyNotice({
            open: true,
            title: 'Officer Notification Sent',
            message: `Sent email notification to: ${sentTo.join(', ')}${
              ccSent.length > 0 ? ` (CC: ${ccSent.join(', ')})` : ''
            }.`,
          });
        }}
      />

      <UsisAlertModal
        open={notifyNotice.open}
        title={notifyNotice.title}
        message={notifyNotice.message}
        tone="success"
        confirmLabel="OK"
        onClose={() => setNotifyNotice((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
