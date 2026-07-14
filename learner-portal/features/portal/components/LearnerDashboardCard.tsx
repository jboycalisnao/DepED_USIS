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
  const fullName = showValue((profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : '') || session.learnerName);
  const gradeSection = [profile?.gradeLevel, profile?.sectionName].filter(Boolean).join(' - ');

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
          <img src={userIcon} alt="" className="learner-dashboard-card-panel__avatar-image" />
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
