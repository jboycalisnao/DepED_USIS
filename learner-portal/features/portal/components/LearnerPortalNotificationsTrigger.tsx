import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LearnerPortalNotificationRecord } from '../services/learnerPortalNotifications';
import { loadLearnerPortalNotifications } from '../services/learnerPortalNotifications';

type LearnerPortalNotificationsTriggerProps = {
  learnerName: string;
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export function LearnerPortalNotificationsTrigger({ learnerName }: LearnerPortalNotificationsTriggerProps) {
  const [notifications, setNotifications] = useState<LearnerPortalNotificationRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const rows = await loadLearnerPortalNotifications();
        if (!cancelled) setNotifications(rows);
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message || 'Unable to load notifications.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const notificationCount = notifications.length;
  return (
    <>
      <button
        type="button"
        className="learner-notifications-trigger"
        aria-label={`Open learner notifications${notificationCount ? `, ${notificationCount} available` : ''}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
        <span className="learner-notifications-trigger__label">Notifications</span>
        <span className="learner-notifications-trigger__badge">{notificationCount}</span>
      </button>

      {isOpen ? createPortal(
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setIsOpen(false)} />
          <div className="modal-dialog modal-dialog--wide learner-notifications-modal" role="dialog" aria-modal="true" aria-label="Learner portal notifications">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Learner Portal</p>
                <h3>Notifications</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setIsOpen(false)} aria-label="Close notifications">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="modal-dialog__body learner-notifications-modal__body">
              <p className="learner-notifications-modal__summary">
                Notifications posted from Integrated Admin appear here for {learnerName || 'the learner'}.
              </p>
              {isLoading ? <p className="learner-services-history__state">Loading notifications...</p> : null}
              {error ? <div className="notice-box learner-hint__box"><strong>System Notice</strong><span>{error}</span></div> : null}
              {!isLoading && !error ? (
                notifications.length ? (
                  <div className="learner-notifications-modal__list">
                    {notifications.map((item) => (
                      <article key={item.id} className={`learner-notifications-modal__card${item.isPinned ? ' is-pinned' : ''}`}>
                        <div className="learner-notifications-modal__card-top">
                          <div>
                            <p className="learner-notifications-modal__eyebrow">{item.isPinned ? 'Pinned Notice' : 'Notification'}</p>
                            <h4>{item.title}</h4>
                          </div>
                          <span className={`status-badge ${item.isPinned ? 'status-badge--warning' : 'status-badge--info'}`}>
                            {item.isPinned ? 'Pinned' : 'New'}
                          </span>
                        </div>
                        <p>{item.message}</p>
                        {item.createdAt ? <small>Posted {formatDate(item.createdAt)}</small> : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="notice-box learner-hint__box">
                    <strong>No Notifications</strong>
                    <span>There are no active learner portal notifications at the moment.</span>
                  </div>
                )
              ) : null}
            </div>
            <div className="modal-dialog__actions">
              <button type="button" className="modal-dialog__blue" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
