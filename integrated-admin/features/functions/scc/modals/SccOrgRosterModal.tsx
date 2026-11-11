import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type { IaSccLearnerCandidate, IaSccOfficer, IaSccOrganization } from '../types';
import {
  addIaSccRosterOfficer,
  loadIaSccOrgRoster,
  removeIaSccRosterOfficer,
  searchIaSccLearners,
  updateIaSccRosterOfficer,
} from '../services/iaSccService';

type SccOrgRosterModalProps = {
  organization: IaSccOrganization | null;
  onClose: () => void;
  onRosterChanged?: () => void;
  onNotifyOfficers?: () => void;
};

type RosterViewMode = 'list' | 'create' | 'edit';
type CreateEntryType = 'registrar' | 'manual';

const FALLBACK_POSITIONS = [
  'President',
  'Vice-President',
  'Secretary',
  'Treasurer',
  'Auditor',
  'Public Information Officer',
  'Protocol Officer',
  'Grade 7 - Representative',
  'Grade 8 - Representative',
  'Grade 9 - Representative',
  'Grade 10 - Representative',
  'Grade 11 - Representative',
  'Grade 12 - Representative',
  'STE - Representative',
  'SPA - Representative',
  'Member',
];

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

export function SccOrgRosterModal({
  organization,
  onClose,
  onRosterChanged,
  onNotifyOfficers,
}: SccOrgRosterModalProps) {
  const [officers, setOfficers] = useState<IaSccOfficer[]>([]);
  const [hierarchy, setHierarchy] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<RosterViewMode>('list');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add / Edit Form State
  const [createType, setCreateType] = useState<CreateEntryType>('registrar');
  const [editingOfficer, setEditingOfficer] = useState<IaSccOfficer | null>(null);
  const [learnerQuery, setLearnerQuery] = useState('');
  const [learnerResults, setLearnerResults] = useState<IaSccLearnerCandidate[]>([]);
  const [isSearchingLearners, setIsSearchingLearners] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState<IaSccLearnerCandidate | null>(null);

  const [positionSelect, setPositionSelect] = useState('President');
  const [customPosition, setCustomPosition] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualLrn, setManualLrn] = useState('');
  const [manualGrade, setManualGrade] = useState('Grade 11');
  const [manualSection, setManualSection] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [termYear, setTermYear] = useState('2026-2027');
  const [isSignatory, setIsSignatory] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<IaSccOfficer | null>(null);

  const positionOptions = useMemo(() => {
    const base = hierarchy.length > 0 ? hierarchy : FALLBACK_POSITIONS;
    return Array.from(new Set(base));
  }, [hierarchy]);

  const fetchRoster = async () => {
    if (!organization) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await loadIaSccOrgRoster(
        organization.id,
        organization.acronym,
        organization.name,
      );
      setOfficers(res.officers);
      setHierarchy(res.hierarchy);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load organization roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!organization) return;
    setViewMode('list');
    setEditingOfficer(null);
    setErrorMsg(null);
    void fetchRoster();
  }, [organization]);

  useEffect(() => {
    if (viewMode !== 'create' || createType !== 'registrar') return;
    const clean = learnerQuery.trim();
    if (clean.length < 2) {
      setLearnerResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearchingLearners(true);
      try {
        const res = await searchIaSccLearners(clean);
        if (!cancelled) setLearnerResults(res);
      } catch {
        if (!cancelled) setLearnerResults([]);
      } finally {
        if (!cancelled) setIsSearchingLearners(false);
      }
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [createType, learnerQuery, viewMode]);

  if (!organization) return null;

  const openCreateForm = () => {
    setErrorMsg(null);
    setEditingOfficer(null);
    setCreateType('registrar');
    setLearnerQuery('');
    setLearnerResults([]);
    setSelectedLearner(null);
    setPositionSelect(positionOptions[0] || 'President');
    setCustomPosition('');
    setManualName('');
    setManualLrn('');
    setManualGrade('Grade 11');
    setManualSection('');
    setManualEmail('');
    setContactNumber('');
    setTermYear('2026-2027');
    setIsSignatory(true);
    setViewMode('create');
  };

  const openEditForm = (officer: IaSccOfficer) => {
    setErrorMsg(null);
    setEditingOfficer(officer);
    if (positionOptions.includes(officer.position)) {
      setPositionSelect(officer.position);
      setCustomPosition('');
    } else {
      setPositionSelect('__custom__');
      setCustomPosition(officer.position);
    }
    setManualName(officer.fullName);
    setManualLrn(officer.lrn);
    setManualGrade(GRADE_LEVELS.includes(officer.gradeLevel) ? officer.gradeLevel : 'Grade 11');
    setManualSection(officer.section === '—' ? '' : officer.section);
    setManualEmail(officer.email);
    setContactNumber(officer.contactNumber);
    setTermYear(officer.termYear || '2026-2027');
    setIsSignatory(officer.isAuthorizedSignatory);
    setViewMode('edit');
  };

  const resolvedPosition =
    positionSelect === '__custom__' ? customPosition.trim() : positionSelect.trim();

  const handleSaveOfficer = async (e: FormEvent) => {
    e.preventDefault();
    if (!resolvedPosition) {
      setErrorMsg('Please select or enter an officer position.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      if (viewMode === 'create') {
        if (createType === 'registrar') {
          if (!selectedLearner) {
            setErrorMsg('Please search and select an enrolled learner to tag.');
            setIsSubmitting(false);
            return;
          }
          await addIaSccRosterOfficer({
            organizationId: organization.id,
            organizationAcronym: organization.acronym,
            organizationName: organization.name,
            position: resolvedPosition,
            learnerId: selectedLearner.id,
          });
        } else {
          if (!manualName.trim()) {
            setErrorMsg('Officer full name is required.');
            setIsSubmitting(false);
            return;
          }
          await addIaSccRosterOfficer({
            organizationId: organization.id,
            organizationAcronym: organization.acronym,
            organizationName: organization.name,
            position: resolvedPosition,
            lrn: manualLrn,
            fullName: manualName,
            gradeLevel: manualGrade,
            section: manualSection,
            email: manualEmail,
            contactNumber,
            termYear,
            isAuthorizedSignatory: isSignatory,
          });
        }
      } else if (viewMode === 'edit' && editingOfficer) {
        await updateIaSccRosterOfficer({
          officer: editingOfficer,
          organizationAcronym: organization.acronym,
          organizationName: organization.name,
          position: resolvedPosition,
          lrn: manualLrn,
          fullName: manualName,
          gradeLevel: manualGrade,
          section: manualSection,
          email: manualEmail,
          contactNumber,
          termYear,
          isAuthorizedSignatory: isSignatory,
        });
      }

      await fetchRoster();
      onRosterChanged?.();
      setViewMode('list');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save officer assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsLoading(true);
      setErrorMsg(null);
      await removeIaSccRosterOfficer({
        officer: deleteTarget,
        organizationAcronym: organization.acronym,
        organizationName: organization.name,
      });
      await fetchRoster();
      onRosterChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to remove officer from roster.');
    } finally {
      setIsLoading(false);
    }
  };

  const showManualFields =
    (viewMode === 'create' && createType === 'manual') ||
    (viewMode === 'edit' && editingOfficer?.source === 'manual');

  const showContactOnRow =
    viewMode === 'edit' || (viewMode === 'create' && createType === 'manual');

  return (
    <>
      <div className="modal-overlay modal-overlay--high" role="presentation">
        <div className="modal-backdrop" onClick={onClose} />
        <div
          className="modal-dialog modal-dialog--wide ia-scc-modal ia-scc-modal--roster"
          role="dialog"
          aria-modal="true"
          aria-label={`${organization.acronym} Executive Officer Roster`}
        >
          <div className="modal-dialog__header">
            <div className="modal-dialog__title-group">
              <p className="modal-dialog__eyebrow">
                {viewMode === 'list'
                  ? 'Registrar Tagged Roster • Ordered by Hierarchy'
                  : viewMode === 'create'
                    ? `Add Officer to ${organization.acronym}`
                    : `Update Officer Assignment • ${organization.acronym}`}
              </p>
              <h3>
                {organization.name} ({organization.acronym})
              </h3>
            </div>
            <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>

          <div className="modal-dialog__body ia-scc-modal__body">
            {errorMsg ? (
              <div className="ia-scc-alert ia-scc-alert--danger" role="alert">
                <span className="material-symbols-outlined" aria-hidden="true">error</span>
                <span>{errorMsg}</span>
              </div>
            ) : null}

            {viewMode === 'list' ? (
              <>
                <div className="ia-scc-roster-toolbar">
                  <div className="ia-scc-inline-tags">
                    <span className="ia-status-tag ia-status-tag--indigo">
                      {officers.length} {officers.length === 1 ? 'Officer' : 'Officers'}
                    </span>
                    {hierarchy.length > 0 ? (
                      <span className="ia-scc-muted">
                        Hierarchy: {hierarchy.slice(0, 5).join(' → ')}
                        {hierarchy.length > 5 ? ` (+${hierarchy.length - 5})` : ''}
                      </span>
                    ) : null}
                  </div>
                  <div className="ia-scc-table-actions">
                    {onNotifyOfficers ? (
                      <button type="button" className="secondary-btn" onClick={onNotifyOfficers}>
                        Notify Officers
                      </button>
                    ) : null}
                    <button type="button" className="primary-btn" onClick={openCreateForm}>
                      + Add Officer
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="ia-scc-state-box">
                    <span className="material-symbols-outlined ia-scc-spin" aria-hidden="true">
                      sync
                    </span>
                    <p>Loading tagged learners from Registrar Registry...</p>
                  </div>
                ) : officers.length === 0 ? (
                  <div className="ia-scc-state-box">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      group_off
                    </span>
                    <h4>No Tagged Learners Found</h4>
                    <p>
                      No learners are currently assigned to <strong>{organization.acronym}</strong>.
                      Click <strong>+ Add Officer</strong> to tag an enrolled learner.
                    </p>
                  </div>
                ) : (
                  <div className="registry-table-wrap">
                    <table className="registry-table ia-scc-roster-table">
                      <thead>
                        <tr>
                          <th>Position</th>
                          <th>Learner Name</th>
                          <th>LRN</th>
                          <th>Grade & Section</th>
                          <th>Email / Contact</th>
                          <th>Signatory</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {officers.map((off) => (
                          <tr key={`${off.source || 'reg'}-${off.id}`}>
                            <td>
                              <span className="ia-status-tag ia-status-tag--indigo">
                                {off.position}
                              </span>
                            </td>
                            <td>
                              <div className="ia-scc-cell-stack">
                                <strong>{off.fullName}</strong>
                                <small>
                                  {off.source === 'registrar' ? 'Registrar Tag' : 'Manual Entry'}
                                </small>
                              </div>
                            </td>
                            <td>
                              <code>{off.lrn || '—'}</code>
                            </td>
                            <td>
                              {off.gradeLevel} - {off.section}
                            </td>
                            <td>
                              <div className="ia-scc-cell-stack">
                                <span>{off.email || '—'}</span>
                                <small>{off.contactNumber || 'No contact number'}</small>
                              </div>
                            </td>
                            <td>
                              {off.isAuthorizedSignatory ? (
                                <span className="ia-status-tag ia-status-tag--info">Signatory</span>
                              ) : (
                                <span className="ia-status-tag ia-status-tag--neutral">Member</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="ia-scc-table-actions">
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  onClick={() => openEditForm(off)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="secondary-btn ia-scc-btn--danger"
                                  onClick={() => setDeleteTarget(off)}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="modal-dialog__actions ia-scc-modal__actions">
                  <button type="button" className="secondary-btn" onClick={onClose}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <form className="ia-scc-form-stack" onSubmit={handleSaveOfficer}>
                {viewMode === 'create' ? (
                  <div className="ia-scc-mode-switch" role="radiogroup" aria-label="Officer entry method">
                    <label className="ia-scc-mode-option">
                      <input
                        type="radio"
                        name="sccRosterCreateType"
                        checked={createType === 'registrar'}
                        onChange={() => setCreateType('registrar')}
                      />
                      <span>Tag Enrolled Learner (Registrar)</span>
                    </label>
                    <label className="ia-scc-mode-option">
                      <input
                        type="radio"
                        name="sccRosterCreateType"
                        checked={createType === 'manual'}
                        onChange={() => setCreateType('manual')}
                      />
                      <span>Manual Officer Entry</span>
                    </label>
                  </div>
                ) : null}

                {viewMode === 'create' && createType === 'registrar' ? (
                  <div className="ia-scc-learner-picker">
                    <label className="floating-field">
                      <input
                        type="search"
                        placeholder=" "
                        value={learnerQuery}
                        onChange={(e) => {
                          setLearnerQuery(e.target.value);
                          if (selectedLearner) setSelectedLearner(null);
                        }}
                      />
                      <span>Search Learner by LRN or Name (min 2 characters) *</span>
                    </label>

                    {selectedLearner ? (
                      <div className="ia-scc-selected-learner">
                        <div>
                          <strong>{selectedLearner.fullName}</strong>
                          <span>
                            LRN: {selectedLearner.lrn} • {selectedLearner.gradeLevel} -{' '}
                            {selectedLearner.section}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setSelectedLearner(null)}
                        >
                          Change
                        </button>
                      </div>
                    ) : isSearchingLearners ? (
                      <p className="ia-scc-muted">Searching Registrar learners...</p>
                    ) : learnerResults.length > 0 ? (
                      <div className="ia-scc-learner-results" role="listbox">
                        {learnerResults.map((cand) => (
                          <button
                            key={cand.id}
                            type="button"
                            className="ia-scc-learner-result"
                            onClick={() => {
                              setSelectedLearner(cand);
                              setLearnerResults([]);
                            }}
                          >
                            <div className="ia-scc-cell-stack">
                              <strong>{cand.fullName}</strong>
                              <small>
                                LRN: {cand.lrn} • {cand.gradeLevel} - {cand.section}
                              </small>
                            </div>
                            {cand.tags.length > 0 ? (
                              <span className="ia-status-tag ia-status-tag--neutral">
                                {cand.tags.join(', ')}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : learnerQuery.trim().length >= 2 ? (
                      <p className="ia-scc-muted">No enrolled learners matched your search.</p>
                    ) : null}
                  </div>
                ) : null}

                {viewMode === 'edit' && editingOfficer?.source === 'registrar' ? (
                  <div className="ia-scc-selected-learner">
                    <div>
                      <strong>{editingOfficer.fullName}</strong>
                      <span>
                        LRN: {editingOfficer.lrn} • {editingOfficer.gradeLevel} -{' '}
                        {editingOfficer.section} (Registrar Record)
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className={showContactOnRow || positionSelect === '__custom__' ? 'ia-scc-form-grid' : 'ia-scc-form-stack'}>
                  <UsisSearchableSelect
                    ariaLabel="Officer Position / Rank"
                    floatingLabel
                    forcePortalMenu
                    label="Officer Position / Rank"
                    required
                    value={positionSelect}
                    onChange={setPositionSelect}
                    options={[
                      ...positionOptions.map((pos) => ({ value: pos, label: pos })),
                      { value: '__custom__', label: 'Custom Position...' },
                    ]}
                  />

                  {positionSelect === '__custom__' ? (
                    <label className="floating-field">
                      <input
                        type="text"
                        placeholder=" "
                        required
                        value={customPosition}
                        onChange={(e) => setCustomPosition(e.target.value)}
                      />
                      <span>Custom Position Title *</span>
                    </label>
                  ) : showContactOnRow ? (
                    <label className="floating-field">
                      <input
                        type="tel"
                        placeholder=" "
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                      />
                      <span>Contact Number</span>
                    </label>
                  ) : null}
                </div>

                {positionSelect === '__custom__' && showContactOnRow ? (
                  <label className="floating-field">
                    <input
                      type="tel"
                      placeholder=" "
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                    />
                    <span>Contact Number</span>
                  </label>
                ) : null}

                {showManualFields ? (
                  <>
                    <div className="ia-scc-form-grid">
                      <label className="floating-field">
                        <input
                          type="text"
                          placeholder=" "
                          required
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                        />
                        <span>Full Name *</span>
                      </label>
                      <label className="floating-field">
                        <input
                          type="text"
                          maxLength={12}
                          placeholder=" "
                          value={manualLrn}
                          onChange={(e) => setManualLrn(e.target.value.replace(/\D/g, ''))}
                        />
                        <span>12-Digit LRN</span>
                      </label>
                    </div>

                    <div className="ia-scc-form-grid">
                      <UsisSearchableSelect
                        ariaLabel="Grade Level"
                        floatingLabel
                        forcePortalMenu
                        label="Grade Level"
                        required
                        value={manualGrade}
                        onChange={setManualGrade}
                        options={GRADE_LEVELS.map((g) => ({ value: g, label: g }))}
                      />

                      <label className="floating-field">
                        <input
                          type="text"
                          placeholder=" "
                          value={manualSection}
                          onChange={(e) => setManualSection(e.target.value)}
                        />
                        <span>Section</span>
                      </label>
                    </div>

                    <div className="ia-scc-form-grid">
                      <label className="floating-field">
                        <input
                          type="email"
                          placeholder=" "
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                        />
                        <span>Email Address</span>
                      </label>

                      <label className="floating-field">
                        <input
                          type="text"
                          placeholder=" "
                          value={termYear}
                          onChange={(e) => setTermYear(e.target.value)}
                        />
                        <span>Term School Year</span>
                      </label>
                    </div>

                    <label className="ia-scc-checkbox-row">
                      <input
                        type="checkbox"
                        checked={isSignatory}
                        onChange={(e) => setIsSignatory(e.target.checked)}
                      />
                      <span>Authorized Signatory for SCC operations & endorsements</span>
                    </label>
                  </>
                ) : null}

                <div className="modal-dialog__actions ia-scc-modal__actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={isSubmitting}
                    onClick={() => {
                      setErrorMsg(null);
                      setViewMode('list');
                    }}
                  >
                    Back to Roster
                  </button>
                  <button type="submit" className="primary-btn" disabled={isSubmitting}>
                    {isSubmitting
                      ? 'Saving...'
                      : viewMode === 'create'
                        ? 'Save Officer'
                        : 'Update Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <UsisAlertModal
        open={Boolean(deleteTarget)}
        title="Remove Officer from Roster"
        message={
          deleteTarget
            ? deleteTarget.source === 'registrar'
              ? `Remove ${deleteTarget.fullName} (${deleteTarget.position}) from ${organization.acronym}? This removes the ${organization.acronym} tag from their Registrar learner record.`
              : `Delete ${deleteTarget.fullName} (${deleteTarget.position}) from ${organization.acronym}'s manual roster?`
            : ''
        }
        tone="danger"
        confirmLabel="Remove Officer"
        cancelLabel="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </>
  );
}
