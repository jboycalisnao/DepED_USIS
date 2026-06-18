import { useEffect, useState } from 'react';
import {
  deleteLearnerPortalImportantDate,
  loadLearnerPortalImportantDates,
  saveLearnerPortalImportantDate,
  type LearnerPortalImportantDateDraft,
  type LearnerPortalImportantDateRecord,
} from '../services/learnerPortalImportantDatesService';
import '../../../../../registrar/styles/enrollmentAnnouncements.css';
import '../../../../../common/css/modals.css';
import { LearnerPortalImportantDateFormModal } from '../components/LearnerPortalImportantDateFormModal';

const emptyDraft: LearnerPortalImportantDateDraft = {
  dateKey: '',
  title: '',
  details: '',
  dueDate: '',
  isActive: true,
  isPinned: false,
  sortOrder: 0,
};

export function LearnerPortalImportantDatesPage() {
  const [rows, setRows] = useState<LearnerPortalImportantDateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const loadRows = async () => {
    setIsLoading(true);
    setError('');
    try {
      setRows(await loadLearnerPortalImportantDates());
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load learner portal important dates.');
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

  const beginEdit = (row: LearnerPortalImportantDateRecord) => {
    setEditingId(row.id);
    setDraft({
      dateKey: row.dateKey,
      title: row.title,
      details: row.details,
      dueDate: row.dueDate,
      isActive: row.isActive,
      isPinned: row.isPinned,
      sortOrder: row.sortOrder,
    });
    setStatusMessage('');
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.details.trim()) {
      setError('Title and details are required.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await saveLearnerPortalImportantDate(editingId, draft);
      setStatusMessage(editingId ? 'Important date updated.' : 'Important date created.');
      await loadRows();
      setIsEditorOpen(false);
      resetDraft();
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to save learner portal important date.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (row: LearnerPortalImportantDateRecord) => {
    if (!window.confirm(`Delete important date "${row.title}"?`)) return;
    setIsLoading(true);
    setError('');
    try {
      await deleteLearnerPortalImportantDate(row.id);
      if (editingId === row.id) {
        resetDraft();
        setIsEditorOpen(false);
      }
      await loadRows();
      setStatusMessage('Important date deleted.');
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Unable to delete important date.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="portal-panel registrar-enrollment-announcements">
      <div className="portal-panel__header registrar-enrollment-announcements__header">
        <div>
          <h2>Learner Portal Important Dates</h2>
          <p>Post deadlines and dates that will appear on the learner dashboard.</p>
        </div>
        <button type="button" className="primary-button" onClick={beginCreate} disabled={isLoading}>
          New Important Date
        </button>
      </div>

      <div className="portal-panel__body registrar-enrollment-announcements__body">
        {error ? <div className="notice-box registrar-enrollment-announcements__notice">{error}</div> : null}
        {statusMessage ? <div className="notice-box registrar-enrollment-announcements__notice">{statusMessage}</div> : null}

        <div className="registrar-enrollment-announcements__grid">
          <section className="section-card registrar-enrollment-announcements__list">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Posted Dates</h3>
              <p>These dates are shown in the learner dashboard.</p>
              <div className="registrar-enrollment-announcements__cards">
                {rows.map((row) => (
                  <article key={row.id} className={`registrar-enrollment-announcements__card${row.isPinned ? ' is-pinned' : ''}`}>
                    <div className="registrar-enrollment-announcements__card-header">
                      <div>
                        <p className="registrar-enrollment-announcements__card-label">{row.isPinned ? 'Pinned' : 'Date'}</p>
                        <h4>{row.title}</h4>
                      </div>
                      <span className={`registrar-enrollment-announcements__pill${row.isActive ? ' is-active' : ' is-inactive'}`}>{row.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="registrar-enrollment-announcements__message">{row.details}</p>
                    <p className="registrar-enrollment-announcements__message">Due Date: {row.dueDate || 'TBA'}</p>
                    <div className="registrar-enrollment-announcements__actions">
                      <button type="button" className="secondary-button" onClick={() => beginEdit(row)} disabled={isLoading}>Edit</button>
                      <button type="button" className="secondary-button" onClick={() => void handleDelete(row)} disabled={isLoading}>Delete</button>
                    </div>
                  </article>
                ))}
                {!rows.length ? <div className="notice-box">No important dates posted yet.</div> : null}
              </div>
            </div>
          </section>

        </div>
      </div>

      {isLoading ? <div className="registrar-enrollment-announcements__loading">Loading...</div> : null}

      <LearnerPortalImportantDateFormModal
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
