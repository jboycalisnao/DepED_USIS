import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import {
  createElectionCoordinatorCredential,
  loadRegistrationPortalSnapshot,
  type CredentialRegistrySnapshot,
} from '@/features/access/utils/credentialRegistry';
import {
  clearStoredRegistrationPortalAccess,
  getStoredRegistrationPortalAccess,
} from '../utils/registrationPortalAccess';

const registrationModeOptions = [
  { label: 'Selected School', value: 'selected' },
  { label: 'All Schools In Division', value: 'all' },
];

export function RegistrationCredentialsPage() {
  const portalAccess = useMemo(() => getStoredRegistrationPortalAccess(), []);
  const [snapshot, setSnapshot] = useState<CredentialRegistrySnapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'all' | 'selected'>('selected');
  const [targetSchoolCode, setTargetSchoolCode] = useState('');
  const [form, setForm] = useState({
    email: '',
    employeeId: '',
    firstName: '',
    lastName: '',
    middleName: '',
    mobileNo: '',
    password: '',
    permissions: 'candidate.manage, ballot.audit, settings.manage',
    role: 'election_admin',
    username: '',
  });

  useEffect(() => {
    async function load() {
      if (!portalAccess) return;
      setIsLoading(true);
      try {
        const nextSnapshot = await loadRegistrationPortalSnapshot(portalAccess);
        setSnapshot(nextSnapshot);
        setTargetSchoolCode(nextSnapshot.accessibleSchools[0]?.schoolCode || '');
        setError('');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load the registration portal.');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [portalAccess]);

  const schoolOptions = useMemo(
    () =>
      (snapshot?.accessibleSchools || []).map((school) => ({
        label: `${school.schoolCode} - ${school.schoolName}`,
        value: school.schoolCode,
      })),
    [snapshot?.accessibleSchools],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!portalAccess) return;

    setIsSubmitting(true);
    setNotice('');
    setError('');

    try {
      await createElectionCoordinatorCredential({
        actorAccess: null,
        allSchoolCodes: mode === 'all' ? snapshot?.accessibleSchools.map((school) => school.schoolCode) || [] : undefined,
        registrationCode: portalAccess.registrationCode,
        electionId: '',
        schoolCode: targetSchoolCode,
        ...form,
      });
      setNotice(mode === 'all' ? 'Election credentials registered for the division scope.' : 'Election credential registered.');
      setForm({
        email: '',
        employeeId: '',
        firstName: '',
        lastName: '',
        middleName: '',
        mobileNo: '',
        password: '',
        permissions: 'candidate.manage, ballot.audit, settings.manage',
        role: 'election_admin',
        username: '',
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to register election credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel__summary">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Registration Scope</p>
            <div className="registry-summary">
              <p><strong>Region Code:</strong> {portalAccess?.regionCode || 'Unavailable'}</p>
              <p><strong>Division Code:</strong> {portalAccess?.divisionCode || 'Unavailable'}</p>
              <p><strong>Registration Code:</strong> {portalAccess?.registrationCode || 'Unavailable'}</p>
            </div>
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Coverage</p>
            <div className="registry-summary">
              <p><strong>Schools:</strong> {snapshot?.accessibleSchools.length || 0}</p>
              <p><strong>Election Records:</strong> {snapshot?.electionCoordinators.length || 0}</p>
            </div>
          </div>
        </article>
      </div>

      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}
      {notice ? <p className="registry-success">{notice}</p> : null}

      <article className="section-card admin-panel">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <p className="section-card__eyebrow">Registration Portal</p>
          <h3 className="mt-2">Election Credentials Registration</h3>

          {isLoading ? (
            <p className="registry-copy">Loading registration scope.</p>
          ) : (
            <form className="registry-form" onSubmit={handleSubmit}>
              <div className="registry-select-grid">
                <SearchableSelect
                  label="Registration Mode"
                  onChange={(value) => setMode(value as 'all' | 'selected')}
                  options={registrationModeOptions}
                  value={mode}
                />
                <SearchableSelect
                  disabled={mode === 'all'}
                  label="Target School"
                  onChange={setTargetSchoolCode}
                  options={schoolOptions}
                  value={targetSchoolCode}
                />
              </div>

              <FloatingField id="registration-first-name" label="First Name" required value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} />
              <FloatingField id="registration-last-name" label="Last Name" required value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} />

              <div className="registry-form__split">
                <FloatingField id="registration-middle-name" label="Middle Name" value={form.middleName} onChange={(event) => setForm((current) => ({ ...current, middleName: event.target.value }))} />
                <FloatingField id="registration-employee-id" label="Employee ID" value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} />
              </div>

              <div className="registry-form__split">
                <FloatingField id="registration-username" label="Username" required value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
                <FloatingField id="registration-email" label="Email" type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>

              <div className="registry-form__split">
                <FloatingField id="registration-mobile" label="Mobile Number" value={form.mobileNo} onChange={(event) => setForm((current) => ({ ...current, mobileNo: event.target.value }))} />
                <FloatingField id="registration-password" label="Temporary Password" type="password" required value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              </div>

              <div className="registry-form__split">
                <SearchableSelect
                  label="Role"
                  onChange={(value) => setForm((current) => ({ ...current, role: value }))}
                  options={[
                    { label: 'Election Admin', value: 'election_admin' },
                    { label: 'Election Coordinator', value: 'election_coordinator' },
                    { label: 'Election Encoder', value: 'election_encoder' },
                    { label: 'Election Viewer', value: 'election_viewer' },
                  ]}
                  value={form.role}
                />
                <FloatingField as="textarea" id="registration-permissions" label="Permissions" helper="Separate permissions with commas or new lines." value={form.permissions} onChange={(event) => setForm((current) => ({ ...current, permissions: event.target.value }))} />
              </div>

              <div className="registry-form__actions">
                <button className="login-card__submit" disabled={isSubmitting || (mode === 'selected' && !targetSchoolCode)} type="submit">
                  {isSubmitting ? 'Saving...' : mode === 'all' ? 'Register Division Credentials' : 'Register School Credentials'}
                </button>
                <button className="admin-shell__logout" type="button" onClick={() => { clearStoredRegistrationPortalAccess(); window.location.href = '/login'; }}>
                  Exit
                </button>
              </div>
            </form>
          )}
        </div>
      </article>
    </div>
  );
}
