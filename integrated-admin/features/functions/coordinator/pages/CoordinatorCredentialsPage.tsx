import { CoreCoordinatorCredentialForm } from '../../../../../coordinator/features/access/components/CoreCoordinatorCredentialForm';
import { useCredentialRegistry } from '../../../../../coordinator/features/access/hooks/useCredentialRegistry';

type AccessLevelChoice = 'school';

export function CoordinatorCredentialsPage() {
  const { access, createCore, error, isSubmittingCore, notice } = useCredentialRegistry();

  const canManageCoordinatorCredentials = Boolean(
    access && (access.isSuperAdmin || access.accountSource === 'usis_core_coordinators'),
  );
  const roleType: AccessLevelChoice = 'school';
  const coreRoleByAccessLevel = { school: 'school_usis_coordinator' } as const;

  return (
    <div className="admin-panel">
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
                <p className="section-card__eyebrow">Core Access</p>
                <div className="registry-form__header">
                  <h3>Create School Coordinator</h3>
                </div>
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
              </>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
