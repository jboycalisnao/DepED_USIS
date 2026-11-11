import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type {
  IaSccAdviserCandidate,
  IaSccOrganization,
  IaSccOrgStatus,
} from '../types';
import {
  loadIaCoordinatorAdviserCandidates,
  saveIaSccOrganization,
} from '../services/iaSccService';
import { getStoredIntegratedAdminAccess } from '../../../auth/services/integratedAdminAccess';

type SccOrganizationFormModalProps = {
  organization: IaSccOrganization | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (saved: IaSccOrganization, isNew: boolean) => void;
};

const CATEGORIES = [
  'Student Government',
  'Socio-Civic Organization',
  'Academic Club',
  'Arts & Culture',
  'Sports & Athletics',
  'School Organization',
];

export function SccOrganizationFormModal({
  organization,
  isOpen,
  onClose,
  onSaved,
}: SccOrganizationFormModalProps) {
  const isEditing = Boolean(organization);

  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('');
  const [category, setCategory] = useState('Academic Club');
  const [adviserName, setAdviserName] = useState('');
  const [adviserEmail, setAdviserEmail] = useState('');
  const [adviserContact, setAdviserContact] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [status, setStatus] = useState<IaSccOrgStatus>('active');
  const [description, setDescription] = useState('');
  const [credentials, setCredentials] = useState<IaSccAdviserCandidate[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
  const [credentialsLoadError, setCredentialsLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setCredentialsLoadError(null);
    setSelectedCredentialId('');
    if (organization) {
      setName(organization.name);
      setAcronym(organization.acronym);
      setCategory(organization.category || 'Academic Club');
      setAdviserName(organization.adviserName || '');
      setAdviserEmail(organization.adviserEmail || '');
      setAdviserContact(organization.adviserContact || '');
      setOfficialEmail(organization.officialEmail || '');
      setStatus(organization.status || 'active');
      setDescription(organization.description || '');
    } else {
      setName('');
      setAcronym('');
      setCategory('Academic Club');
      setAdviserName('');
      setAdviserEmail('');
      setAdviserContact('');
      setOfficialEmail('');
      setStatus('active');
      setDescription('');
    }

    let cancelled = false;
    setIsLoadingCredentials(true);
    const storedAccess = getStoredIntegratedAdminAccess();
    const schoolUuid = storedAccess?.coordinatorAccess.schoolUuid || '';
    const schoolCode = storedAccess?.coordinatorAccess.schoolId || organization?.schoolId || '302522';

    void loadIaCoordinatorAdviserCandidates({ schoolUuid, schoolCode })
      .then((rows) => {
        if (cancelled) return;
        setCredentials(rows);

        if (organization) {
          const targetEmail = (organization.adviserEmail || '').trim().toLowerCase();
          const targetName = (organization.adviserName || '').trim().toLowerCase();
          const matched = rows.find((c) => {
            const cEmail = (c.email || '').trim().toLowerCase();
            const fullA = (c.fullName || '').trim().toLowerCase();
            return (targetEmail && cEmail && cEmail === targetEmail) || (targetName && fullA === targetName);
          });
          if (matched) {
            setSelectedCredentialId(matched.id);
          }
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCredentials([]);
        setCredentialsLoadError(
          err?.message || 'Unable to load Coordinator Accounts from IA.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCredentials(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, organization]);

  const credentialOptions = useMemo(
    () =>
      credentials.map((cred) => {
        const typeLabel =
          cred.personnelType === 'non_teaching'
            ? 'Non-Teaching'
            : cred.personnelType === 'teaching'
              ? 'Teaching'
              : cred.role
                  .split('_')
                  .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                  .join(' ');
        const dept = cred.departmentName ? ` • ${cred.departmentName}` : '';
        const emailSuffix = cred.email ? ` • ${cred.email}` : cred.username ? ` • @${cred.username}` : '';
        const inactiveTag = cred.isActive ? '' : ' [Inactive]';
        return {
          value: cred.id,
          label: `${cred.fullName} — ${typeLabel}${dept}${emailSuffix}${inactiveTag}`,
        };
      }),
    [credentials],
  );

  const handleSelectAdviserCredential = (credId: string) => {
    setSelectedCredentialId(credId);
    const chosen = credentials.find((c) => c.id === credId);
    if (!chosen) return;
    setAdviserName(chosen.fullName);
    setAdviserEmail(chosen.email || '');
    setAdviserContact(chosen.mobileNo || '');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !acronym.trim() || !adviserName.trim()) {
      setErrorMsg('Organization name, acronym, and teacher adviser are required.');
      return;
    }

    if (credentials.length > 0 && !selectedCredentialId) {
      setErrorMsg(
        'Please select a Teacher Adviser from the IA Coordinator Accounts list.',
      );
      return;
    }

    if (adviserEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adviserEmail.trim())) {
      setErrorMsg('Please enter a valid email address for the Teacher Adviser.');
      return;
    }

    if (officialEmail.trim() && !officialEmail.trim().toLowerCase().endsWith('@leonnhs.edu.ph')) {
      setErrorMsg('Official club mailbox must end with @leonnhs.edu.ph.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      const saved = await saveIaSccOrganization(
        {
          id: organization?.id || '',
          schoolId: organization?.schoolId || '302522',
          name: name.trim(),
          acronym: acronym.trim().toUpperCase(),
          category,
          adviserName: adviserName.trim(),
          adviserEmail: adviserEmail.trim(),
          adviserContact: adviserContact.trim(),
          officialEmail: officialEmail.trim(),
          status,
          description: description.trim(),
        },
        !isEditing,
      );
      onSaved(saved, !isEditing);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save organization details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide ia-scc-modal"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit Organization' : 'Register Organization'}
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">SCC Organization Registry</p>
            <h3>{isEditing ? `Edit ${organization?.acronym}` : 'Register School Organization'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form className="modal-dialog__body ia-scc-modal__body" onSubmit={handleSubmit}>
          {errorMsg ? (
            <div className="ia-scc-alert ia-scc-alert--danger" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{errorMsg}</span>
            </div>
          ) : null}

          <div className="ia-scc-form-grid">
            <label className="floating-field">
              <input
                type="text"
                placeholder=" "
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <span>Organization Full Name *</span>
            </label>

            <label className="floating-field">
              <input
                type="text"
                placeholder=" "
                required
                value={acronym}
                onChange={(e) => setAcronym(e.target.value.toUpperCase())}
              />
              <span>Acronym / Tag Code (e.g. SSLG) *</span>
            </label>
          </div>

          <div className="ia-scc-form-grid">
            <UsisSearchableSelect
              ariaLabel="Organization Category"
              floatingLabel
              forcePortalMenu
              label="Organization Category"
              required
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            />

            <UsisSearchableSelect
              ariaLabel="Recognition Status"
              floatingLabel
              forcePortalMenu
              label="Recognition Status"
              required
              value={status}
              onChange={(val) => setStatus(val as IaSccOrgStatus)}
              options={[
                { value: 'active', label: 'Active (Recognized)' },
                { value: 'pending', label: 'Pending Accreditation' },
                { value: 'inactive', label: 'Inactive / Archived' },
              ]}
            />
          </div>

          <div className="ia-scc-form-stack">
            <UsisSearchableSelect
              ariaLabel="Teacher Adviser (Coordinator Accounts)"
              floatingLabel
              forcePortalMenu
              label={
                isLoadingCredentials
                  ? 'Loading IA Coordinator Accounts...'
                  : 'Teacher Adviser (Coordinator Accounts)'
              }
              disabled={isLoadingCredentials}
              required
              value={selectedCredentialId}
              onChange={handleSelectAdviserCredential}
              options={credentialOptions}
              emptyQueryMessage={
                credentialsLoadError ||
                'No matching coordinator accounts found'
              }
            />

            {isEditing && adviserName && !selectedCredentialId && !isLoadingCredentials ? (
              <p className="ia-scc-availability-hint ia-scc-availability-hint--checking">
                Current adviser: <strong>{adviserName}</strong>. Select an IA coordinator account above to link it.
              </p>
            ) : null}

            <div className="ia-scc-form-grid">
              <label className="floating-field">
                <input
                  type="email"
                  placeholder=" "
                  value={adviserEmail}
                  onChange={(e) => setAdviserEmail(e.target.value)}
                />
                <span>Adviser Email Address</span>
              </label>

              <label className="floating-field">
                <input
                  type="tel"
                  placeholder=" "
                  value={adviserContact}
                  onChange={(e) => setAdviserContact(e.target.value)}
                />
                <span>Adviser Contact Number</span>
              </label>
            </div>
          </div>

          <label className="floating-field">
            <input
              type="email"
              placeholder=" "
              value={officialEmail}
              onChange={(e) => setOfficialEmail(e.target.value)}
            />
            <span>Official Club Mailbox (@leonnhs.edu.ph)</span>
          </label>

          <label className="floating-field">
            <textarea
              rows={3}
              placeholder=" "
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <span>Mandate & Organization Description</span>
          </label>

          <div className="modal-dialog__actions ia-scc-modal__actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
