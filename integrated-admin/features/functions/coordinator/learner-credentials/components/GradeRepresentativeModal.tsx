import { useEffect, useMemo, useState } from 'react';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type { GrantedLearnerAccessRecord, LearnerSearchRecord } from '../services/learnerBasedCredentialService';
import { getGradeLevelFromScopeSectionId } from '../services/learnerBasedCredentialService';

type Props = {
  gradeLevels: string[];
  isOpen: boolean;
  isSearching: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSearchLearners: (params: { gradeLevel: string; query: string }) => Promise<void>;
  onAssign: (params: { gradeLevel: string; learner: LearnerSearchRecord; positionTitle: string }) => Promise<void>;
  onDeleteRepresentative: (params: { credentialId: string }) => Promise<void>;
  searchResults: LearnerSearchRecord[];
  representatives: GrantedLearnerAccessRecord[];
};

export function GradeRepresentativeModal({
  gradeLevels,
  isOpen,
  isSearching,
  isSubmitting,
  onClose,
  onSearchLearners,
  onAssign,
  onDeleteRepresentative,
  searchResults,
  representatives,
}: Props) {
  const [viewMode, setViewMode] = useState<'assign' | 'manage'>('assign');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState(gradeLevels[0] || '');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setViewMode('assign');
    setSelectedGradeLevel(gradeLevels[0] || '');
    setSelectedLearnerId('');
  }, [gradeLevels, isOpen]);

  const selectedLearner = useMemo(
    () => searchResults.find((row) => row.learnerId === selectedLearnerId) || null,
    [searchResults, selectedLearnerId],
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Assign grade-level representative">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Learner-based Credentials</p>
            <h3>Grade-Level Representatives</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={() => { if (!isSubmitting) onClose(); }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body registry-form">
          <div className="ia-learner-credentials__modal-tabs">
            <button type="button" className={`ia-learner-credentials__modal-tab${viewMode === 'assign' ? ' is-active' : ''}`} onClick={() => setViewMode('assign')}>Assign</button>
            <button type="button" className={`ia-learner-credentials__modal-tab${viewMode === 'manage' ? ' is-active' : ''}`} onClick={() => setViewMode('manage')}>Manage</button>
          </div>

          {viewMode === 'assign' ? (
            <>
              <UsisSearchableSelect
                ariaLabel="Grade level"
                allowTyping={false}
                floatingLabel
                forcePortalMenu
                label="Grade Level"
                onChange={(value) => {
                  setSelectedGradeLevel(value);
                  setSelectedLearnerId('');
                }}
                options={gradeLevels.map((level) => ({ label: level, value: level }))}
                value={selectedGradeLevel}
              />
              <UsisSearchableSelect
                ariaLabel="Search learner in selected grade"
                floatingLabel
                forcePortalMenu
                label={`Search Learner in ${selectedGradeLevel || 'Grade'}`}
                minQueryLength={2}
                onChange={setSelectedLearnerId}
                onQueryChange={async (nextQuery) => {
                  const trimmed = nextQuery.trim();
                  if (!selectedGradeLevel || trimmed.length < 2) return;
                  await onSearchLearners({ gradeLevel: selectedGradeLevel, query: trimmed });
                }}
                options={searchResults.map((learner) => ({
                  label: `${learner.fullName} (${learner.lrn || '-'})`,
                  value: learner.learnerId,
                }))}
                requireQueryBeforeOptions
                serverSearch
                value={selectedLearnerId}
              />
              {isSearching ? <p className="registry-copy">Searching learners...</p> : null}
              <p className="registry-copy">Selected learner will get Merch Control access for the entire {selectedGradeLevel || 'grade level'}.</p>
              <div className="modal-dialog__actions">
                <button type="button" disabled={isSubmitting} onClick={onClose}>Cancel</button>
                <button
                  type="button"
                  className="modal-dialog__blue"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!selectedLearner) return;
                    await onAssign({
                      gradeLevel: selectedGradeLevel,
                      learner: selectedLearner,
                      positionTitle: `Grade-Level Representative (${selectedGradeLevel})`,
                    });
                  }}
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Representative'}
                </button>
              </div>
            </>
          ) : (
            <div className="ia-learner-credentials__rep-manage">
              <div className="ia-learner-credentials__granted-table-wrap">
                <table className="ia-learner-credentials__granted-table">
                  <thead>
                    <tr>
                      <th>Grade Level</th>
                      <th>Learner</th>
                      <th>LRN</th>
                      <th>Position</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {representatives.length === 0 ? (
                      <tr><td colSpan={5} className="ia-learner-credentials__empty-cell">No grade-level representatives assigned.</td></tr>
                    ) : representatives.map((row) => (
                      <tr key={row.credentialId}>
                        <td>{getGradeLevelFromScopeSectionId(row.sectionId) || '-'}</td>
                        <td>{row.fullName}</td>
                        <td>{row.learnerLrn || '-'}</td>
                        <td>{row.positionTitle}</td>
                        <td>
                          <button
                            type="button"
                            className="registry-action-button"
                            disabled={isSubmitting}
                            onClick={async () => {
                              await onDeleteRepresentative({ credentialId: row.credentialId });
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
