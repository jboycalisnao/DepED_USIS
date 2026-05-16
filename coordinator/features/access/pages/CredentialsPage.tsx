import { useState } from 'react';
import { CoreCoordinatorCredentialForm } from '../components/CoreCoordinatorCredentialForm';
import { ElectionCoordinatorCredentialForm } from '../components/ElectionCoordinatorCredentialForm';
import { SpPortalCoordinatorCredentialForm } from '../components/SpPortalCoordinatorCredentialForm';
import { useCredentialRegistry } from '../hooks/useCredentialRegistry';

type CredentialMode = 'core' | 'election' | 'sp-portal' | 'registrar' | 'attendance';
type AccessLevelChoice = 'school';

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

  const canManageCoordinatorCredentials = Boolean(
    access && (access.isSuperAdmin || access.accountSource === 'usis_core_coordinators'),
  );
  const roleType: AccessLevelChoice = 'school';
  const [credentialType, setCredentialType] = useState<CredentialMode>('core');
  const isCoreMode = credentialType === 'core';
  const credentialTypeOptions = [
    { label: 'Coordinator Portal (Core)', value: 'core' },
    { label: 'Registrar', value: 'registrar' },
    { label: 'Attendance', value: 'attendance' },
    { label: 'Election', value: 'election' },
    { label: 'SP Portal', value: 'sp-portal' },
  ] as const;

  const coreRoleByAccessLevel = {
    school: 'school_usis_coordinator',
  } as const;

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
                <p><strong>Attendance Access:</strong> {snapshot?.attendanceCoordinators.length || 0}</p>
                <p><strong>Registrar Access:</strong> {snapshot?.registrarCoordinators.length || 0}</p>
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
            {!canManageCoordinatorCredentials ? (
              <p className="registry-copy">
                This account does not have authority to create coordinator credentials. Use a USIS core coordinator account.
              </p>
            ) : null}
            {canManageCoordinatorCredentials ? (
              <>
            <p className="section-card__eyebrow">
              {isCoreMode
                ? 'Core Access'
                : credentialType === 'registrar'
                  ? 'Registrar Access'
                  : credentialType === 'attendance'
                    ? 'Attendance Access'
                    : credentialType === 'sp-portal'
                      ? 'SP Portal Access'
                      : 'Election Access'}
            </p>
            <div className="registry-form__header">
              <h3>
                {isCoreMode
                  ? 'Create School Coordinator'
                  : credentialType === 'registrar'
                    ? 'Create Registrar Coordinator'
                    : credentialType === 'attendance'
                      ? 'Create Attendance Coordinator'
                    : credentialType === 'sp-portal'
                      ? 'Create SP Portal Coordinator'
                      : 'Create Election Coordinator'}
              </h3>
              <fieldset className="registry-radio-group">
                <legend>Credential Type</legend>
                <div className="registry-radio-list">
                  {credentialTypeOptions.map((option) => (
                    <label key={option.value} className="registry-radio-option">
                      <input
                        type="radio"
                        name="credential-type"
                        value={option.value}
                        checked={credentialType === option.value}
                        onChange={() => setCredentialType(option.value as CredentialMode)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {isCoreMode ? (
              <CoreCoordinatorCredentialForm
                key={`core-form-${roleType}`}
                access={access}
                accessLevel={roleType}
                credentialType={coreRoleByAccessLevel[roleType]}
                isSubmitting={isSubmittingCore}
                onSubmit={createCore}
                role={coreRoleByAccessLevel[roleType]}
                schoolCode={access?.schoolId || ''}
              />
            ) : credentialType === 'attendance' ? (
              <CoreCoordinatorCredentialForm
                key="attendance-form"
                access={access}
                accessLevel={roleType}
                credentialType="attendance_coordinator"
                isSubmitting={isSubmittingCore}
                onSubmit={createCore}
                role="attendance_coordinator"
                schoolCode={access?.schoolId || ''}
              />
            ) : credentialType === 'registrar' ? (
              <CoreCoordinatorCredentialForm
                key="registrar-form"
                access={access}
                accessLevel={roleType}
                credentialType="registrar_coordinator"
                isSubmitting={isSubmittingCore}
                onSubmit={createCore}
                role="registrar_coordinator"
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
              </>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
