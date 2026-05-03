import { useState } from 'react';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import { CoreCoordinatorCredentialForm } from '../components/CoreCoordinatorCredentialForm';
import { ElectionCoordinatorCredentialForm } from '../components/ElectionCoordinatorCredentialForm';
import { SpPortalCoordinatorCredentialForm } from '../components/SpPortalCoordinatorCredentialForm';
import { useCredentialRegistry } from '../hooks/useCredentialRegistry';

const credentialTypeOptions = [
  { label: 'Create USIS Admin', value: 'core' },
  { label: 'Create Election Coordinator', value: 'election' },
  { label: 'Create SP Portal Coordinator', value: 'sp-portal' },
] as const;

export function CredentialsPage() {
  const {
    access,
    createCore,
    createElection,
    createSpPortal,
    error,
    isLoading,
    isSubmittingCore,
    isSubmittingElection,
    isSubmittingSpPortal,
    notice,
    snapshot,
  } = useCredentialRegistry();
  const [credentialType, setCredentialType] = useState<'core' | 'election' | 'sp-portal'>('core');
  const isCoreMode = credentialType === 'core';

  return (
    <div className="admin-panel">
      <div className="admin-panel__summary">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">School Scope</p>
            <div className="registry-summary">
              <p><strong>School ID:</strong> {access?.schoolId || 'Unavailable'}</p>
              <p><strong>Coordinator:</strong> {access?.coordinatorName || 'Unavailable'}</p>
            </div>
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Totals</p>
            {isLoading ? (
              <p>Loading registry.</p>
            ) : (
              <div className="registry-summary">
                <p><strong>Core Access:</strong> {snapshot?.coreCoordinators.length || 0}</p>
                <p><strong>Election Access:</strong> {snapshot?.electionCoordinators.length || 0}</p>
                <p><strong>SP Portal Access:</strong> {snapshot?.spPortalCoordinators.length || 0}</p>
                <p><strong>Election Events:</strong> {snapshot?.electionEvents.length || 0}</p>
              </div>
            )}
          </div>
        </article>
      </div>

      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}
      {notice ? <p className="registry-success">{notice}</p> : null}

      <div className="registry-layout registry-layout--single">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">
              {isCoreMode ? 'Core Access' : credentialType === 'sp-portal' ? 'SP Portal Access' : 'Election Access'}
            </p>
            <div className="registry-form__header">
              <h3>
                {isCoreMode
                  ? 'Create USIS Admin'
                  : credentialType === 'sp-portal'
                    ? 'Create SP Portal Coordinator'
                    : 'Create Election Coordinator'}
              </h3>
              <SearchableSelect
                label="Credential Type"
                onChange={(value) => setCredentialType(value as 'core' | 'election' | 'sp-portal')}
                options={[...credentialTypeOptions]}
                value={credentialType}
              />
            </div>

            {isCoreMode ? (
              <CoreCoordinatorCredentialForm
                access={access}
                isSubmitting={isSubmittingCore}
                onSubmit={createCore}
                schools={snapshot?.accessibleSchools || []}
                schoolCode={access?.schoolId || ''}
              />
            ) : credentialType === 'sp-portal' ? (
              <SpPortalCoordinatorCredentialForm
                access={access}
                isSubmitting={isSubmittingSpPortal}
                onSubmit={createSpPortal}
                schools={snapshot?.accessibleSchools || []}
                schoolCode={access?.schoolId || ''}
              />
            ) : (
              <ElectionCoordinatorCredentialForm
                access={access}
                events={snapshot?.electionEvents || []}
                isSubmitting={isSubmittingElection}
                onSubmit={createElection}
                schools={snapshot?.accessibleSchools || []}
                schoolCode={access?.schoolId || ''}
              />
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
