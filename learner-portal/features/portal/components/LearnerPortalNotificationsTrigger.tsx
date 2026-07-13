import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { LearnerPortalNotificationRecord } from '../services/learnerPortalNotifications';
import {
  isLearnerPortalNotificationRead,
  loadLearnerPortalNotifications,
  markLearnerPortalNotificationsAsRead,
  setLearnerPortalNotificationReadState,
  subscribeLearnerPortalNotificationReadStateChange,
} from '../services/learnerPortalNotifications';
import { fetchLearnerPortalProfileEditingEnabled } from '../services/learnerPortalProfileEditing';

type LearnerPortalNotificationsTriggerProps = {
  learnerName: string;
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const PROFILE_EDITING_NOTICE = {
  id: 'learner-profile-self-service-editing',
  notificationKey: 'learner-profile-self-service-editing',
  updatedAt: 'enabled',
};

export function LearnerPortalNotificationsTrigger({ learnerName }: LearnerPortalNotificationsTriggerProps) {
  const [notifications, setNotifications] = useState<LearnerPortalNotificationRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileEditingEnabled, setIsProfileEditingEnabled] = useState(false);
  const [, setReadStateRevision] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError('');
      const [notificationsResult, profileEditingResult] = await Promise.allSettled([
        loadLearnerPortalNotifications(),
        fetchLearnerPortalProfileEditingEnabled(),
      ]);

      if (cancelled) return;

      if (notificationsResult.status === 'fulfilled') {
        setNotifications(notificationsResult.value);
      } else {
        setError(notificationsResult.reason?.message || 'Unable to load notifications.');
      }

      if (profileEditingResult.status === 'fulfilled') {
        setIsProfileEditingEnabled(profileEditingResult.value);
      }

      if (!cancelled) setIsLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribeLearnerPortalNotificationReadStateChange(() => setReadStateRevision((current) => current + 1)), []);

  useEffect(() => {
    if (!isOpen || isLoading || error) return;
    const itemsToMark = [
      ...notifications,
      ...(isProfileEditingEnabled ? [PROFILE_EDITING_NOTICE] : []),
    ];
    if (itemsToMark.length > 0) {
      markLearnerPortalNotificationsAsRead(itemsToMark);
    }
  }, [error, isLoading, isOpen, isProfileEditingEnabled, notifications]);

  const isProfileEditingNoticeRead = isProfileEditingEnabled ? isLearnerPortalNotificationRead(PROFILE_EDITING_NOTICE) : false;
  const notificationEntries = notifications.map((item) => ({
    item,
    isRead: isLearnerPortalNotificationRead(item),
  }));
  const unreadCount = notifications.reduce((count, item) => count + (isLearnerPortalNotificationRead(item) ? 0 : 1), 0)
    + (isProfileEditingEnabled && !isProfileEditingNoticeRead ? 1 : 0);
  return (
    <>
      <button
        type="button"
        className="learner-notifications-trigger"
        aria-label={`Open learner notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
        <span className="learner-notifications-trigger__label">Notifications</span>
        {unreadCount > 0 ? <span className="learner-notifications-trigger__badge">{unreadCount}</span> : null}
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
                Portal notifications appear here for {learnerName || 'the learner'}.
              </p>
              {isLoading ? <p className="learner-services-history__state">Loading notifications...</p> : null}
              {error ? <div className="notice-box learner-hint__box"><strong>System Notice</strong><span>{error}</span></div> : null}
              {!isLoading && !error ? (
                notifications.length || isProfileEditingEnabled ? (
                  <div className="learner-notifications-modal__list">
                    {isProfileEditingEnabled ? (
                      <article className="learner-notifications-modal__card is-pinned learner-notifications-modal__card--system">
                        <div className="learner-notifications-modal__card-top">
                          <div>
                            <p className="learner-notifications-modal__eyebrow">Learner Portal</p>
                            <h4>Learner Profile Self-Service Editing</h4>
                          </div>
                          <span className={`status-badge ${isProfileEditingNoticeRead ? 'status-badge--success' : 'status-badge--warning'}`}>
                            {isProfileEditingNoticeRead ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <p>
                          Your registrar has enabled learner profile self-service editing. You can review and update allowed
                          profile information from your School Portal profile page.
                        </p>
                        <div className="learner-notifications-modal__card-actions">
                          {!isProfileEditingNoticeRead ? (
                            <button
                              type="button"
                              className="learner-notifications-modal__read-button"
                              onClick={() => setLearnerPortalNotificationReadState(PROFILE_EDITING_NOTICE, true)}
                            >
                              Mark as read
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="modal-dialog__blue"
                            onClick={() => {
                              setIsOpen(false);
                              navigate('/profile');
                            }}
                          >
                            Go to Profile
                          </button>
                        </div>
                      </article>
                    ) : null}

                    {notificationEntries.map(({ item, isRead }) => (
                      <article key={item.id} className={`learner-notifications-modal__card${item.isPinned ? ' is-pinned' : ''}`}>
                        <div className="learner-notifications-modal__card-top">
                          <div>
                            <p className="learner-notifications-modal__eyebrow">{item.isPinned ? 'Pinned Notice' : 'Notification'}</p>
                            <h4>{item.title}</h4>
                          </div>
                          <span className={`status-badge ${isRead ? 'status-badge--success' : item.isPinned ? 'status-badge--warning' : 'status-badge--info'}`}>
                            {isRead ? 'Read' : item.isPinned ? 'Pinned' : 'Unread'}
                          </span>
                        </div>
                        <p>{item.message}</p>
                        {item.createdAt ? <small>{isRead ? 'Viewed' : 'Posted'} {formatDate(item.createdAt)}</small> : null}
                        <div className="learner-notifications-modal__card-actions">
                          {!isRead ? (
                            <button
                              type="button"
                              className="learner-notifications-modal__read-button"
                              onClick={() => setLearnerPortalNotificationReadState(item, true)}
                            >
                              Mark as read
                            </button>
                          ) : null}
                        </div>
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
