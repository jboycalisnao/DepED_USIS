import { useMemo, useState } from 'react';
import { CoreCredentialEditor } from '../components/CoreCredentialEditor';
import { ElectionCredentialEditor } from '../components/ElectionCredentialEditor';
import { RegistryDirectory } from '../components/RegistryDirectory';
import type { RegistryUserRecord } from '../utils/credentialRegistry';
import { useCredentialRegistry } from '../hooks/useCredentialRegistry';
import {
  getModuleAccessMap,
  moduleOptions,
  setAccountModuleAccess,
  type UsisModuleKey,
} from '../utils/moduleAccessRegistry';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 6L18 18M18 6L6 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function RegistryPage() {
  const {
    access,
    deleteCore,
    deleteElection,
    deleteSpPortal,
    error,
    isDeleting,
    isLoading,
    isUpdatingCore,
    isUpdatingElection,
    snapshot,
    updateCore,
    updateElection,
  } = useCredentialRegistry();
  const [selectedCoreRecord, setSelectedCoreRecord] = useState<RegistryUserRecord | null>(null);
  const [selectedElectionRecord, setSelectedElectionRecord] = useState<RegistryUserRecord | null>(null);
  const [selectedViewRecord, setSelectedViewRecord] = useState<RegistryUserRecord | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<RegistryUserRecord | null>(null);
  const [selectedModuleRecord, setSelectedModuleRecord] = useState<RegistryUserRecord | null>(null);
  const [moduleAccessByRecordId, setModuleAccessByRecordId] = useState<Record<string, UsisModuleKey[]>>(() => getModuleAccessMap());
  const [pendingModules, setPendingModules] = useState<UsisModuleKey[]>([]);

  const openModuleAccess = (record: RegistryUserRecord) => {
    setSelectedModuleRecord(record);
    setPendingModules(moduleAccessByRecordId[record.id] || []);
  };

  const togglePendingModule = (moduleKey: UsisModuleKey) => {
    setPendingModules((current) =>
      current.includes(moduleKey) ? current.filter((item) => item !== moduleKey) : [...current, moduleKey],
    );
  };

  const saveModuleAccess = () => {
    if (!selectedModuleRecord) return;
    const next = { ...moduleAccessByRecordId, [selectedModuleRecord.id]: pendingModules };
    setAccountModuleAccess(selectedModuleRecord.id, pendingModules);
    setModuleAccessByRecordId(next);
    setSelectedModuleRecord(null);
    setPendingModules([]);
  };

  const unifiedRecords = useMemo(() => {
    const all = [
      ...(snapshot?.coreCoordinators || []),
      ...(snapshot?.attendanceCoordinators || []),
      ...(snapshot?.registrarCoordinators || []),
      ...(snapshot?.electionCoordinators || []),
      ...(snapshot?.spPortalCoordinators || []),
    ];
    return Array.from(new Map(all.map((record) => [record.id, record])).values());
  }, [snapshot]);

  const handleEditRecord = (record: RegistryUserRecord) => {
    if (record.role === 'sp_portal_coordinator') {
      setSelectedViewRecord(record);
      return;
    }
    if (record.electionId) {
      setSelectedElectionRecord(record);
      return;
    }
    setSelectedCoreRecord(record);
  };

  const handleDeleteRecord = async () => {
    if (!pendingDeleteRecord) return;
    try {
      if (pendingDeleteRecord.role === 'sp_portal_coordinator') {
        await deleteSpPortal(pendingDeleteRecord.id);
      } else if (pendingDeleteRecord.electionId) {
        await deleteElection(pendingDeleteRecord.id);
      } else {
        await deleteCore(pendingDeleteRecord.id);
      }
      setPendingDeleteRecord(null);
    } catch {}
  };

  const formatModuleLabel = (value: string) =>
    value === 'ia'
      ? 'Integrated Admin (IA)'
      :
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  return (
    <div className="admin-panel registry-page--unified">
      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}

      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Coordinator Registry</p>
            <h3 className="mt-2">All Coordinator Accounts</h3>
            {isLoading ? (
              <div className="registry-list">
                <p>Loading registry.</p>
              </div>
            ) : (
              <RegistryDirectory
                emptyMessage="No coordinator accounts found."
                moduleAccessByRecordId={moduleAccessByRecordId}
                onDelete={(record) => setPendingDeleteRecord(record)}
                onEdit={handleEditRecord}
                onView={(record) => setSelectedViewRecord(record)}
                onManageModules={openModuleAccess}
                records={unifiedRecords}
                tertiaryValue={(record) => (record.electionId ? record.scope : record.email)}
              />
            )}
          </div>
        </article>
      </div>

      {selectedCoreRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setSelectedCoreRecord(null)} />
          <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Edit core user">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Coordinator Registry</p>
                <h3>Edit Core Access</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setSelectedCoreRecord(null)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-dialog__body">
            <CoreCredentialEditor
              access={access}
              isSubmitting={isUpdatingCore}
              onCancel={() => setSelectedCoreRecord(null)}
              onSubmit={async (payload) => {
                try {
                  await updateCore(payload);
                  setSelectedCoreRecord(null);
                } catch {}
              }}
              record={selectedCoreRecord}
              schools={snapshot?.accessibleSchools || []}
            />
            </div>
          </div>
        </div>
      ) : null}

      {selectedElectionRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setSelectedElectionRecord(null)} />
          <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Edit election user">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Coordinator Registry</p>
                <h3>Edit Election Access</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setSelectedElectionRecord(null)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-dialog__body">
            <ElectionCredentialEditor
              access={access}
              events={snapshot?.electionEvents || []}
              isSubmitting={isUpdatingElection}
              onCancel={() => setSelectedElectionRecord(null)}
              onSubmit={async (payload) => {
                try {
                  await updateElection(payload);
                  setSelectedElectionRecord(null);
                } catch {}
              }}
              record={selectedElectionRecord}
              schools={snapshot?.accessibleSchools || []}
            />
            </div>
          </div>
        </div>
      ) : null}

      {selectedModuleRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setSelectedModuleRecord(null)} />
          <div className="modal-dialog modal-dialog--registry-modules" role="dialog" aria-modal="true" aria-label="Module access settings">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Coordinator Registry</p>
                <h3>Module Access</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setSelectedModuleRecord(null)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-dialog__body">
              <p className="registry-modal__lead">Assign allowed subsystem access for <strong>{selectedModuleRecord.label}</strong>.</p>
              <fieldset className="registry-radio-group">
                <legend>Allowed Modules</legend>
                <div className="registry-radio-list">
                  {moduleOptions.map((option) => (
                    <label key={option.key} className="registry-radio-option">
                      <input
                        type="checkbox"
                        checked={pendingModules.includes(option.key)}
                        onChange={() => togglePendingModule(option.key)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="modal-dialog__actions">
              <button type="button" onClick={() => setSelectedModuleRecord(null)}>Cancel</button>
              <button type="button" className="modal-dialog__blue" onClick={saveModuleAccess}>Save Access</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedViewRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setSelectedViewRecord(null)} />
          <div className="modal-dialog modal-dialog--wide modal-dialog--registry-details" role="dialog" aria-modal="true" aria-label="User details">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Coordinator Registry</p>
                <h3>User Information</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setSelectedViewRecord(null)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-dialog__body">
              <div className="registry-detail-sheet">
                <section className="registry-detail-sheet__section">
                  <h4>Identity</h4>
                  <div className="registry-detail-sheet__table">
                    <article><span>Name</span><strong>{selectedViewRecord.label}</strong></article>
                    <article><span>Username</span><strong>{selectedViewRecord.username}</strong></article>
                    <article><span>Email</span><strong>{selectedViewRecord.email}</strong></article>
                    <article><span>Employee ID</span><strong>{selectedViewRecord.employeeId || 'N/A'}</strong></article>
                    <article><span>Mobile Number</span><strong>{selectedViewRecord.mobileNo || 'N/A'}</strong></article>
                  </div>
                </section>
                <section className="registry-detail-sheet__section">
                  <h4>Access and Scope</h4>
                  <div className="registry-detail-sheet__table">
                    <article><span>Role</span><strong>{selectedViewRecord.role}</strong></article>
                    <article><span>Access Level</span><strong>{selectedViewRecord.accessLevel || 'N/A'}</strong></article>
                    <article><span>School Code</span><strong>{selectedViewRecord.schoolCode || 'N/A'}</strong></article>
                    <article><span>School Name</span><strong>{selectedViewRecord.schoolName || 'N/A'}</strong></article>
                    <article><span>Region</span><strong>{selectedViewRecord.region || 'N/A'}</strong></article>
                    <article><span>Division</span><strong>{selectedViewRecord.division || 'N/A'}</strong></article>
                    <article><span>Scope</span><strong>{selectedViewRecord.scope || 'N/A'}</strong></article>
                    <article><span>Last Login</span><strong>{selectedViewRecord.lastLoginAt || 'Never'}</strong></article>
                  </div>
                </section>
                <section className="registry-detail-sheet__section">
                  <h4>Module Access</h4>
                  <div className="modal-record__chips">
                    {(moduleAccessByRecordId[selectedViewRecord.id] || []).length
                      ? (moduleAccessByRecordId[selectedViewRecord.id] || []).map((moduleKey) => (
                        <span key={moduleKey} className="modal-record__chip">{formatModuleLabel(moduleKey)}</span>
                      ))
                      : <span className="modal-record__chip">Not Set</span>}
                  </div>
                </section>
              </div>
            </div>
            <div className="modal-dialog__actions">
              <button type="button" className="modal-dialog__blue" onClick={() => setSelectedViewRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setPendingDeleteRecord(null)} />
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-label="Delete account confirmation">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Coordinator Registry</p>
                <h3>Delete Account</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setPendingDeleteRecord(null)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-dialog__body">
              <p>Delete account for <strong>{pendingDeleteRecord.label}</strong>?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-dialog__actions">
              <button type="button" onClick={() => setPendingDeleteRecord(null)}>Cancel</button>
              <button type="button" className="modal-dialog__primary" onClick={handleDeleteRecord} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
