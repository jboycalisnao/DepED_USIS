import { useEffect, useMemo, useState } from 'react';
import {
  deleteLearnerPortalNotification,
  loadLearnerPortalNotifications,
  saveLearnerPortalNotification,
  type LearnerPortalNotificationDraft,
  type LearnerPortalNotificationRecord,
} from '../services/learnerPortalNotificationsService';
import '../../../../../registrar/styles/enrollmentAnnouncements.css';
import '../../../../../common/css/modals.css';
import { LearnerPortalNotificationFormModal } from '../components/LearnerPortalNotificationFormModal';

type NotificationDraft = LearnerPortalNotificationDraft;

const emptyDraft: NotificationDraft = {
  notificationKey: '',
  title: '',
  message: '',
  isActive: true,
  isPinned: false,
  sortOrder: 0,
};

export function LearnerPortalNotificationsPage() {
  const [rows, setRows] = useState<LearnerPortalNotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NotificationDraft>(emptyDraft);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const activeRows = useMemo(() => rows.filter((row) => row.isActive), [rows]);
  const loadRows = async () => {
    setIsLoading(true);
    setError('');
    try {
      setRows(await loadLearnerPortalNotifications());
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load learner portal notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const resetDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const beginCreate = () => {
    resetDraft();
    setStatusMessage('');
    setIsEditorOpen(true);
  };

  const beginEdit = (row: LearnerPortalNotificationRecord) => {
    setEditingId(row.id);
    setDraft({
      notificationKey: row.notificationKey,
      title: row.title,
      message: row.message,
      isActive: row.isActive,
      isPinned: row.isPinned,
      sortOrder: row.sortOrder,
    });
    setStatusMessage('');
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await saveLearnerPortalNotification(editingId, draft);
      setStatusMessage(editingId ? 'Notification updated.' : 'Notification created.');
      await loadRows();
      setIsEditorOpen(false);
      resetDraft();
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to save learner portal notification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (row: LearnerPortalNotificationRecord) => {
    if (!window.confirm(`Delete notification "${row.title}"?`)) return;
    setIsLoading(true);
    setError('');
    try {
      await deleteLearnerPortalNotification(row.id);
      if (editingId === row.id) {
        resetDraft();
        setIsEditorOpen(false);
      }
      await loadRows();
      setStatusMessage('Notification deleted.');
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Unable to delete notification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="portal-panel registrar-enrollment-announcements">
      <div className="portal-panel__header registrar-enrollment-announcements__header">
        <div>
          <h2>Learner Portal Notifications</h2>
          <p>Post notices that appear in the learner portal notification modal.</p>
        </div>
        <button type="button" className="primary-button" onClick={beginCreate} disabled={isLoading}>
          New Notification
        </button>
      </div>

      <div className="portal-panel__body registrar-enrollment-announcements__body">
        {error ? <div className="notice-box registrar-enrollment-announcements__notice">{error}</div> : null}
        {statusMessage ? <div className="notice-box registrar-enrollment-announcements__notice">{statusMessage}</div> : null}

        <section className="section-card registrar-enrollment-announcements__preview-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <h3>Learner Portal Preview</h3>
            <p>These notices are what learners will see inside the notification modal.</p>
            <div className="learner-portal-notifications-preview">
              {activeRows.length ? (
                activeRows.map((row) => (
                  <article key={row.id} className={`learner-portal-notifications-preview__card${row.isPinned ? ' is-pinned' : ''}`}>
                    <div className="learner-portal-notifications-preview__head">
                      <div>
                        <p className="learner-portal-notifications-preview__eyebrow">{row.isPinned ? 'Pinned' : 'Notice'}</p>
                        <h4>{row.title}</h4>
                      </div>
                      <span className={`registrar-enrollment-announcements__pill${row.isActive ? ' is-active' : ' is-inactive'}`}>{row.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p>{row.message}</p>
                  </article>
                ))
              ) : (
                <div className="notice-box">No active learner portal notifications yet.</div>
              )}
            </div>
          </div>
        </section>

        <div className="registrar-enrollment-announcements__grid">
          <section className="section-card registrar-enrollment-announcements__list">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Posted Notifications</h3>
              <p>Active notifications are listed here in posting order.</p>
              <div className="registrar-enrollment-announcements__cards">
                {rows.map((row) => (
                  <article key={row.id} className={`registrar-enrollment-announcements__card${row.isPinned ? ' is-pinned' : ''}`}>
                    <div className="registrar-enrollment-announcements__card-header">
                      <div>
                        <p className="registrar-enrollment-announcements__card-label">{row.isPinned ? 'Pinned' : 'Notice'}</p>
                        <h4>{row.title}</h4>
                      </div>
                      <span className={`registrar-enrollment-announcements__pill${row.isActive ? ' is-active' : ' is-inactive'}`}>{row.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="registrar-enrollment-announcements__message">{row.message}</p>
                    <div className="registrar-enrollment-announcements__actions">
                      <button type="button" className="secondary-button" onClick={() => beginEdit(row)} disabled={isLoading}>Edit</button>
                      <button type="button" className="secondary-button" onClick={() => void handleDelete(row)} disabled={isLoading}>Delete</button>
                    </div>
                  </article>
                ))}
                {!rows.length ? <div className="notice-box">No learner portal notifications posted yet.</div> : null}
              </div>
            </div>
          </section>

        </div>
      </div>

      {isLoading ? <div className="registrar-enrollment-announcements__loading">Loading...</div> : null}

      <LearnerPortalNotificationFormModal
        draft={draft}
        editingId={editingId}
        isOpen={isEditorOpen}
        isSaving={isLoading}
        onClose={() => setIsEditorOpen(false)}
        onSave={() => void handleSave()}
        onDraftChange={setDraft}
        onReset={resetDraft}
      />
    </section>
  );
}
