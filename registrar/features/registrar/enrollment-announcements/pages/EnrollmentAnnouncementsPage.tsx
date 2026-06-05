import { useEffect, useMemo, useState } from 'react';
import { EnrollmentAnnouncementsBox } from '../../../../../common/components/enrollment/EnrollmentAnnouncementsBox';
import type { EnrollmentAnnouncement } from '../../../../../common/types/enrollmentAnnouncements';
import { resolveLearnerEnrollmentAnnouncements } from '../../../../../common/utils/enrollmentAnnouncements';
import { supabase } from '../../../../lib/supabase';
import {
  deleteEnrollmentAnnouncement,
  fetchEnrollmentAnnouncements,
  saveEnrollmentAnnouncement,
} from '../services/enrollmentAnnouncements';
import '../../../../styles/enrollmentAnnouncements.css';

type AnnouncementDraft = {
  title: string;
  message: string;
  isActive: boolean;
  isPinned: boolean;
  isHighlighted: boolean;
  sortOrder: number;
  announcementKey: string;
};

const emptyDraft: AnnouncementDraft = {
  title: '',
  message: '',
  isActive: true,
  isPinned: false,
  isHighlighted: true,
  sortOrder: 0,
  announcementKey: '',
};

export default function EnrollmentAnnouncementsPage() {
  const [rows, setRows] = useState<EnrollmentAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyDraft);
  const [isVerificationEnabled, setIsVerificationEnabled] = useState(false);

  const activeRows = useMemo(() => rows.filter((row) => row.isActive), [rows]);
  const previewRows = useMemo(
    () => resolveLearnerEnrollmentAnnouncements(activeRows, isVerificationEnabled),
    [activeRows, isVerificationEnabled],
  );

  const loadAnnouncements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await fetchEnrollmentAnnouncements());
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load announcements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadVerificationState = async () => {
      try {
        const { data, error } = await supabase
          .from('registrar_enrollment_form_schedule')
          .select('information_verification_and_update_enabled')
          .eq('id', 1)
          .maybeSingle();
        if (!cancelled && !error) {
          setIsVerificationEnabled(Boolean((data as any)?.information_verification_and_update_enabled));
        }
      } catch {
        if (!cancelled) setIsVerificationEnabled(false);
      }
    };

    void loadVerificationState();
    return () => {
      cancelled = true;
    };
  }, []);

  const beginCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setStatusMessage(null);
  };

  const beginEdit = (row: EnrollmentAnnouncement) => {
    setEditingId(row.id);
    setDraft({
      title: row.title,
      message: row.message,
      isActive: row.isActive,
      isPinned: row.isPinned,
      isHighlighted: row.isHighlighted,
      sortOrder: row.sortOrder,
      announcementKey: row.announcementKey,
    });
    setStatusMessage(null);
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.message.trim()) {
      setError('Title and message are required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await saveEnrollmentAnnouncement(editingId, draft);
      setStatusMessage(editingId ? 'Announcement updated.' : 'Announcement created.');
      await loadAnnouncements();
      beginCreate();
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to save announcement.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAnnouncementState = async (row: EnrollmentAnnouncement, nextState: boolean, field: 'isActive' | 'isPinned') => {
    setIsLoading(true);
    setError(null);
    try {
      await saveEnrollmentAnnouncement(row.id, {
        title: row.title,
        message: row.message,
        isActive: field === 'isActive' ? nextState : row.isActive,
        isPinned: field === 'isPinned' ? nextState : row.isPinned,
        isHighlighted: row.isHighlighted,
        sortOrder: row.sortOrder,
        announcementKey: row.announcementKey,
      });
      await loadAnnouncements();
    } catch (toggleError: any) {
      setError(toggleError?.message || 'Unable to update announcement.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeAnnouncement = async (row: EnrollmentAnnouncement) => {
    const confirmed = window.confirm(`Delete announcement "${row.title}"?`);
    if (!confirmed) return;
    setIsLoading(true);
    setError(null);
    try {
      await deleteEnrollmentAnnouncement(row.id);
      if (editingId === row.id) beginCreate();
      await loadAnnouncements();
      setStatusMessage('Announcement deleted.');
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Unable to delete announcement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="portal-panel registrar-enrollment-announcements">
      <div className="portal-panel__header registrar-enrollment-announcements__header">
        <div>
          <h2>Enrollment Announcements</h2>
          <p>Manage the announcements shown to learners in the enrollment portal.</p>
        </div>
        <button type="button" className="primary-button" onClick={beginCreate} disabled={isLoading}>
          New Announcement
        </button>
      </div>

      <div className="portal-panel__body registrar-enrollment-announcements__body">
        {error ? <div className="notice-box registrar-enrollment-announcements__notice">{error}</div> : null}
        {statusMessage ? <div className="notice-box registrar-enrollment-announcements__notice">{statusMessage}</div> : null}

        <section className="section-card registrar-enrollment-announcements__preview-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <h3>Learner-Facing Preview</h3>
            <p>What learners will see after they accept the advisory modal.</p>
            <div className="registrar-enrollment-announcements__preview">
              <EnrollmentAnnouncementsBox announcements={previewRows} subtitle="Highlighted cards appear first, with the pinned notice always on top." />
            </div>
          </div>
        </section>

        <div className="registrar-enrollment-announcements__grid">
          <section className="section-card registrar-enrollment-announcements__list">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>Posted Announcements</h3>
              <p>Active enrollment notices are listed here in the order learners will read them.</p>
              <div className="registrar-enrollment-announcements__cards">
                {rows.map((row) => (
                  <article key={row.id} className={`registrar-enrollment-announcements__card${row.isPinned ? ' is-pinned' : ''}${row.isHighlighted ? ' is-highlighted' : ''}`}>
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
                      <button type="button" className="secondary-button" onClick={() => void toggleAnnouncementState(row, !row.isPinned, 'isPinned')} disabled={isLoading}>
                        {row.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button type="button" className="secondary-button" onClick={() => void toggleAnnouncementState(row, !row.isActive, 'isActive')} disabled={isLoading}>
                        {row.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button type="button" className="secondary-button" onClick={() => void removeAnnouncement(row)} disabled={isLoading}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
                {!rows.length ? <div className="notice-box">No announcements posted yet.</div> : null}
              </div>
            </div>
          </section>

          <section className="section-card registrar-enrollment-announcements__editor">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <h3>{editingId ? 'Edit Announcement' : 'Create Announcement'}</h3>
              <p>Keep announcement copy concise and enrollment-focused.</p>
              <div className="floating-field-grid registrar-enrollment-announcements__editor-grid">
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder=" " />
                    <span>Title</span>
                  </div>
                </label>
                <label className="floating-field registrar-enrollment-announcements__message-field">
                  <div className="floating-field__control">
                    <textarea value={draft.message} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} placeholder=" " rows={6} />
                    <span>Message</span>
                  </div>
                </label>
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={String(draft.sortOrder)} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))} placeholder=" " type="number" />
                    <span>Sort Order</span>
                  </div>
                </label>
              </div>

              <div className="registrar-enrollment-announcements__toggles">
                <label className="choice-row registrar-enrollment-announcements__toggle">
                  <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                  <span>Active</span>
                </label>
                <label className="choice-row registrar-enrollment-announcements__toggle">
                  <input type="checkbox" checked={draft.isPinned} onChange={(event) => setDraft((current) => ({ ...current, isPinned: event.target.checked }))} />
                  <span>Pinned</span>
                </label>
                <label className="choice-row registrar-enrollment-announcements__toggle">
                  <input type="checkbox" checked={draft.isHighlighted} onChange={(event) => setDraft((current) => ({ ...current, isHighlighted: event.target.checked }))} />
                  <span>Highlighted</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={beginCreate} disabled={isLoading}>
                  Reset
                </button>
                <button type="button" className="primary-button" onClick={() => void save()} disabled={isLoading}>
                  {editingId ? 'Update Announcement' : 'Save Announcement'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      {isLoading ? <div className="registrar-enrollment-announcements__loading">Loading...</div> : null}
    </section>
  );
}
