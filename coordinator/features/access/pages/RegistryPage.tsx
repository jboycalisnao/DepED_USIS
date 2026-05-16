import { useState } from 'react';
import { CoreCredentialEditor } from '../components/CoreCredentialEditor';
import { ElectionCredentialEditor } from '../components/ElectionCredentialEditor';
import { RegistryDirectory } from '../components/RegistryDirectory';
import type { RegistryUserRecord } from '../utils/credentialRegistry';
import { useCredentialRegistry } from '../hooks/useCredentialRegistry';

export function RegistryPage() {
  const {
    access,
    error,
    isLoading,
    isUpdatingCore,
    isUpdatingElection,
    snapshot,
    updateCore,
    updateElection,
  } = useCredentialRegistry();
  const [selectedCoreRecord, setSelectedCoreRecord] = useState<RegistryUserRecord | null>(null);
  const [selectedElectionRecord, setSelectedElectionRecord] = useState<RegistryUserRecord | null>(null);

  return (
    <div className="admin-panel">
      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}

      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Core Registry</p>
            <h3 className="mt-2">USIS Admin Accounts</h3>
            {isLoading ? (
              <div className="registry-list">
                <p>Loading registry.</p>
              </div>
            ) : (
              <>
                <RegistryDirectory
                  emptyMessage="No core access records found."
                  onEdit={(record) => setSelectedCoreRecord(record)}
                  records={snapshot?.coreCoordinators || []}
                  tertiaryValue={(record) => record.email}
                />
              </>
            )}
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Election Registry</p>
            <h3 className="mt-2">Election Coordinator Accounts</h3>
            {isLoading ? (
              <div className="registry-list">
                <p>Loading registry.</p>
              </div>
            ) : (
              <>
                <RegistryDirectory
                  emptyMessage="No election access records found."
                  onEdit={(record) => setSelectedElectionRecord(record)}
                  records={snapshot?.electionCoordinators || []}
                  tertiaryValue={(record) => record.scope}
                />
              </>
            )}
          </div>
        </article>
      </div>

      {selectedCoreRecord ? (
        <div className="registry-modal" role="dialog" aria-modal="true">
          <button
            aria-label="Close editor"
            className="registry-modal__backdrop"
            onClick={() => setSelectedCoreRecord(null)}
            type="button"
          />
          <div className="registry-modal__panel">
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
      ) : null}

      {selectedElectionRecord ? (
        <div className="registry-modal" role="dialog" aria-modal="true">
          <button
            aria-label="Close editor"
            className="registry-modal__backdrop"
            onClick={() => setSelectedElectionRecord(null)}
            type="button"
          />
          <div className="registry-modal__panel">
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
      ) : null}
    </div>
  );
}
