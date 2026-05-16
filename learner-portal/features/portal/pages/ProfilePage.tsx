import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';
import { useEffect, useState } from 'react';
import { fetchLearnerProfile, type LearnerProfileRecord } from '../services/learnerProfile';

type ProfilePageProps = {
  session: LearnerPortalAccessRecord;
};

export function ProfilePage({ session }: ProfilePageProps) {
  const [profile, setProfile] = useState<LearnerProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const record = await fetchLearnerProfile({ learnerId: session.learnerId, lrn: session.lrn });
        if (!cancelled) setProfile(record);
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
                  <article><span>Mother Name</span><strong>{show(profile?.motherName || '')}</strong></article>
                </div>
              </section>

              <section className="learner-profile-card">
                <h4>Portal Account</h4>
                <div className="learner-profile-fields">
                  <article><span>Username</span><strong>{show(profile?.loginUsername || session.username)}</strong></article>
                  <article><span>Login Status</span><strong>{show(profile?.loginStatus || session.loginStatus)}</strong></article>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
