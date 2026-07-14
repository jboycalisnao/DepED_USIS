import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { fetchLearnerProfile, type LearnerProfileRecord } from '../services/learnerProfile';
import {
  isLearnerPortalNotificationRead,
  loadLearnerPortalNotifications,
  setLearnerPortalNotificationReadState,
  subscribeLearnerPortalNotificationReadStateChange,
  type LearnerPortalNotificationRecord,
} from '../services/learnerPortalNotifications';
import { loadLearnerPortalImportantDates, type LearnerPortalImportantDateRecord } from '../services/learnerPortalImportantDates';
import { fetchLearnerPortalProfileEditingEnabled } from '../services/learnerPortalProfileEditing';
import { LearnerDashboardCard } from '../components/LearnerDashboardCard';

type DashboardPageProps = {
  session: LearnerPortalAccessRecord;
};

const PROFILE_EDITING_NOTICE = {
  id: 'learner-profile-self-service-editing',
  notificationKey: 'learner-profile-self-service-editing',
  updatedAt: 'enabled',
};

export function DashboardPage({ session }: DashboardPageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<LearnerProfileRecord | null>(null);
  const [notifications, setNotifications] = useState<LearnerPortalNotificationRecord[]>([]);
  const [importantDates, setImportantDates] = useState<LearnerPortalImportantDateRecord[]>([]);
  const [isProfileEditingEnabled, setIsProfileEditingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setReadStateRevision] = useState(0);
  const [activeNotification, setActiveNotification] = useState<LearnerPortalNotificationRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [notificationRows, importantDateRows, profileEditingEnabled] = await Promise.all([
          loadLearnerPortalNotifications(),
          loadLearnerPortalImportantDates(),
          fetchLearnerPortalProfileEditingEnabled(),
        ]);
        if (cancelled) return;
        setNotifications(notificationRows);
        setImportantDates(importantDateRows);
        setIsProfileEditingEnabled(profileEditingEnabled);
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message || 'Unable to load dashboard updates.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const learnerProfile = await fetchLearnerProfile({ learnerId: session.learnerId, lrn: session.lrn });
        if (!cancelled) setProfile(learnerProfile);
      } catch {
        if (!cancelled) setProfile(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn]);

  useEffect(() => subscribeLearnerPortalNotificationReadStateChange(() => setReadStateRevision((current) => current + 1)), []);

  const upcomingDates = useMemo(
    () => importantDates.slice(0, 4),
    [importantDates],
  );

  const unreadNotificationCount = notifications.reduce((count, item) => count + (isLearnerPortalNotificationRead(item) ? 0 : 1), 0)
    + (isProfileEditingEnabled && !isLearnerPortalNotificationRead(PROFILE_EDITING_NOTICE) ? 1 : 0);

  const dashboardCards = [
    { label: 'Notifications', value: unreadNotificationCount, tone: 'blue' },
    { label: 'Important Dates', value: importantDates.length, tone: 'gold' },
  ];
  const showEmptyNotificationsState = !isLoading && notifications.length === 0 && !isProfileEditingEnabled;
  const showProfileEditingNotice = !isLoading && isProfileEditingEnabled;

  const handleOpenNotification = (item: LearnerPortalNotificationRecord) => {
    setLearnerPortalNotificationReadState(item, true);
    setActiveNotification(item);
  };

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Dashboard</h2>
          <p>View quick learner updates and portal notices.</p>
        </header>
      </div>
      <nav className="enrollment-status-breadcrumb" aria-label="Learner dashboard breadcrumb">
        <span>{new Date().getFullYear()}-{new Date().getFullYear() + 1}</span>
        <span>/</span>
        <span>School Portal</span>
        <span>/</span>
        <span>Dashboard</span>
      </nav>
      <div className="learner-dashboard-top-grid">
        <LearnerDashboardCard session={session} profile={profile} isLoading={isLoading} />

        <div className="learner-dashboard-top-stack">
          <header className="enrollment-status-hero" role="banner">
            <div className="enrollment-status-hero__shape enrollment-status-hero__shape--left" aria-hidden="true" />
            <div className="enrollment-status-hero__shape enrollment-status-hero__shape--right" aria-hidden="true" />
            <h2>Welcome back, {session.learnerName}!</h2>
            <p>Always stay updated with your learner records and service requests.</p>
          </header>

          <article className="notice-box learner-hint__box">
            <strong>Session Access</strong>
            <span>Signed in as {session.username} (LRN: {session.lrn || 'N/A'}).</span>
          </article>
        </div>
      </div>

      <div className="learner-dashboard-summary">
        {dashboardCards.map((card) => (
          <article key={card.label} className={`learner-dashboard-summary__card learner-dashboard-summary__card--${card.tone}`}>
            <span>{card.label}</span>
            <strong>{isLoading ? '...' : card.value}</strong>
          </article>
        ))}
      </div>

      {error ? (
        <article className="notice-box learner-hint__box">
          <strong>Dashboard Notice</strong>
          <span>{error}</span>
        </article>
      ) : null}

      <div className="learner-dashboard-grid">
        <article className="portal-panel learner-dashboard-panel">
          <header className="portal-panel__header learner-tab-header">
            <h2>Notifications</h2>
            <p>Latest learner portal notices and service updates.</p>
          </header>
          <div className="portal-panel__body learner-dashboard-panel__body">
            {isLoading ? <p className="learner-services-history__state">Loading notifications...</p> : null}
            {showEmptyNotificationsState ? (
              <div className="notice-box learner-hint__box">
                <strong>No Notifications</strong>
                <span>No active learner portal notifications are available right now.</span>
              </div>
            ) : null}
            {showProfileEditingNotice ? (
              <button
                type="button"
                className="learner-dashboard-card learner-dashboard-card--actionable is-pinned"
                onClick={() => {
                  setLearnerPortalNotificationReadState(PROFILE_EDITING_NOTICE, true);
                  setActiveNotification({
                    id: PROFILE_EDITING_NOTICE.id,
                    notificationKey: PROFILE_EDITING_NOTICE.notificationKey,
                    title: 'Learner Profile Self-Service Editing',
                    message: 'Your registrar has enabled learner profile self-service editing. You can update allowed profile details from the Profile page in School Portal.',
                    isActive: true,
                    isPinned: true,
                    sortOrder: 0,
                    createdAt: '',
                    updatedAt: PROFILE_EDITING_NOTICE.updatedAt,
                  });
                }}
              >
                <div className="learner-dashboard-card__top">
                  <div className="learner-dashboard-card__top-copy">
                    <div className="learner-notice-tags">
                      <span className="learner-notice-tag learner-notice-tag--pinned">Pinned Notice</span>
                      <span className={`learner-notice-tag ${isLearnerPortalNotificationRead(PROFILE_EDITING_NOTICE) ? 'learner-notice-tag--success' : 'learner-notice-tag--warning'}`}>
                        {isLearnerPortalNotificationRead(PROFILE_EDITING_NOTICE) ? 'Read' : 'Unread'}
                      </span>
                    </div>
                    <h3>Learner Profile Self-Service Editing</h3>
                  </div>
                </div>
                <p>
                  Your registrar has enabled learner profile self-service editing. You can update allowed profile details
                  from the Profile page in School Portal.
                </p>
              </button>
            ) : null}
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`learner-dashboard-card learner-dashboard-card--actionable${item.isPinned ? ' is-pinned' : ''}`}
                onClick={() => handleOpenNotification(item)}
              >
                <div className="learner-dashboard-card__top">
                  <div className="learner-dashboard-card__top-copy">
                    <div className="learner-notice-tags">
                      <span className={`learner-notice-tag ${item.isPinned ? 'learner-notice-tag--pinned' : 'learner-notice-tag--info'}`}>
                        {item.isPinned ? 'Pinned Notice' : 'Portal Notice'}
                      </span>
                      <span className={`learner-notice-tag ${isLearnerPortalNotificationRead(item) ? 'learner-notice-tag--success' : item.isPinned ? 'learner-notice-tag--warning' : 'learner-notice-tag--info'}`}>
                        {isLearnerPortalNotificationRead(item) ? 'Read' : item.isPinned ? 'Pinned' : 'Unread'}
                      </span>
                    </div>
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <p>{item.message}</p>
              </button>
            ))}
          </div>
        </article>

        <article className="portal-panel learner-dashboard-panel">
          <header className="portal-panel__header learner-tab-header">
            <h2>Important Dates</h2>
            <p>Dates and deadlines to remember this school year.</p>
          </header>
          <div className="portal-panel__body learner-dashboard-panel__body">
            {isLoading ? <p className="learner-services-history__state">Loading important dates...</p> : null}
            {!isLoading && !upcomingDates.length ? (
              <div className="notice-box learner-hint__box">
                <strong>No Important Dates</strong>
                <span>No active dates have been posted yet.</span>
              </div>
            ) : null}
            {upcomingDates.map((item) => (
              <article key={item.id} className={`learner-dashboard-date${item.isPinned ? ' is-pinned' : ''}`}>
                <div className="learner-dashboard-date__top">
                  <div className="learner-dashboard-card__top-copy">
                    <div className="learner-notice-tags">
                      <span className={`learner-notice-tag ${item.isPinned ? 'learner-notice-tag--pinned' : 'learner-notice-tag--info'}`}>
                        {item.isPinned ? 'Pinned Reminder' : 'Reminder'}
                      </span>
                    </div>
                    <h3>{item.title}</h3>
                  </div>
                  <strong>{item.dueDate || 'TBA'}</strong>
                </div>
                <p>{item.details}</p>
              </article>
            ))}
          </div>
        </article>
      </div>

      {activeNotification ? createPortal(
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setActiveNotification(null)} />
          <div className="modal-dialog modal-dialog--wide learner-dashboard-notification-modal" role="dialog" aria-modal="true" aria-label="Dashboard notification details">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Dashboard Notice</p>
                <h3>{activeNotification.title}</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setActiveNotification(null)} aria-label="Close notification">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="modal-dialog__body">
              <p className="learner-notifications-modal__summary">
                {activeNotification.message}
              </p>
              {activeNotification.notificationKey === PROFILE_EDITING_NOTICE.notificationKey ? (
                <div className="learner-notifications-modal__card-actions">
                  <button
                    type="button"
                    className="modal-dialog__blue"
                    onClick={() => {
                      setActiveNotification(null);
                      navigate('/profile');
                    }}
                  >
                    Go to Profile
                  </button>
                </div>
              ) : null}
            </div>
            <div className="modal-dialog__actions">
              <button type="button" className="modal-dialog__blue" onClick={() => setActiveNotification(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}
