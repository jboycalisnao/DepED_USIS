import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';
import { useEffect, useMemo, useState } from 'react';
import { loadLearnerPortalNotifications, type LearnerPortalNotificationRecord } from '../services/learnerPortalNotifications';
import { loadLearnerPortalImportantDates, type LearnerPortalImportantDateRecord } from '../services/learnerPortalImportantDates';

type DashboardPageProps = {
  session: LearnerPortalAccessRecord;
};

export function DashboardPage({ session }: DashboardPageProps) {
  const [notifications, setNotifications] = useState<LearnerPortalNotificationRecord[]>([]);
  const [importantDates, setImportantDates] = useState<LearnerPortalImportantDateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [notificationRows, importantDateRows] = await Promise.all([
          loadLearnerPortalNotifications(),
          loadLearnerPortalImportantDates(),
        ]);
        if (cancelled) return;
        setNotifications(notificationRows);
        setImportantDates(importantDateRows);
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

  const upcomingDates = useMemo(
    () => importantDates.slice(0, 4),
    [importantDates],
  );

  const dashboardCards = [
    { label: 'Notifications', value: notifications.length, tone: 'blue' },
    { label: 'Important Dates', value: importantDates.length, tone: 'gold' },
  ];

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
            <p>Latest learner portal notices posted by Integrated Admin.</p>
          </header>
          <div className="portal-panel__body learner-dashboard-panel__body">
            {isLoading ? <p className="learner-services-history__state">Loading notifications...</p> : null}
            {!isLoading && !notifications.length ? (
              <div className="notice-box learner-hint__box">
                <strong>No Notifications</strong>
                <span>No active learner portal notifications are available right now.</span>
              </div>
            ) : null}
            {notifications.map((item) => (
              <article key={item.id} className={`learner-dashboard-card${item.isPinned ? ' is-pinned' : ''}`}>
                <div className="learner-dashboard-card__top">
                  <div>
                    <p>{item.isPinned ? 'Pinned Notice' : 'Notification'}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <span className={`status-badge ${item.isPinned ? 'status-badge--warning' : 'status-badge--info'}`}>
                    {item.isPinned ? 'Pinned' : 'New'}
                  </span>
                </div>
                <p>{item.message}</p>
              </article>
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
                  <div>
                    <p>{item.isPinned ? 'Pinned Reminder' : 'Reminder'}</p>
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
    </section>
  );
}
