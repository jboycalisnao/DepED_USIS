import { useEffect, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';
import type { LearnerProfileRecord } from '../services/learnerProfile';
import headerImage from '../../../../common/assets/Leon-NHS_USIS-Header-Image.png';
import userIcon from '../../../../common/assets/User_Icon.png';

type LearnerDashboardCardProps = {
  session: LearnerPortalAccessRecord;
  profile: LearnerProfileRecord | null;
  isLoading: boolean;
};

const showValue = (value?: string) => {
  const text = String(value || '').trim();
  return text || 'N/A';
};

export function LearnerDashboardCard({ session, profile, isLoading }: LearnerDashboardCardProps) {
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [hasPhotoError, setHasPhotoError] = useState(false);
  const fullName = showValue((profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : '') || session.learnerName);
  const gradeSection = [profile?.gradeLevel, profile?.sectionName].filter(Boolean).join(' - ');
  const profilePhotoUrl = profile?.profilePhotoDriveFileId
    ? `/api/learner-profile-photo?learnerId=${encodeURIComponent(profile.id)}&lrn=${encodeURIComponent(profile.lrn || session.lrn)}&v=${encodeURIComponent(profile.profilePhotoUpdatedAt || '')}`
    : '';
  const shouldLoadProfilePhoto = Boolean(profilePhotoUrl && !hasPhotoError);
  const isAvatarLoading = isPhotoLoading || (isLoading && !profile);

  useEffect(() => {
    setHasPhotoError(false);
    setIsPhotoLoading(Boolean(profilePhotoUrl));
  }, [profilePhotoUrl]);

  return (
    <article className="portal-panel learner-dashboard-card-panel">
      <div className="learner-dashboard-card-panel__header">
        <img
          src={headerImage}
          alt="Leon NHS USIS header"
          className="learner-dashboard-card-panel__header-image"
          loading="eager"
        />
        <div className="learner-dashboard-card-panel__header-copy">
          <h2 className="learner-dashboard-card-panel__title">Learner Card</h2>
        </div>
      </div>

      <div className="learner-dashboard-card-panel__body">
        <div className="learner-dashboard-card-panel__avatar-wrap" aria-hidden="true">
          {isAvatarLoading ? <span className="learner-dashboard-card-panel__avatar-spinner" /> : null}
          <img
            src={shouldLoadProfilePhoto ? profilePhotoUrl : userIcon}
            alt=""
            className={`learner-dashboard-card-panel__avatar-image${shouldLoadProfilePhoto ? ' learner-dashboard-card-panel__avatar-image--photo' : ''}${isAvatarLoading ? ' learner-dashboard-card-panel__avatar-image--loading' : ''}`}
            onLoad={() => setIsPhotoLoading(false)}
            onError={(event) => {
              setHasPhotoError(true);
              setIsPhotoLoading(false);
              event.currentTarget.src = userIcon;
              event.currentTarget.classList.remove('learner-dashboard-card-panel__avatar-image--photo');
              event.currentTarget.classList.remove('learner-dashboard-card-panel__avatar-image--loading');
            }}
          />
        </div>

        <div className="learner-dashboard-card-panel__content">
          <div className="learner-dashboard-card-panel__identity">
            <h3>{fullName}</h3>
            <p>LRN</p>
            <strong>{isLoading ? 'Loading...' : showValue(profile?.lrn || session.lrn)}</strong>
          </div>

          <div className="learner-dashboard-card-panel__details">
            <section className="learner-dashboard-card-panel__detail">
              <span>Grade Level and Section</span>
              <strong>{isLoading ? 'Loading...' : showValue(gradeSection)}</strong>
            </section>
            <section className="learner-dashboard-card-panel__detail">
              <span>Program</span>
              <strong>{isLoading ? 'Loading...' : showValue(profile?.program)}</strong>
            </section>
            <section className="learner-dashboard-card-panel__detail">
              <span>Login Status</span>
              <strong>{showValue(profile?.loginStatus || session.loginStatus)}</strong>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
