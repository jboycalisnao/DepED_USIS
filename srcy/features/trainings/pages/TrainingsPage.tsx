import { useEffect, useMemo, useState } from 'react';
import type { SrcyAccessRecord } from '../../auth/services/srcyAccess';
import {
  attachParticipantsToTraining,
  createSrcyTraining,
  deleteSrcyTraining,
  detachParticipantFromTraining,
  loadAllTrainingParticipants,
  loadSrcyTrainings,
  updateSrcyTraining,
  type SrcyParticipationStatus,
  type SrcyTrainingDraft,
  type SrcyTrainingParticipantRecord,
  type SrcyTrainingRecord,
} from '../services/srcyTrainingService';
import {
  loadSrcyMembers,
  type SrcyMemberRecord,
} from '../../members/services/srcyMembershipService';
import { loadActiveSchoolYearLabel } from '../../members/services/srcyDomService';
import { invalidateMemberDetailsCache } from '../../members/services/srcyMemberDetailsCache';
import { TrainingFormModal } from '../modals/TrainingFormModal';
import { TrainingParticipantsModal } from '../modals/TrainingParticipantsModal';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import {
  UsisSearchableSelect,
  type UsisSearchableSelectOption,
} from '../../../../common/components/ui/UsisSearchableSelect';

type TrainingsPageProps = {
  session: SrcyAccessRecord;
};

const statusFilterOptions: UsisSearchableSelectOption[] = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Archived', value: 'Archived' },
];

export function TrainingsPage({ session: _session }: TrainingsPageProps) {
  const [trainings, setTrainings] = useState<SrcyTrainingRecord[]>([]);
  const [members, setMembers] = useState<SrcyMemberRecord[]>([]);
  const [allParticipants, setAllParticipants] = useState<SrcyTrainingParticipantRecord[]>([]);
  const [activeSchoolYear, setActiveSchoolYear] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'info' } | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<SrcyTrainingRecord | null>(null);

  const [managingTraining, setManagingTraining] = useState<SrcyTrainingRecord | null>(null);
  const [trainingToDelete, setTrainingToDelete] = useState<SrcyTrainingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      const [loadedTrainings, loadedMembers, loadedParts, activeSy] = await Promise.all([
        loadSrcyTrainings(),
        loadSrcyMembers(),
        loadAllTrainingParticipants(),
        loadActiveSchoolYearLabel(),
      ]);
      setTrainings(loadedTrainings);
      setMembers(loadedMembers);
      setAllParticipants(loadedParts);
      if (activeSy) setActiveSchoolYear(activeSy);
    } catch (err: any) {
      setAlert({
        title: 'Loading Error',
        message: err?.message || 'Unable to load council trainings.',
        tone: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  // Compute unique participant count per training (deduplicating multi-term learner records)
  const participantCountByTraining = useMemo(() => {
    const map = new Map<string, number>();
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const trainingToLearners = new Map<string, Set<string>>();

    allParticipants.forEach((p) => {
      const learnerKey = memberMap.get(p.membershipId)?.learnerLrn?.trim() || p.membershipId;
      if (!trainingToLearners.has(p.trainingId)) {
        trainingToLearners.set(p.trainingId, new Set());
      }
      trainingToLearners.get(p.trainingId)!.add(learnerKey);
    });

    trainingToLearners.forEach((learners, tId) => {
      map.set(tId, learners.size);
    });
    return map;
  }, [allParticipants, members]);

  // Overall statistics
  const counts = useMemo(() => {
    const total = trainings.length;
    let completed = 0;
    let scheduled = 0;
    let inProgress = 0;

    trainings.forEach((t) => {
      if (t.status === 'Completed') completed++;
      else if (t.status === 'Scheduled') scheduled++;
      else if (t.status === 'In Progress') inProgress++;
    });

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const uniqueLearners = new Set(
      allParticipants.map((p) => memberMap.get(p.membershipId)?.learnerLrn?.trim() || p.membershipId)
    );

    return {
      total,
      completed,
      scheduled,
      inProgress,
      totalParticipations: allParticipants.length,
      uniqueMembersTrained: uniqueLearners.size,
    };
  }, [trainings, allParticipants, members]);

  // Filtered trainings
  const filteredTrainings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trainings.filter((t) => {
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesSearch =
        !q ||
        [t.title, t.description, t.venue, t.facilitator, t.schoolYear, t.trainingDate]
          .join(' ')
          .toLowerCase()
          .includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [trainings, statusFilter, search]);

  const handleSaveTraining = async (draft: SrcyTrainingDraft, id?: string): Promise<SrcyTrainingRecord> => {
    if (id) {
      const updated = await updateSrcyTraining(id, draft);
      setTrainings((prev) => prev.map((t) => (t.id === id ? updated : t)));
      invalidateMemberDetailsCache();
      setAlert({
        title: 'Training Updated',
        message: `Training "${updated.title}" was updated successfully.`,
        tone: 'success',
      });
      return updated;
    } else {
      const created = await createSrcyTraining(draft);
      setTrainings((prev) => [created, ...prev]);
      setAlert({
        title: 'Training Created',
        message: `New council training "${created.title}" was recorded successfully.`,
        tone: 'success',
      });
      return created;
    }
  };

  const handleConfirmDelete = async () => {
    if (!trainingToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSrcyTraining(trainingToDelete.id);
      setTrainings((prev) => prev.filter((t) => t.id !== trainingToDelete.id));
      setAllParticipants((prev) => prev.filter((p) => p.trainingId !== trainingToDelete.id));
      invalidateMemberDetailsCache();
      setAlert({
        title: 'Training Removed',
        message: `Training "${trainingToDelete.title}" has been deleted.`,
        tone: 'success',
      });
      setTrainingToDelete(null);
    } catch (err: any) {
      setAlert({
        title: 'Delete Failed',
        message: err?.message || 'Unable to delete training.',
        tone: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAttachParticipants = async (
    trainingId: string,
    memberIds: string[],
    status?: SrcyParticipationStatus
  ) => {
    await attachParticipantsToTraining(trainingId, memberIds, status);
    memberIds.forEach((mId) => invalidateMemberDetailsCache(mId));
    setAlert({
      title: 'Participants Enrolled',
      message: `${memberIds.length} member(s) have been successfully enrolled in the training.`,
      tone: 'success',
    });
  };

  const handleDetachParticipant = async (trainingId: string, memberId: string) => {
    await detachParticipantFromTraining(trainingId, memberId);
    invalidateMemberDetailsCache(memberId);
    setAlert({
      title: 'Participant Removed',
      message: 'Participant was removed from the training record.',
      tone: 'success',
    });
  };

  if (isLoading) return <UsisPageLoader message="Loading council trainings and records..." />;

  return (
    <section className="section-shell">
      {/* USIS Global Page Intro */}
      <div className="page-intro srcy-page-intro">
        <p className="page-intro__eyebrow">Senior Red Cross Youth Council</p>
        <h1>Council Trainings &amp; Certifications</h1>
        <p>
          Organize, schedule, and track youth leadership orientations, first aid, disaster preparedness, and community volunteer programs. Enrolled participants automatically reflect in their official Member Information Sheet (MIS).
        </p>
      </div>

      {/* USIS Standard Summary Cards Grid */}
      <section className="srcy-summary-grid" aria-label="Trainings summary cards">
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Total Council Trainings</span>
            <strong>{counts.total}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Completed Trainings</span>
            <strong style={{ color: 'var(--deped-green, #107c41)' }}>{counts.completed}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Scheduled / Upcoming</span>
            <strong style={{ color: 'var(--deped-yellow, #b78103)' }}>
              {counts.scheduled + counts.inProgress}
            </strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Members Trained</span>
            <strong>{counts.uniqueMembersTrained}</strong>
          </div>
        </article>
      </section>

      {/* USIS Portal Panel */}
      <section className="portal-panel">
        <header className="portal-panel__header srcy-list-header">
          <div>
            <h2>Council Trainings Directory</h2>
            <p className="srcy-panel-header__subtitle">
              {filteredTrainings.length} {filteredTrainings.length === 1 ? 'training' : 'trainings'} listed
              {statusFilter !== 'All' ? ` (${statusFilter})` : ''}
            </p>
          </div>
          <div className="srcy-list-header__actions">
            <label className="floating-field srcy-search-field">
              <div className="floating-field__control">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder=" "
                />
                <span>Search trainings by title, venue...</span>
              </div>
            </label>

            <div className="srcy-filter-select-wrap">
              <UsisSearchableSelect
                ariaLabel="Filter training by status"
                label="Filter Status"
                floatingLabel
                allowTyping={false}
                forcePortalMenu
                options={statusFilterOptions}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val || 'All')}
                placeholder="All Statuses"
              />
            </div>

            <button
              type="button"
              className="primary-button srcy-register-btn"
              onClick={() => {
                setEditingTraining(null);
                setIsFormModalOpen(true);
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
              <span>Record Training</span>
            </button>
          </div>
        </header>

        <div className="portal-panel__body">
          {filteredTrainings.length === 0 ? (
            <div className="srcy-empty-state">
              <span className="material-symbols-outlined" aria-hidden="true">model_training</span>
              <p>No council trainings found matching your filters.</p>
              {search || statusFilter !== 'All' ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('All');
                  }}
                  style={{ marginTop: '8px' }}
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setEditingTraining(null);
                    setIsFormModalOpen(true);
                  }}
                  style={{ marginTop: '8px' }}
                >
                  Record First Training
                </button>
              )}
            </div>
          ) : (
            <div className="srcy-table-wrap">
              <table className="usis-table srcy-training-main-table">
                <thead>
                  <tr>
                    <th>Training Course / Title</th>
                    <th>Date Conducted</th>
                    <th>Validity Period</th>
                    <th>Venue &amp; Facilitator</th>
                    <th>Participants</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map((t) => {
                    const partCount = participantCountByTraining.get(t.id) || 0;
                    const statusClass =
                      t.status === 'Completed'
                        ? 'srcy-status-chip--completed'
                        : t.status === 'Scheduled'
                        ? 'srcy-status-chip--scheduled'
                        : t.status === 'In Progress'
                        ? 'srcy-status-chip--in_progress'
                        : 'srcy-status-chip--archived';

                    return (
                      <tr key={t.id}>
                        <td>
                          <strong style={{ display: 'block' }}>{t.title}</strong>
                          {t.description ? (
                            <span style={{ fontSize: 12, color: 'var(--deped-muted)', display: 'block', marginTop: 2 }}>
                              {t.description}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <strong>{t.trainingDate}</strong>
                          {t.schoolYear ? (
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--deped-muted)' }}>
                              S.Y. {t.schoolYear}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <span>{t.validityPeriod}</span>
                        </td>
                        <td>
                          <div>{t.venue || '-'}</div>
                          {t.facilitator ? (
                            <span style={{ fontSize: 12, color: 'var(--deped-muted)' }}>
                              {t.facilitator}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="srcy-member-count-link"
                            onClick={() => setManagingTraining(t)}
                            title="Manage enrolled participants in this training"
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">groups</span>
                            <span>{partCount} {partCount === 1 ? 'member' : 'members'}</span>
                          </button>
                        </td>
                        <td>
                          <span className={`srcy-status-chip ${statusClass}`}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="srcy-row-actions">
                            <button
                              type="button"
                              className="secondary-button srcy-row-action-btn"
                              onClick={() => setManagingTraining(t)}
                              title="Attach / View participants"
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">group_add</span>
                              <span className="srcy-row-btn-label">Participants</span>
                            </button>
                            <button
                              type="button"
                              className="secondary-button srcy-row-action-btn"
                              onClick={() => {
                                setEditingTraining(t);
                                setIsFormModalOpen(true);
                              }}
                              title="Edit training details"
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                              <span className="srcy-row-btn-label">Edit</span>
                            </button>
                            <button
                              type="button"
                              className="secondary-button srcy-row-action-btn srcy-row-action-btn--danger"
                              onClick={() => setTrainingToDelete(t)}
                              title="Delete training"
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <TrainingFormModal
        open={isFormModalOpen}
        training={editingTraining}
        existingTrainings={trainings}
        activeSchoolYear={activeSchoolYear}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingTraining(null);
        }}
        onSaved={async () => {
          setIsFormModalOpen(false);
          setEditingTraining(null);
          await refreshAll();
        }}
        onSaveError={(err) => setAlert({ title: 'Error', message: err, tone: 'danger' })}
        saveAction={handleSaveTraining}
      />

      {managingTraining ? (
        <TrainingParticipantsModal
          open={Boolean(managingTraining)}
          training={managingTraining}
          allMembers={members}
          participants={allParticipants}
          onClose={() => setManagingTraining(null)}
          onAttachMembers={handleAttachParticipants}
          onDetachMember={handleDetachParticipant}
          onRefresh={refreshAll}
        />
      ) : null}

      {/* Delete Confirmation Modal */}
      {trainingToDelete ? (
        <UsisAlertModal
          open={Boolean(trainingToDelete)}
          title="Delete Council Training"
          message={`Are you sure you want to delete "${trainingToDelete.title}"? All associated participant records for this training will also be removed.`}
          tone="danger"
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete Training'}
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setTrainingToDelete(null)}
        />
      ) : null}

      {/* Feedback Alert Modal */}
      {alert ? (
        <UsisAlertModal
          open={Boolean(alert)}
          title={alert.title}
          message={alert.message}
          tone={alert.tone}
          confirmLabel="Close"
          onConfirm={() => setAlert(null)}
        />
      ) : null}
    </section>
  );
}
