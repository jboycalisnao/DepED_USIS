import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLearnerProfile, type LearnerProfileRecord } from '../services/learnerProfile';
import { clearLearnerPortalCache } from '../services/learnerPortalCache';
import {
  fetchLearnerPortalProfileEditingEnabled,
  updateLearnerPortalProfileFields,
  type LearnerProfileEditableFields,
} from '../services/learnerPortalProfileEditing';

type ProfilePageProps = {
  session: LearnerPortalAccessRecord;
};

export function ProfilePage({ session }: ProfilePageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<LearnerProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileEditingEnabled, setProfileEditingEnabled] = useState(false);
  const [editDraft, setEditDraft] = useState<LearnerProfileEditableFields | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const normalizeField = (value: string) => value.trim();

  const toEditableDraft = (record: LearnerProfileRecord): LearnerProfileEditableFields => ({
    address: record.address || '',
    contactNumber: record.contactNumber || '',
    email: record.email || '',
    fatherName: record.fatherName || '',
    guardianName: record.guardianName || '',
    motherName: record.motherName || '',
  });

  const formatTimestamp = (value: string) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('en-PH');
  };

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const enabled = await fetchLearnerPortalProfileEditingEnabled();
        if (!cancelled) setProfileEditingEnabled(enabled);
      } catch {
        if (!cancelled) setProfileEditingEnabled(false);
      }
    };
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      setSaveFeedback(null);
      try {
        const record = await fetchLearnerProfile({ learnerId: session.learnerId, lrn: session.lrn });
        if (!cancelled) {
          setProfile(record);
          setEditDraft(toEditableDraft(record));
        }
      } catch (fetchError: any) {
        if (!cancelled) setError(fetchError?.message || 'Unable to load learner profile.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn]);

  const fullName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
    : session.learnerName;
  const show = (value: string) => (value && value.trim() ? value : 'N/A');
  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .map((token) => String(token).trim().charAt(0).toUpperCase())
    .join('') || (session.learnerName || 'Learner')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase())
      .join('');
  const hasEditableChanges = Boolean(profile && editDraft) && (
    normalizeField(editDraft?.guardianName || '') !== normalizeField(profile?.guardianName || '') ||
    normalizeField(editDraft?.fatherName || '') !== normalizeField(profile?.fatherName || '') ||
    normalizeField(editDraft?.motherName || '') !== normalizeField(profile?.motherName || '') ||
    normalizeField(editDraft?.contactNumber || '') !== normalizeField(profile?.contactNumber || '') ||
    normalizeField(editDraft?.email || '') !== normalizeField(profile?.email || '') ||
    normalizeField(editDraft?.address || '') !== normalizeField(profile?.address || '')
  );

  const handleOpenCorrectionRequest = () => {
    navigate('/services/help-ticket?reason=main-info-correction');
  };

  const handleSaveProfile = async () => {
    if (!profile || !editDraft) return;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const updated = await updateLearnerPortalProfileFields({
        learnerId: profile.id || session.learnerId,
        lrn: profile.lrn || session.lrn,
        fields: editDraft,
      });
      setProfile((current) =>
        current
          ? {
              ...current,
              ...editDraft,
              updatedAt: updated.updatedAt || current.updatedAt,
            }
          : current,
      );
      clearLearnerPortalCache();
      setSaveFeedback('Profile contact details saved.');
    } catch (saveError: any) {
      setSaveFeedback(saveError?.message || 'Unable to save learner profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Profile</h2>
          <p>Review current learner account details.</p>
        </header>
      </div>

      {isLoading ? (
        <article className="notice-box learner-hint__box">
          <strong>Loading</strong>
          <span>Retrieving learner registry profile details.</span>
        </article>
      ) : null}

      {error ? (
        <article className="notice-box learner-hint__box">
          <strong>System Notice</strong>
          <span>{error}</span>
        </article>
      ) : null}

      {saveFeedback ? (
        <article className="notice-box learner-hint__box">
          <strong>Profile Update</strong>
          <span>{saveFeedback}</span>
        </article>
      ) : null}

      {!isLoading && !error ? (
        <div className="portal-panel learner-profile-panel learner-profile-surface">
          <div className="portal-panel__body learner-profile-body">
            <section className="learner-profile-hero">
              <div className="learner-profile-hero__avatar" aria-hidden="true">
                {initials || 'L'}
              </div>
              <div className="learner-profile-hero__identity">
                <h3>{show(fullName)}</h3>
                <p>LRN: {show(profile?.lrn || session.lrn)}</p>
              </div>
              <div className="learner-profile-hero__status">
                <span>Status</span>
                <strong>{show(profile?.loginStatus || session.loginStatus)}</strong>
              </div>
            </section>

            <div className="learner-profile-sections">
              <section className="learner-profile-card">
                <h4>Academic Details</h4>
                <div className="learner-profile-fields">
                  <article><span>Section</span><strong>{show(profile?.sectionName || '')}</strong></article>
                  <article><span>Grade Level</span><strong>{show(profile?.gradeLevel || '')}</strong></article>
                  <article><span>Program</span><strong>{show(profile?.program || '')}</strong></article>
                </div>
              </section>

              <section className="learner-profile-card">
                <h4>Personal Details</h4>
                <div className="learner-profile-fields">
                  <article><span>Gender</span><strong>{show(profile?.gender || '')}</strong></article>
                  <article><span>Date of Birth</span><strong>{show(profile?.birthDate || '')}</strong></article>
                  <article><span>Address</span><strong>{show(profile?.address || '')}</strong></article>
                  <article><span>Contact Number</span><strong>{show(profile?.contactNumber || '')}</strong></article>
                  <article><span>Email</span><strong>{show(profile?.email || '')}</strong></article>
                </div>
              </section>

              <section className="learner-profile-card">
                <h4>Family and Guardian</h4>
                <div className="learner-profile-fields">
                  <article><span>Guardian Name</span><strong>{show(profile?.guardianName || '')}</strong></article>
                  <article><span>Father Name</span><strong>{show(profile?.fatherName || '')}</strong></article>
                  <article><span>Mother Maiden Name</span><strong>{show(profile?.motherName || '')}</strong></article>
                </div>
              </section>

              <section className="learner-profile-card">
                <h4>Portal Account</h4>
                <div className="learner-profile-fields">
                  <article><span>Username</span><strong>{show(profile?.loginUsername || session.username)}</strong></article>
                  <article><span>Login Status</span><strong>{show(profile?.loginStatus || session.loginStatus)}</strong></article>
                </div>
              </section>

              {profileEditingEnabled ? (
                <section className="learner-profile-card learner-profile-card--editor">
                  <div className="learner-profile-card__header">
                    <div className="learner-profile-card__header-row">
                      <h4>Editable Contact Details</h4>
                      <span className="learner-profile-card__timestamp">
                        Last edited: {formatTimestamp(profile?.updatedAt || '')}
                      </span>
                    </div>
                    <p>Update guardian, parent, contact, and address information here. Name, LRN, and birth date remain registrar-controlled.</p>
                  </div>

                  <div className="floating-field-grid floating-field-grid--two learner-profile-edit-grid">
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input
                          value={editDraft?.guardianName || ''}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, guardianName: event.target.value } : current))}
                          placeholder=" "
                          disabled={isSaving || !editDraft}
                        />
                        <span>Guardian Name</span>
                      </div>
                    </label>
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input
                          value={editDraft?.fatherName || ''}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, fatherName: event.target.value } : current))}
                          placeholder=" "
                          disabled={isSaving || !editDraft}
                        />
                        <span>Father Name</span>
                      </div>
                    </label>
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input
                          value={editDraft?.motherName || ''}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, motherName: event.target.value } : current))}
                          placeholder=" "
                          disabled={isSaving || !editDraft}
                        />
                        <span>Mother Maiden Name</span>
                      </div>
                    </label>
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input
                          value={editDraft?.contactNumber || ''}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, contactNumber: event.target.value } : current))}
                          placeholder=" "
                          disabled={isSaving || !editDraft}
                        />
                        <span>Contact Number</span>
                      </div>
                    </label>
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input
                          value={editDraft?.email || ''}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, email: event.target.value } : current))}
                          placeholder=" "
                          disabled={isSaving || !editDraft}
                        />
                        <span>Email</span>
                      </div>
                    </label>
                    <label className="floating-field floating-field--full">
                      <div className="floating-field__control">
                        <textarea
                          value={editDraft?.address || ''}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, address: event.target.value } : current))}
                          placeholder=" "
                          rows={3}
                          disabled={isSaving || !editDraft}
                        />
                        <span>Address</span>
                      </div>
                    </label>
                  </div>

                  <div className="form-actions learner-profile-edit-actions">
                    <button type="button" className="secondary-button" onClick={handleOpenCorrectionRequest}>
                      Request main information correction
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={isSaving || !editDraft || !hasEditableChanges}
                      onClick={() => void handleSaveProfile()}
                    >
                      {isSaving ? 'Saving...' : 'Save Contact Details'}
                    </button>
                  </div>
                  {!hasEditableChanges ? (
                    <p className="learner-profile-edit-actions__hint">No contact detail changes detected.</p>
                  ) : null}
                </section>
              ) : (
                <article className="notice-box learner-hint__box">
                  <strong>Profile Editing</strong>
                  <span>Guardian, parent, contact, and address editing is currently managed by the registrar.</span>
                </article>
              )}

            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
