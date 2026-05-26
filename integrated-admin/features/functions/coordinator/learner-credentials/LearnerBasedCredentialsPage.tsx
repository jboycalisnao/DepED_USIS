import { useEffect, useMemo, useState } from 'react';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../../common/components/ui/UsisGradeSectionList';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { GrantLearnerAccessModal } from './components/GrantLearnerAccessModal';
import { GradeRepresentativeModal } from './components/GradeRepresentativeModal';
import { SectionCredentialContent } from './components/SectionCredentialContent';
import { CLASS_OFFICER_POSITIONS, LEARNER_OPERATION_OPTIONS } from './constants';
import {
  grantGradeLevelMerchControlAccess,
  grantLearnerOperationAccess,
  loadActiveSectionsDirectory,
  loadGradeLevelRepresentatives,
  loadGrantedLearnerAccessBySections,
  searchLearnersByGradeLevel,
  searchLearnersBySection,
  deleteGradeLevelRepresentativeAccess,
  updateLearnerOperationAccess,
  type GrantedLearnerAccessRecord,
  type LearnerSearchRecord,
  type SectionDirectoryRecord,
} from './services/learnerBasedCredentialService';

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const OPERATION_LABEL_BY_KEY: Record<string, string> = {
  class_section_merch_control: 'Merch Control',
};

export function LearnerBasedCredentialsPage() {
  const [sections, setSections] = useState<SectionDirectoryRecord[]>([]);
  const [searchBySection, setSearchBySection] = useState<Record<string, string>>({});
  const [resultsBySection, setResultsBySection] = useState<Record<string, LearnerSearchRecord[]>>({});
  const [loadingBySection, setLoadingBySection] = useState<Record<string, boolean>>({});
  const [selectedLearnerBySection, setSelectedLearnerBySection] = useState<Record<string, string>>({});
  const [grantedBySection, setGrantedBySection] = useState<Record<string, GrantedLearnerAccessRecord[]>>({});
  const [gradeRepresentatives, setGradeRepresentatives] = useState<GrantedLearnerAccessRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [directoryQuery, setDirectoryQuery] = useState('');

  const [selectedLearner, setSelectedLearner] = useState<LearnerSearchRecord | null>(null);
  const [editingCredential, setEditingCredential] = useState<GrantedLearnerAccessRecord | null>(null);
  const [positionValue, setPositionValue] = useState('');
  const [operationValue, setOperationValue] = useState(LEARNER_OPERATION_OPTIONS[0]?.value || '');
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [confirmGrantOpen, setConfirmGrantOpen] = useState(false);

  const [gradeRepModalOpen, setGradeRepModalOpen] = useState(false);
  const [gradeRepResults, setGradeRepResults] = useState<LearnerSearchRecord[]>([]);
  const [isSearchingGradeReps, setIsSearchingGradeReps] = useState(false);
  const [isSubmittingGradeRep, setIsSubmittingGradeRep] = useState(false);

  const [alert, setAlert] = useState<{ message: string; title: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  const refreshGrantedAccess = async (rows: SectionDirectoryRecord[]) => {
    const sectionIds = rows.map((row) => row.sectionId);
    const [granted, reps] = await Promise.all([
      loadGrantedLearnerAccessBySections(sectionIds),
      loadGradeLevelRepresentatives(),
    ]);
    const groupedMap: Record<string, GrantedLearnerAccessRecord[]> = {};
    granted.forEach((row) => {
      if (!groupedMap[row.sectionId]) groupedMap[row.sectionId] = [];
      groupedMap[row.sectionId].push(row);
    });
    setGrantedBySection(groupedMap);
    setGradeRepresentatives(reps);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const rows = await loadActiveSectionsDirectory();
        if (cancelled) return;
        setSections(rows);
        await refreshGrantedAccess(rows);
      } catch (nextError: any) {
        if (!cancelled) {
          setAlert({
            message: nextError?.message || 'Unable to load section directory.',
            title: 'Load Failed',
            tone: 'danger',
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo<UsisGradeSectionListGrade[]>(() => {
    const normalizedDirectoryQuery = directoryQuery.trim().toLowerCase();
    const map = new Map<string, SectionDirectoryRecord[]>();
    sections.forEach((row) => {
      const key = row.gradeLevel || 'Unassigned';
      const current = map.get(key) || [];
      current.push(row);
      map.set(key, current);
    });

    return GRADE_LEVELS.map((gradeLevel) => {
      const entries = map.get(gradeLevel) || [];
      const filteredEntries = entries.filter((section) => {
        if (!normalizedDirectoryQuery) return true;
        if (section.sectionName.toLowerCase().includes(normalizedDirectoryQuery)) return true;
        const grantedRows = grantedBySection[section.sectionId] || [];
        return grantedRows.some((row) =>
          row.fullName.toLowerCase().includes(normalizedDirectoryQuery) ||
          row.learnerLrn.toLowerCase().includes(normalizedDirectoryQuery) ||
          row.positionTitle.toLowerCase().includes(normalizedDirectoryQuery) ||
          row.operationKey.toLowerCase().includes(normalizedDirectoryQuery),
        );
      });

      const sectionsForGrade =
        filteredEntries.length > 0
          ? filteredEntries.map((section) => {
              const grantedRows = grantedBySection[section.sectionId] || [];
              return {
                content: (
                  <SectionCredentialContent
                    operationLabelByKey={OPERATION_LABEL_BY_KEY}
                    section={section}
                    grantedRows={grantedRows}
                    isLoadingSection={Boolean(loadingBySection[section.sectionId])}
                    searchResults={resultsBySection[section.sectionId] || []}
                    selectedLearnerId={selectedLearnerBySection[section.sectionId] || ''}
                    onSelectLearner={(value) => {
                      setSelectedLearnerBySection((current) => ({ ...current, [section.sectionId]: value }));
                      const selected = (resultsBySection[section.sectionId] || []).find((row) => row.learnerId === value);
                      if (!selected) return;
                      setEditingCredential(null);
                      setSelectedLearner(selected);
                      setPositionValue(CLASS_OFFICER_POSITIONS[0] || '');
                      setOperationValue(LEARNER_OPERATION_OPTIONS[0]?.value || '');
                    }}
                    onSearchQueryChange={async (nextQuery) => {
                      setSearchBySection((current) => ({ ...current, [section.sectionId]: nextQuery }));
                      const trimmed = nextQuery.trim();
                      if (trimmed.length < 2) {
                        setResultsBySection((current) => ({ ...current, [section.sectionId]: [] }));
                        return;
                      }
                      setLoadingBySection((current) => ({ ...current, [section.sectionId]: true }));
                      try {
                        const rows = await searchLearnersBySection({ query: trimmed, sectionId: section.sectionId });
                        setResultsBySection((current) => ({ ...current, [section.sectionId]: rows }));
                      } catch (nextError: any) {
                        setAlert({ message: nextError?.message || 'Unable to search learners.', title: 'Search Failed', tone: 'danger' });
                      } finally {
                        setLoadingBySection((current) => ({ ...current, [section.sectionId]: false }));
                      }
                    }}
                    onEdit={(row) => {
                      setEditingCredential(row);
                      setSelectedLearner({
                        fullName: row.fullName,
                        learnerId: row.learnerId,
                        lrn: row.learnerLrn,
                        sectionId: row.sectionId,
                      });
                      setPositionValue(row.positionTitle);
                      setOperationValue(row.operationKey);
                    }}
                  />
                ),
                count: 0,
                key: section.sectionId,
                label: (
                  <span className="ia-learner-credentials__section-label">
                    <span>{section.sectionName}</span>
                    {grantedRows.length > 0 ? (
                      <span className="ia-learner-credentials__granted-indicator">Has Granted Access - {grantedRows.length}</span>
                    ) : null}
                  </span>
                ),
              };
            })
          : [{
              content: <p className="registry-copy">{normalizedDirectoryQuery ? 'No matching sections for this grade level.' : 'No active sections for this grade level.'}</p>,
              count: 0,
              key: `${gradeLevel}-${normalizedDirectoryQuery ? 'filtered-empty' : 'empty'}`,
              label: normalizedDirectoryQuery ? 'No matching sections' : 'No active sections',
            }];

      return {
        countLabel: `${filteredEntries.length} Active Sections`,
        key: gradeLevel,
        label: gradeLevel,
        sections: sectionsForGrade,
      };
    }).filter((grade) => !normalizedDirectoryQuery || grade.countLabel !== '0 Active Sections');
  }, [directoryQuery, grantedBySection, loadingBySection, resultsBySection, sections, selectedLearnerBySection]);

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Learner-based Credentials</h2>
      </div>
      <article className="ia-learner-credentials__panel">
        <div className="ia-learner-credentials__toolbar">
          <label className="floating-field ia-learner-credentials__directory-search">
            <div className="floating-field__control">
              <input
                id="ia-learner-credentials-directory-search"
                type="search"
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
                placeholder=" "
                data-has-value={directoryQuery.trim().length > 0 ? 'true' : 'false'}
                aria-label="Search granted learners or sections"
              />
              <span>Search granted learners or sections</span>
            </div>
          </label>
          <button type="button" className="registry-action-button ia-learner-credentials__grade-rep-button" onClick={() => setGradeRepModalOpen(true)}>
            Grade Representatives
          </button>
        </div>
        {isLoading ? <UsisPageLoader message="Loading learner-based credentials..." /> : (
          <UsisGradeSectionList
            className="ia-learner-credentials"
            emptyMessage={directoryQuery.trim() ? 'No matching learners or sections found.' : 'No active sections available.'}
            grades={grouped}
          />
        )}
      </article>

      <GradeRepresentativeModal
        gradeLevels={GRADE_LEVELS}
        isOpen={gradeRepModalOpen}
        isSearching={isSearchingGradeReps}
        isSubmitting={isSubmittingGradeRep}
        searchResults={gradeRepResults}
        representatives={gradeRepresentatives}
        onClose={() => setGradeRepModalOpen(false)}
        onSearchLearners={async ({ gradeLevel, query }) => {
          setIsSearchingGradeReps(true);
          try {
            const rows = await searchLearnersByGradeLevel({ gradeLevel, query });
            setGradeRepResults(rows);
          } catch (nextError: any) {
            setAlert({ title: 'Search Failed', message: nextError?.message || 'Unable to search grade-level learners.', tone: 'danger' });
          } finally {
            setIsSearchingGradeReps(false);
          }
        }}
        onAssign={async ({ gradeLevel, learner, positionTitle }) => {
          setIsSubmittingGradeRep(true);
          try {
            await grantGradeLevelMerchControlAccess({
              gradeLevel,
              learnerId: learner.learnerId,
              learnerLrn: learner.lrn,
              positionTitle,
            });
            setAlert({ title: 'Success', message: `${learner.fullName} now has Merch Control access for ${gradeLevel}.`, tone: 'success' });
            await refreshGrantedAccess(sections);
            setGradeRepModalOpen(false);
          } catch (nextError: any) {
            setAlert({ title: 'Assignment Failed', message: nextError?.message || 'Unable to assign grade-level representative.', tone: 'danger' });
          } finally {
            setIsSubmittingGradeRep(false);
          }
        }}
        onDeleteRepresentative={async ({ credentialId }) => {
          setIsSubmittingGradeRep(true);
          try {
            await deleteGradeLevelRepresentativeAccess({ credentialId });
            setAlert({ title: 'Success', message: 'Grade-level representative removed successfully.', tone: 'success' });
            await refreshGrantedAccess(sections);
          } catch (nextError: any) {
            setAlert({ title: 'Delete Failed', message: nextError?.message || 'Unable to delete representative.', tone: 'danger' });
          } finally {
            setIsSubmittingGradeRep(false);
          }
        }}
      />

      <GrantLearnerAccessModal
        isEditing={Boolean(editingCredential)}
        isSubmitting={isSubmittingGrant}
        learner={selectedLearner}
        onClose={() => {
          setSelectedLearner(null);
          setEditingCredential(null);
        }}
        onOperationChange={setOperationValue}
        onPositionChange={setPositionValue}
        onSubmit={async () => {
          if (!selectedLearner) {
            setAlert({ title: 'Validation', message: 'Select a learner first.', tone: 'warning' });
            return;
          }
          if (!positionValue.trim()) {
            setAlert({ title: 'Validation', message: 'Select a class position before granting access.', tone: 'warning' });
            return;
          }
          if (!operationValue.trim()) {
            setAlert({ title: 'Validation', message: 'Select a module operation before granting access.', tone: 'warning' });
            return;
          }
          setConfirmGrantOpen(true);
        }}
        operationValue={operationValue}
        positionValue={positionValue}
      />

      <UsisAlertModal
        open={confirmGrantOpen}
        title={editingCredential ? 'Confirm Update Access' : 'Confirm Grant Access'}
        message={editingCredential ? 'Save updates to this learner access record?' : 'Grant this learner access to the selected operation?'}
        tone="warning"
        confirmLabel={isSubmittingGrant ? (editingCredential ? 'Saving...' : 'Granting...') : (editingCredential ? 'Save Changes' : 'Grant Access')}
        cancelLabel="Cancel"
        onClose={() => {
          if (!isSubmittingGrant) setConfirmGrantOpen(false);
        }}
        onConfirm={async () => {
          if (!selectedLearner || isSubmittingGrant) return;
          setIsSubmittingGrant(true);
          try {
            setConfirmGrantOpen(false);
            if (editingCredential) {
              await updateLearnerOperationAccess({
                credentialId: editingCredential.credentialId,
                operationKey: operationValue,
                positionTitle: positionValue,
              });
              setAlert({ title: 'Success', message: 'Learner-based credential access updated successfully.', tone: 'success' });
            } else {
              await grantLearnerOperationAccess({
                learnerId: selectedLearner.learnerId,
                learnerLrn: selectedLearner.lrn,
                operationKey: operationValue,
                positionTitle: positionValue,
                sectionId: selectedLearner.sectionId,
              });
              setAlert({ title: 'Success', message: 'Learner-based credential access granted successfully.', tone: 'success' });
            }
            await refreshGrantedAccess(sections);
            setSelectedLearner(null);
            setEditingCredential(null);
          } catch (nextError: any) {
            setAlert({
              title: editingCredential ? 'Update Failed' : 'Grant Failed',
              message: nextError?.message || 'Unable to save learner access.',
              tone: 'danger',
            });
          } finally {
            setIsSubmittingGrant(false);
          }
        }}
      />

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
