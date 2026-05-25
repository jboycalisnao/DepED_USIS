import { CoreCredentialEditor } from '../../../../../coordinator/features/access/components/CoreCredentialEditor';
import { ElectionCredentialEditor } from '../../../../../coordinator/features/access/components/ElectionCredentialEditor';
import type { CredentialRegistrySnapshot, RegistryUserRecord } from '../../../../../coordinator/features/access/utils/credentialRegistry';
import { moduleOptions, type UsisModuleKey } from '../../../../../coordinator/features/access/utils/moduleAccessRegistry';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Props = {
  access: any;
  isDeleting: boolean;
  isUpdatingCore: boolean;
  isUpdatingElection: boolean;
  moduleAccessByRecordId: Record<string, UsisModuleKey[]>;
  onCancelCore: () => void;
  onCancelDelete: () => void;
  onCancelElection: () => void;
  onCancelModules: () => void;
  onCancelView: () => void;
  onConfirmDelete: () => void;
  onSaveCore: (payload: any) => Promise<void>;
  onSaveElection: (payload: any) => Promise<void>;
  onSaveModules: () => void;
  pendingDeleteRecord: RegistryUserRecord | null;
  pendingModules: UsisModuleKey[];
  selectedCoreRecord: RegistryUserRecord | null;
  selectedElectionRecord: RegistryUserRecord | null;
  selectedModuleRecord: RegistryUserRecord | null;
  selectedViewRecord: RegistryUserRecord | null;
  snapshot: CredentialRegistrySnapshot | null;
  togglePendingModule: (moduleKey: UsisModuleKey) => void;
};

const formatModuleLabel = (value: string) =>
  value === 'ia'
    ? 'Integrated Admin (IA)'
    : value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

export function CoordinatorRegistryModals(props: Props) {
  const {
    access,
    isDeleting,
    isUpdatingCore,
    isUpdatingElection,
    moduleAccessByRecordId,
    onCancelCore,
    onCancelDelete,
    onCancelElection,
    onCancelModules,
    onCancelView,
    onConfirmDelete,
    onSaveCore,
    onSaveElection,
    onSaveModules,
    pendingDeleteRecord,
    pendingModules,
    selectedCoreRecord,
    selectedElectionRecord,
    selectedModuleRecord,
    selectedViewRecord,
    snapshot,
    togglePendingModule,
  } = props;

  return (
    <>
      {selectedCoreRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={onCancelCore} />
          <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Edit core user">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group"><p className="modal-dialog__eyebrow">Coordinator Registry</p><h3>Edit Core Access</h3></div>
              <button type="button" className="modal-dialog__close" onClick={onCancelCore} aria-label="Close"><CloseIcon /></button>
            </div>
            <div className="modal-dialog__body">
              <CoreCredentialEditor
                access={access}
                isSubmitting={isUpdatingCore}
                onCancel={onCancelCore}
                onSubmit={onSaveCore}
                record={selectedCoreRecord}
                schools={snapshot?.accessibleSchools || []}
              />
            </div>
          </div>
        </div>
      ) : null}

      {selectedElectionRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={onCancelElection} />
          <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Edit election user">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group"><p className="modal-dialog__eyebrow">Coordinator Registry</p><h3>Edit Election Access</h3></div>
              <button type="button" className="modal-dialog__close" onClick={onCancelElection} aria-label="Close"><CloseIcon /></button>
            </div>
            <div className="modal-dialog__body">
              <ElectionCredentialEditor
                access={access}
                events={snapshot?.electionEvents || []}
                isSubmitting={isUpdatingElection}
                onCancel={onCancelElection}
                onSubmit={onSaveElection}
                record={selectedElectionRecord}
                schools={snapshot?.accessibleSchools || []}
              />
            </div>
          </div>
        </div>
      ) : null}

      {selectedModuleRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={onCancelModules} />
          <div className="modal-dialog modal-dialog--registry-modules" role="dialog" aria-modal="true" aria-label="Module access settings">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group"><p className="modal-dialog__eyebrow">Coordinator Registry</p><h3>Module Access</h3></div>
              <button type="button" className="modal-dialog__close" onClick={onCancelModules} aria-label="Close"><CloseIcon /></button>
            </div>
            <div className="modal-dialog__body">
              <p className="registry-modal__lead">Assign allowed subsystem access for <strong>{selectedModuleRecord.label}</strong>.</p>
              <fieldset className="registry-radio-group">
                <legend>Allowed Modules</legend>
                <div className="registry-radio-list">
                  {moduleOptions.map((option) => (
                    <label key={option.key} className="registry-radio-option">
                      <input type="checkbox" checked={pendingModules.includes(option.key)} onChange={() => togglePendingModule(option.key)} />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="modal-dialog__actions">
              <button type="button" onClick={onCancelModules}>Cancel</button>
              <button type="button" className="modal-dialog__blue" onClick={onSaveModules}>Save Access</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedViewRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={onCancelView} />
          <div className="modal-dialog modal-dialog--wide modal-dialog--registry-details" role="dialog" aria-modal="true" aria-label="User details">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group"><p className="modal-dialog__eyebrow">Coordinator Registry</p><h3>User Information</h3></div>
              <button type="button" className="modal-dialog__close" onClick={onCancelView} aria-label="Close"><CloseIcon /></button>
            </div>
            <div className="modal-dialog__body">
              <div className="registry-detail-sheet">
                <section className="registry-detail-sheet__section"><h4>Identity</h4><div className="registry-detail-sheet__table">
                  <article><span>Name</span><strong>{selectedViewRecord.label}</strong></article>
                  <article><span>Username</span><strong>{selectedViewRecord.username}</strong></article>
                  <article><span>Email</span><strong>{selectedViewRecord.email}</strong></article>
                  <article><span>Employee ID</span><strong>{selectedViewRecord.employeeId || 'N/A'}</strong></article>
                  <article><span>Mobile Number</span><strong>{selectedViewRecord.mobileNo || 'N/A'}</strong></article>
                </div></section>
                <section className="registry-detail-sheet__section"><h4>Access and Scope</h4><div className="registry-detail-sheet__table">
                  <article><span>Role</span><strong>{selectedViewRecord.role}</strong></article>
                  <article><span>Access Level</span><strong>{selectedViewRecord.accessLevel || 'N/A'}</strong></article>
                  <article><span>School Code</span><strong>{selectedViewRecord.schoolCode || 'N/A'}</strong></article>
                  <article><span>School Name</span><strong>{selectedViewRecord.schoolName || 'N/A'}</strong></article>
                  <article><span>Region</span><strong>{selectedViewRecord.region || 'N/A'}</strong></article>
                  <article><span>Division</span><strong>{selectedViewRecord.division || 'N/A'}</strong></article>
                  <article><span>Scope</span><strong>{selectedViewRecord.scope || 'N/A'}</strong></article>
                  <article><span>Last Login</span><strong>{selectedViewRecord.lastLoginAt || 'Never'}</strong></article>
                </div></section>
                <section className="registry-detail-sheet__section"><h4>Module Access</h4><div className="modal-record__chips">
                  {(moduleAccessByRecordId[selectedViewRecord.id] || []).length
                    ? (moduleAccessByRecordId[selectedViewRecord.id] || []).map((moduleKey) => (
                        <span key={moduleKey} className="modal-record__chip">{formatModuleLabel(moduleKey)}</span>
                      ))
                    : <span className="modal-record__chip">Not Set</span>}
                </div></section>
              </div>
            </div>
            <div className="modal-dialog__actions"><button type="button" className="modal-dialog__blue" onClick={onCancelView}>Close</button></div>
          </div>
        </div>
      ) : null}

      {pendingDeleteRecord ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={onCancelDelete} />
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-label="Delete account confirmation">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group"><p className="modal-dialog__eyebrow">Coordinator Registry</p><h3>Delete Account</h3></div>
              <button type="button" className="modal-dialog__close" onClick={onCancelDelete} aria-label="Close"><CloseIcon /></button>
            </div>
            <div className="modal-dialog__body"><p>Delete account for <strong>{pendingDeleteRecord.label}</strong>?</p><p>This action cannot be undone.</p></div>
            <div className="modal-dialog__actions">
              <button type="button" onClick={onCancelDelete}>Cancel</button>
              <button type="button" className="modal-dialog__primary" onClick={onConfirmDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
