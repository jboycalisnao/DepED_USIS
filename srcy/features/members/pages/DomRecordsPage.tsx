import { useEffect, useMemo, useState } from 'react';
import type { SrcyAccessRecord } from '../../auth/services/srcyAccess';
import {
  attachMembersToDom,
  createSrcyDomRecord,
  deleteSrcyDomRecord,
  detachMemberFromDom,
  getDomValidityState,
  loadActiveSchoolYearLabel,
  loadSrcyDomRecords,
  updateSrcyDomRecord,
  type SrcyDomDraft,
  type SrcyDomRecord,
} from '../services/srcyDomService';
import {
  loadSrcyMembers,
  type SrcyMemberRecord,
} from '../services/srcyMembershipService';
import { DomFormModal } from '../modals/DomFormModal';
import { DomMembersModal } from '../modals/DomMembersModal';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import {
  UsisSearchableSelect,
  type UsisSearchableSelectOption,
} from '../../../../common/components/ui/UsisSearchableSelect';

type DomRecordsPageProps = {
  session: SrcyAccessRecord;
};

const domStatusFilterOptions: UsisSearchableSelectOption[] = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Expired', value: 'Expired' },
];

export function DomRecordsPage({ session }: DomRecordsPageProps) {
  const [doms, setDoms] = useState<SrcyDomRecord[]>([]);
  const [members, setMembers] = useState<SrcyMemberRecord[]>([]);
  const [activeSchoolYear, setActiveSchoolYear] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'info' } | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDom, setEditingDom] = useState<SrcyDomRecord | null>(null);

  const [managingDom, setManagingDom] = useState<SrcyDomRecord | null>(null);
  const [domToDelete, setDomToDelete] = useState<SrcyDomRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      const [loadedDoms, loadedMembers, activeSy] = await Promise.all([
        loadSrcyDomRecords(),
        loadSrcyMembers(),
        loadActiveSchoolYearLabel(),
      ]);
      setDoms(loadedDoms);
      setMembers(loadedMembers);
      if (activeSy) setActiveSchoolYear(activeSy);
    } catch (err: any) {
      setAlert({
        title: 'Loading Error',
        message: err?.message || 'Unable to load DOM records.',
        tone: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  // Compute member count per DOM
  const memberCountByDom = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      if (m.domId) {
        map.set(m.domId, (map.get(m.domId) || 0) + 1);
      }
    });
    return map;
  }, [members]);

  const counts = useMemo(() => {
    const total = doms.length;
    let active = 0;
    let expired = 0;
    let attachedTotal = 0;

    doms.forEach((d) => {
      const vState = getDomValidityState(d.validFrom, d.validUntil);
      if (vState === 'Active') active++;
      if (vState === 'Expired') expired++;
      attachedTotal += memberCountByDom.get(d.id) || 0;
    });

    return { total, active, expired, attachedTotal };
  }, [doms, memberCountByDom]);

  const filteredDoms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doms.filter((d) => {
      const vState = getDomValidityState(d.validFrom, d.validUntil);
      const matchesStatus =
        statusFilter === 'All' || d.status === statusFilter || vState === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.domNumber.toLowerCase().includes(q) ||
        d.schoolYear.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    });
  }, [doms, search, statusFilter]);

  const handleSaveDom = async (draft: SrcyDomDraft, id?: string) => {
    if (id) {
      const updated = await updateSrcyDomRecord(id, draft);
      setDoms((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setAlert({
        title: 'DOM Batch Updated',
        message: `Updated declaration "${updated.title}".`,
        tone: 'success',
      });
      return updated;
    } else {
      const created = await createSrcyDomRecord({
        ...draft,
        schoolId: session.schoolId,
        createdBy: session.userId,
      });
      setDoms((prev) => [created, ...prev]);
      setAlert({
        title: 'DOM Batch Created',
        message: `New declaration "${created.title}" with 1-year validity period created.`,
        tone: 'success',
      });
      return created;
    }
  };

  const handleConfirmDelete = async () => {
    if (!domToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSrcyDomRecord(domToDelete.id);
      setDoms((prev) => prev.filter((d) => d.id !== domToDelete.id));
      setAlert({
        title: 'DOM Batch Removed',
        message: `Declaration batch "${domToDelete.title}" has been deleted.`,
        tone: 'success',
      });
      setDomToDelete(null);
    } catch (err: any) {
      setAlert({
        title: 'Delete Failed',
        message: err?.message || 'Unable to delete DOM batch.',
        tone: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <UsisPageLoader message="Loading Declaration of Members (DOM) records..." />;

  return (
    <section className="section-shell">
      <div className="page-intro srcy-page-intro">
        <p className="page-intro__eyebrow">Senior Red Cross Youth Council</p>
        <h1>Declaration of Members (DOM) Records</h1>
        <p>
          Declare and track annual council membership batches. Each DOM sets the official start date and
          automatic one-year validity period for its attached members.
        </p>
      </div>

      <section className="srcy-summary-grid" aria-label="DOM summary cards">
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Total DOM Batches</span>
            <strong>{counts.total}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Active Declarations</span>
            <strong>{counts.active}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Expired Declarations</span>
            <strong>{counts.expired}</strong>
          </div>
        </article>
        <article className="section-card srcy-summary-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <span>Total Attached Members</span>
            <strong>{counts.attachedTotal}</strong>
          </div>
        </article>
      </section>

      <section className="portal-panel">
        <header className="portal-panel__header srcy-list-header">
          <div>
            <h2>Declaration Batches</h2>
            <p className="srcy-panel-header__subtitle">
              {filteredDoms.length} {filteredDoms.length === 1 ? 'batch' : 'batches'} listed
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
                <span>Search DOM batches</span>
              </div>
            </label>
            <div className="srcy-filter-select-wrap">
              <UsisSearchableSelect
                ariaLabel="Filter DOM by status"
                label="Filter Status"
                floatingLabel
                allowTyping={false}
                forcePortalMenu
                options={domStatusFilterOptions}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val || 'All')}
                placeholder="All Statuses"
              />
            </div>
            <button
              type="button"
              className="primary-button srcy-register-btn"
              onClick={() => {
                setEditingDom(null);
                setIsFormModalOpen(true);
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
              <span>New Declaration (DOM)</span>
            </button>
          </div>
        </header>

        <div className="portal-panel__body">
          {filteredDoms.length === 0 ? (
            <div className="srcy-empty-state">
              <span className="material-symbols-outlined" aria-hidden="true">assignment_late</span>
              <p>No Declaration of Members (DOM) records found.</p>
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
                    setEditingDom(null);
                    setIsFormModalOpen(true);
                  }}
                  style={{ marginTop: '8px' }}
                >
                  Create First DOM Batch
                </button>
              )}
            </div>
          ) : (
            <div className="srcy-table-wrap">
              <table className="usis-table srcy-dom-main-table">
                <thead>
                  <tr>
                    <th>DOM Control No.</th>
                    <th>Batch Title &amp; S.Y.</th>
                    <th>Validity Period (1 Year)</th>
                    <th>Validity State</th>
                    <th>Members Attached</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoms.map((d) => {
                    const memberCount = memberCountByDom.get(d.id) || 0;
                    const vState = getDomValidityState(d.validFrom, d.validUntil);
                    return (
                      <tr key={d.id}>
                        <td>
                          <strong className="srcy-dom-code">{d.domNumber}</strong>
                        </td>
                        <td>
                          <strong>{d.title}</strong>
                          {d.schoolYear ? <span>S.Y. {d.schoolYear}</span> : null}
                        </td>
                        <td>
                          <div className="srcy-validity-range">
                            <span className="material-symbols-outlined" aria-hidden="true">date_range</span>
                            <span>{d.validFrom} to {d.validUntil}</span>
                          </div>
                          <small className="srcy-validity-caption">1 Year Period</small>
                        </td>
                        <td>
                          <span className={`srcy-dom-status-pill srcy-dom-status-pill--${vState.toLowerCase()}`}>
                            {vState}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="srcy-member-count-link"
                            onClick={() => setManagingDom(d)}
                            title="Manage members in this DOM batch"
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">groups</span>
                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="srcy-row-actions">
                            <button
                              type="button"
                              className="secondary-button srcy-row-action-btn"
                              onClick={() => setManagingDom(d)}
                              title="Attach / View members"
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">group_add</span>
                              <span className="srcy-row-btn-label">Members</span>
                            </button>
                            <button
                              type="button"
                              className="secondary-button srcy-row-action-btn"
                              onClick={() => {
                                setEditingDom(d);
                                setIsFormModalOpen(true);
                              }}
                              title="Edit DOM details"
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                              <span className="srcy-row-btn-label">Edit</span>
                            </button>
                            <button
                              type="button"
                              className="secondary-button srcy-row-action-btn srcy-row-action-btn--danger"
                              onClick={() => setDomToDelete(d)}
                              title="Delete DOM batch"
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                              <span className="srcy-row-btn-label">Delete</span>
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

      {/* DOM Create / Edit Form Modal */}
      <DomFormModal
        open={isFormModalOpen}
        dom={editingDom}
        existingDoms={doms}
        activeSchoolYear={activeSchoolYear}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={() => {
          setIsFormModalOpen(false);
          void refreshAll();
        }}
        onSaveError={(err) => setAlert({ title: 'Save Failed', message: err, tone: 'danger' })}
        saveAction={handleSaveDom}
      />

      {/* DOM Members Manager Modal */}
      <DomMembersModal
        open={Boolean(managingDom)}
        dom={managingDom}
        allMembers={members}
        onClose={() => setManagingDom(null)}
        onAttachMembers={attachMembersToDom}
        onDetachMember={detachMemberFromDom}
        onRefresh={refreshAll}
      />

      {/* Delete Confirmation Alert Modal */}
      <UsisAlertModal
        open={Boolean(domToDelete)}
        title="Confirm DOM Batch Deletion"
        message={`Are you sure you want to remove declaration "${domToDelete?.title}" (${domToDelete?.domNumber})? Any attached members will become unassigned.`}
        tone="danger"
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete DOM Batch'}
        cancelLabel="Cancel"
        onClose={() => setDomToDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      {/* General Alert Modal */}
      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
