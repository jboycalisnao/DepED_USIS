import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SrcyAccessRecord } from '../../auth/services/srcyAccess';
import {
  calculateAge,
  createSrcyMember,
  type SrcyMemberDraft,
  type SrcyMembershipStatus,
} from '../services/srcyMembershipService';
import {
  computeMemberStatusFromDom,
  isDomExpired,
  loadSrcyDomRecords,
  type SrcyDomRecord,
} from '../services/srcyDomService';
import {
  lookupLearnerByLrn,
  type RegistrarLearnerSearchResult,
} from '../services/learnerDirectoryService';
import { LearnerDirectoryModal } from '../modals/LearnerDirectoryModal';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import {
  UsisSearchableSelect,
  type UsisSearchableSelectOption,
} from '../../../../common/components/ui/UsisSearchableSelect';
import { MaabIdInput } from '../custom-components/MaabIdInput';

type MembershipPageProps = {
  session: SrcyAccessRecord;
};

const initialDraft: SrcyMemberDraft = {
  birthdate: '',
  address: '',
  contactNo: '',
  councilRole: 'Member',
  createdBy: '',
  domId: '',
  maabId: '',
  email: '',
  emergencyContact: '',
  fullName: '',
  gradeLevel: '',
  joinedAt: new Date().toISOString().slice(0, 10),
  learnerLrn: '',
  membershipStatus: 'Active',
  notes: '',
  schoolId: '',
  section: '',
};

const statusOptions: SrcyMembershipStatus[] = ['Active', 'Pending', 'Inactive'];

export function MembershipPage({ session }: MembershipPageProps) {
  const navigate = useNavigate();
  const [domBatches, setDomBatches] = useState<SrcyDomRecord[]>([]);
  const [draft, setDraft] = useState<SrcyMemberDraft>(() => ({
    ...initialDraft,
    createdBy: session.userId,
    schoolId: session.schoolId,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'info' } | null>(null);

  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [isQuickLookingUp, setIsQuickLookingUp] = useState(false);

  useEffect(() => {
    void loadSrcyDomRecords().then((batches) => {
      setDomBatches(batches);
      const activeBatch = batches.find((b) => !isDomExpired(b));
      if (activeBatch) {
        setDraft((prev) => {
          if (prev.domId) return prev;
          return {
            ...prev,
            domId: activeBatch.id,
            joinedAt: activeBatch.validFrom || prev.joinedAt,
            membershipStatus: computeMemberStatusFromDom(activeBatch),
          };
        });
      }
    }).catch(() => {});
  }, []);

  const domOptions: UsisSearchableSelectOption[] = useMemo(() => [
    ...domBatches
      .filter((d) => !isDomExpired(d))
      .map((d) => {
        const sy = d.schoolYear ? (d.schoolYear.startsWith('S.Y.') ? d.schoolYear : `S.Y. ${d.schoolYear}`) : '';
        return {
          label: sy ? `${d.domNumber} (${sy})` : d.domNumber,
          value: d.id,
        };
      }),
  ], [domBatches]);

  const selectedDom = useMemo(() => domBatches.find((d) => d.id === draft.domId), [domBatches, draft.domId]);
  const derivedMembershipStatus = computeMemberStatusFromDom(selectedDom);

  const calculatedAge = calculateAge(draft.birthdate);

  const updateDraft = (key: keyof SrcyMemberDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSelectLearnerFromDirectory = (learner: RegistrarLearnerSearchResult) => {
    setDraft((current) => ({
      ...current,
      learnerLrn: learner.lrn,
      fullName: learner.fullName,
      gradeLevel: learner.gradeLevel,
      section: learner.section,
      birthdate: learner.birthdate || current.birthdate,
      address: learner.address || current.address,
      contactNo: learner.contactNo || current.contactNo,
      email: learner.email || current.email,
      emergencyContact: learner.emergencyContact || current.emergencyContact,
    }));
    setAlert({
      title: 'Learner Auto-Filled',
      message: `Populated details for ${learner.fullName} (LRN: ${learner.lrn}).`,
      tone: 'success',
    });
  };

  const handleQuickLrnLookup = async () => {
    const lrnToSearch = draft.learnerLrn.trim();
    if (!lrnToSearch) {
      setModalSearchQuery('');
      setIsDirectoryModalOpen(true);
      return;
    }

    setIsQuickLookingUp(true);
    try {
      const found = await lookupLearnerByLrn(lrnToSearch);
      if (found) {
        if (found.isEnrolledInActiveYear) {
          handleSelectLearnerFromDirectory(found);
        } else {
          setModalSearchQuery(lrnToSearch);
          setIsDirectoryModalOpen(true);
          setAlert({
            title: 'Learner Not in Active School Year',
            message: `${found.fullName} (LRN: ${found.lrn}) was found in registrar records, but is not enrolled in the active school year (${found.activeSchoolYearLabel || 'current S.Y.'}).`,
            tone: 'warning',
          });
        }
      } else {
        setModalSearchQuery(lrnToSearch);
        setIsDirectoryModalOpen(true);
      }
    } catch (err: any) {
      setModalSearchQuery(lrnToSearch);
      setIsDirectoryModalOpen(true);
    } finally {
      setIsQuickLookingUp(false);
    }
  };

  const openDirectorySearchModal = (initialTerm = '') => {
    setModalSearchQuery(initialTerm || draft.fullName || draft.learnerLrn || '');
    setIsDirectoryModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.domId?.trim()) {
      setAlert({
        title: 'DOM Batch Required',
        message: 'A Declaration of Members (DOM) batch is required when registering an SRCY council member.',
        tone: 'danger',
      });
      return;
    }

    const attachedDom = domBatches.find((d) => d.id === draft.domId);
    const computedStatus = computeMemberStatusFromDom(attachedDom);

    setIsSubmitting(true);
    try {
      const saved = await createSrcyMember({
        ...draft,
        membershipStatus: computedStatus,
        createdBy: session.userId,
        learnerLrn: draft.learnerLrn.replace(/\D/g, '').slice(0, 12),
        schoolId: session.schoolId,
      });
      setDraft({ ...initialDraft, createdBy: session.userId, schoolId: session.schoolId });
      setAlert({
        title: 'Member Saved Successfully',
        message: `${saved.fullName} was added to the SRCY membership directory under ${attachedDom?.domNumber || 'DOM'}.`,
        tone: 'success',
      });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to save SRCY member.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-shell">
      <div className="page-intro srcy-page-intro">
        <p className="page-intro__eyebrow">Senior Red Cross Youth Council</p>
        <h1>Member Registration</h1>
        <p>Register new SRCY council members using official student records.</p>
      </div>

      <div className="portal-panel">
        <header className="portal-panel__header srcy-panel-header">
          <div>
            <h2>Membership Tracker Form</h2>
            <p className="srcy-panel-header__subtitle">Search LRN or Name from official directory to autofill details</p>
          </div>
          <div className="srcy-panel-header__actions">
            <button
              type="button"
              className="secondary-button srcy-directory-trigger-btn"
              onClick={() => openDirectorySearchModal()}
            >
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              Search Learner Directory
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate('/membership-list')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">groups</span>
              View Membership List
            </button>
          </div>
        </header>
        <div className="portal-panel__body srcy-membership-body">
          <form className="srcy-membership-form" onSubmit={handleSubmit}>
            <div className="srcy-field-with-action">
              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.learnerLrn}
                    onChange={(event) => updateDraft('learnerLrn', event.target.value.replace(/\D/g, '').slice(0, 12))}
                    required
                    placeholder=" "
                  />
                  <span>Learner LRN</span>
                </div>
              </label>
              <button
                type="button"
                className="secondary-button srcy-inline-lookup-btn"
                onClick={() => void handleQuickLrnLookup()}
                disabled={isQuickLookingUp}
                title="Lookup LRN in learner directory"
              >
                {isQuickLookingUp ? (
                  <span className="material-symbols-outlined spin-icon" aria-hidden="true">sync</span>
                ) : (
                  <span className="material-symbols-outlined" aria-hidden="true">person_search</span>
                )}
                <span className="srcy-btn-text">Lookup</span>
              </button>
            </div>

            <div className="srcy-field-with-action">
              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.fullName}
                    onChange={(event) => updateDraft('fullName', event.target.value)}
                    required
                    placeholder=" "
                  />
                  <span>Full Name</span>
                </div>
              </label>
              <button
                type="button"
                className="secondary-button srcy-inline-lookup-btn"
                onClick={() => openDirectorySearchModal(draft.fullName)}
                title="Search name in learner directory"
              >
                <span className="material-symbols-outlined" aria-hidden="true">manage_search</span>
                <span className="srcy-btn-text">Find</span>
              </button>
            </div>

            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.gradeLevel} onChange={(event) => updateDraft('gradeLevel', event.target.value)} placeholder=" " />
                <span>Grade Level</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.section} onChange={(event) => updateDraft('section', event.target.value)} placeholder=" " />
                <span>Section</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.councilRole} onChange={(event) => updateDraft('councilRole', event.target.value)} placeholder=" " />
                <span>Council Role</span>
              </div>
            </label>
            <UsisSearchableSelect
              ariaLabel="Declaration of Members (DOM) Batch"
              label="Declaration of Members (DOM) Batch"
              floatingLabel
              forcePortalMenu
              required
              value={draft.domId || ''}
              options={domOptions}
              onChange={(selectedDomId) => {
                updateDraft('domId', selectedDomId);
                const matched = domBatches.find((d) => d.id === selectedDomId);
                if (matched) {
                  if (matched.validFrom) updateDraft('joinedAt', matched.validFrom);
                  updateDraft('membershipStatus', computeMemberStatusFromDom(matched));
                }
              }}
            />
            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  value={selectedDom ? `${derivedMembershipStatus} (${selectedDom.domNumber})` : 'Select DOM batch first'}
                  readOnly
                  disabled
                  data-has-value="true"
                />
                <span>Status (Derived from DOM Validity)</span>
              </div>
            </label>
            <MaabIdInput
              value={draft.maabId || ''}
              onChange={(val) => updateDraft('maabId', val)}
            />
            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  type="date"
                  value={draft.birthdate}
                  onChange={(event) => updateDraft('birthdate', event.target.value)}
                  data-has-value={Boolean(draft.birthdate)}
                />
                <span>Birthdate</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  value={calculatedAge !== null ? `${calculatedAge} yrs old` : ''}
                  readOnly
                  disabled
                  placeholder=" "
                />
                <span>Calculated Age</span>
              </div>
            </label>
            <label className="floating-field srcy-membership-form__full">
              <div className="floating-field__control">
                <input
                  value={draft.address}
                  onChange={(event) => updateDraft('address', event.target.value)}
                  placeholder=" "
                />
                <span>Complete Address</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.contactNo} onChange={(event) => updateDraft('contactNo', event.target.value)} placeholder=" " />
                <span>Contact No.</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.email} onChange={(event) => updateDraft('email', event.target.value)} type="email" placeholder=" " />
                <span>Email</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.emergencyContact} onChange={(event) => updateDraft('emergencyContact', event.target.value)} placeholder=" " />
                <span>Emergency Contact</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.joinedAt} onChange={(event) => updateDraft('joinedAt', event.target.value)} type="date" data-has-value="true" />
                <span>Joined Date</span>
              </div>
            </label>
            <label className="floating-field srcy-membership-form__full">
              <div className="floating-field__control">
                <textarea value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} rows={3} placeholder=" " />
                <span>Notes</span>
              </div>
            </label>
            <div className="form-actions srcy-membership-form__full">
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Add Member'}
              </button>
              <button type="button" className="secondary-button" onClick={() => navigate('/membership-list')}>
                Go to Membership Directory
              </button>
            </div>
          </form>
        </div>
      </div>

      <LearnerDirectoryModal
        open={isDirectoryModalOpen}
        initialSearchQuery={modalSearchQuery}
        onClose={() => setIsDirectoryModalOpen(false)}
        onSelectLearner={handleSelectLearnerFromDirectory}
      />

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}


