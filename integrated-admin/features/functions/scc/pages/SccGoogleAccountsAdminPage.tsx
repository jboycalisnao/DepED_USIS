import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import {
  deleteGoogleWorkspaceUser,
  loadGoogleWorkspaceUsers,
  loadIaSccOrganizations,
} from '../services/iaSccService';
import type { IaSccGoogleUser, IaSccOrganization } from '../types';
import { SccCreateGoogleUserModal } from '../modals/SccCreateGoogleUserModal';
import {
  SccGoogleAccountSuccessModal,
  type SccGoogleAccountSuccessInfo,
} from '../modals/SccGoogleAccountSuccessModal';
import {
  SccManageGoogleUserModal,
  type GoogleUserManageMode,
} from '../modals/SccManageGoogleUserModal';

export function SccGoogleAccountsAdminPage() {
  const [users, setUsers] = useState<IaSccGoogleUser[]>([]);
  const [orgs, setOrgs] = useState<IaSccOrganization[]>([]);
  const [orgUnitPaths, setOrgUnitPaths] = useState<string[]>([
    '/School Orgs and Clubs',
    '/',
  ]);
  const [ouFilter, setOuFilter] = useState<string>('/School Orgs and Clubs');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [manageUser, setManageUser] = useState<IaSccGoogleUser | null>(null);
  const [manageMode, setManageMode] = useState<GoogleUserManageMode>('modify');
  const [deleteTarget, setDeleteTarget] = useState<IaSccGoogleUser | null>(null);
  const [successInfo, setSuccessInfo] = useState<SccGoogleAccountSuccessInfo | null>(null);
  const [noticeAlert, setNoticeAlert] = useState<{
    open: boolean;
    title: string;
    message: string;
    tone: 'success' | 'danger' | 'info';
  }>({ open: false, title: '', message: '', tone: 'info' });

  const loadAll = async (preserveFilter = true) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [dirData, orgList] = await Promise.all([
        loadGoogleWorkspaceUsers(),
        loadIaSccOrganizations(),
      ]);
      setUsers(dirData.users);
      setOrgUnitPaths(dirData.orgUnitPaths);
      setOrgs(orgList);
      if (!preserveFilter) {
        setOuFilter(dirData.defaultOrgUnitPath || 'all');
      } else if (
        ouFilter !== 'all' &&
        !dirData.orgUnitPaths.includes(ouFilter)
      ) {
        setOuFilter('all');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load Google Workspace directory accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll(false);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (ouFilter !== 'all' && u.orgUnitPath !== ouFilter) return false;
      if (!q) return true;
      return [u.primaryEmail, u.fullName, u.firstName, u.lastName, u.orgUnitPath]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [ouFilter, searchQuery, users]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const email = deleteTarget.primaryEmail;
    try {
      setErrorMsg(null);
      await deleteGoogleWorkspaceUser(email);
      setUsers((prev) => prev.filter((u) => u.primaryEmail !== email));
      setNoticeAlert({
        open: true,
        title: 'Google Account Deleted',
        message: `Account ${email} has been permanently deleted from Google Workspace Admin Console.`,
        tone: 'success',
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to delete Google Workspace account.');
    }
  };

  if (isLoading) {
    return (
      <UsisPageLoader
        message="Loading Google Workspace Accounts (@leonnhs.edu.ph)..."
        variant="contained"
      />
    );
  }

  return (
    <div className="ia-scc-stack">
      <article className="ia-scc-panel">
        <header className="ia-scc-panel__header">
          <div>
            <h3>Google Workspace Accounts Directory</h3>
            <p>
              View, create, modify, reset passwords, suspend, or delete{' '}
              <code>@leonnhs.edu.ph</code> accounts directly synced with Google Admin Console.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setIsCreateOpen(true)}
          >
            + Create Google User
          </button>
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
            <span>Search by display name or @leonnhs.edu.ph email</span>
          </label>

          <UsisSearchableSelect
            ariaLabel="Filter by Organizational Unit"
            className="ia-scc-toolbar__select"
            floatingLabel
            label="Filter by Organizational Unit"
            value={ouFilter}
            onChange={setOuFilter}
            options={[
              { value: 'all', label: 'All Organizational Units' },
              ...orgUnitPaths.map((ou) => ({
                value: ou,
                label: ou === '/' ? '/ (Root OU)' : ou,
              })),
            ]}
          />

          <button type="button" className="secondary-btn" onClick={() => void loadAll(true)}>
            Refresh
          </button>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="ia-scc-state-box">
            <span className="material-symbols-outlined" aria-hidden="true">mail</span>
            <h4>No Google Accounts Found</h4>
            <p>
              {ouFilter !== 'all'
                ? `No accounts matched in "${ouFilter}". Try switching to "All Organizational Units" or create a new user.`
                : 'No Google Workspace accounts matched your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Primary Email</th>
                  <th>Organizational Unit</th>
                  <th>Status</th>
                  <th>Last Sign-In</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const lastLogin =
                    user.lastLoginTime && !user.lastLoginTime.startsWith('1970-')
                      ? new Date(user.lastLoginTime).toLocaleDateString()
                      : 'Never signed in';

                  return (
                    <tr key={user.id || user.primaryEmail}>
                      <td>
                        <div className="ia-scc-cell-stack">
                          <strong>{user.fullName}</strong>
                          <small>
                            {user.creationTime
                              ? `Created ${new Date(user.creationTime).toLocaleDateString()}`
                              : 'Google Directory User'}
                          </small>
                        </div>
                      </td>
                      <td>
                        <code>{user.primaryEmail}</code>
                      </td>
                      <td>{user.orgUnitPath}</td>
                      <td>
                        <div className="ia-scc-inline-tags">
                          {user.suspended ? (
                            <span className="ia-status-tag ia-status-tag--danger">Suspended</span>
                          ) : (
                            <span className="ia-status-tag ia-status-tag--success">Active</span>
                          )}
                          {user.isAdmin ? (
                            <span className="ia-status-tag ia-status-tag--indigo">Admin</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{lastLogin}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="ia-scc-table-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setManageUser(user);
                              setManageMode('modify');
                            }}
                          >
                            Modify
                          </button>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                              setManageUser(user);
                              setManageMode('reset_password');
                            }}
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            className="secondary-btn ia-scc-btn--danger"
                            disabled={user.isAdmin}
                            title={
                              user.isAdmin
                                ? 'Admin accounts cannot be deleted here'
                                : `Delete ${user.primaryEmail}`
                            }
                            onClick={() => setDeleteTarget(user)}
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

      <SccCreateGoogleUserModal
        isOpen={isCreateOpen}
        organizations={orgs}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          void loadAll(true);
        }}
        onSuccess={(info) => setSuccessInfo(info)}
      />

      <SccManageGoogleUserModal
        user={manageUser}
        mode={manageMode}
        orgUnitPaths={orgUnitPaths}
        organizations={orgs}
        onClose={() => setManageUser(null)}
        onUpdated={(updated) => {
          setUsers((prev) =>
            prev.map((u) => (u.id === updated.id ? updated : u)),
          );
          if (manageMode === 'modify') {
            setNoticeAlert({
              open: true,
              title: 'Google Account Updated',
              message: `Changes for ${updated.primaryEmail} have been saved in Google Admin Console.`,
              tone: 'success',
            });
          }
        }}
        onPasswordResetSuccess={(info) => setSuccessInfo(info)}
      />

      <SccGoogleAccountSuccessModal
        info={successInfo}
        onClose={() => setSuccessInfo(null)}
      />

      <UsisAlertModal
        open={Boolean(deleteTarget)}
        title="Delete Google Workspace Account"
        message={
          deleteTarget
            ? `Permanently delete "${deleteTarget.primaryEmail}" from Google Workspace Admin Console? This action removes the mailbox and its Workspace access.`
            : ''
        }
        tone="danger"
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />

      <UsisAlertModal
        open={noticeAlert.open}
        title={noticeAlert.title}
        message={noticeAlert.message}
        tone={noticeAlert.tone}
        confirmLabel="OK"
        onClose={() => setNoticeAlert((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
